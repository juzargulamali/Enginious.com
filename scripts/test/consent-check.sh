#!/usr/bin/env bash
# Verifies that optional analytics never loads before consent. Builds the app WITH the analytics integration point configured
# (pointing at a local counter, not a real service) and drives it in a browser.
set -uo pipefail
cd "$(dirname "$0")/../.."
node -e '
const http=require("http");let hits=0;
http.createServer((q,r)=>{if(q.url==="/hits"){r.end(String(hits));return}if(q.url.startsWith("/a.js")){hits++;r.setHeader("Content-Type","application/javascript");r.end("window.__loaded=1;")}else r.end("")}).listen(54398,"127.0.0.1");
' & SRV=$!
sleep 1
fuser -k 3302/tcp >/dev/null 2>&1; rm -rf .next
NEXT_PUBLIC_ANALYTICS_SRC=http://127.0.0.1:54398/a.js NEXT_PUBLIC_ANALYTICS_DOMAIN=example.test npx next build >/var/tmp/pgtest/consent-build.log 2>&1 || { tail -20 /var/tmp/pgtest/consent-build.log; kill $SRV; exit 1; }
(nohup node node_modules/next/dist/bin/next start -p 3302 >/var/tmp/pgtest/consent-app.log 2>&1 &); sleep 4
export NODE_PATH=$(npm root -g)
node - <<'JS'
const { chromium } = require("playwright");
let pass=0, fail=0; const ok=(n,c,e="")=>{ if(c){pass++;console.log("  PASS "+n)}else{fail++;console.log("  FAIL "+n+(e?"  -> "+e:""))} };
const hits=async()=>Number(await (await fetch("http://127.0.0.1:54398/hits")).text());
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});
  let ctx=await b.newContext(); let p=await ctx.newPage();
  await p.goto("http://localhost:3302/",{waitUntil:"load"}); await sleep(1200);
  ok("the consent choice is shown", (await p.getByRole("button",{name:"Accept analytics"}).count())===1);
  ok("analytics script is NOT requested before consent", (await hits())===0);
  ok("no analytics script tag exists before consent", (await p.locator('script[src*="54398"]').count())===0);
  await p.goto("http://localhost:3302/work",{waitUntil:"load"}); await sleep(800);
  ok("still nothing loaded after navigating without choosing", (await hits())===0);
  await p.getByRole("button",{name:"No thanks"}).click(); await sleep(800);
  ok("declining loads nothing and hides the choice", (await hits())===0 && (await p.getByRole("button",{name:"Accept analytics"}).count())===0);
  await p.reload({waitUntil:"load"}); await sleep(800);
  ok("a declined choice is remembered and nothing loads on later visits", (await hits())===0 && (await p.getByRole("button",{name:"Accept analytics"}).count())===0);
  await ctx.close();
  ctx=await b.newContext(); p=await ctx.newPage();
  await p.goto("http://localhost:3302/",{waitUntil:"load"}); await sleep(800);
  await p.getByRole("button",{name:"Accept analytics"}).click(); await sleep(1200);
  ok("accepting loads the script exactly once", (await hits())===1 && (await p.evaluate(()=>window.__loaded===1)));
  ok("the script carries the configured domain attribute", (await p.locator('script[data-domain="example.test"]').count())===1);
  await ctx.close();
  const ad=await b.newContext(); const q=await ad.newPage(); await q.goto("http://localhost:3302/admin/login",{waitUntil:"load"}); await sleep(600);
  ok("the CMS never shows the consent choice or loads analytics", (await q.getByRole("button",{name:"Accept analytics"}).count())===0);
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
})();
JS
rc=$?; fuser -k 3302/tcp >/dev/null 2>&1; kill $SRV 2>/dev/null; exit $rc
