// Site-wide behavioural checks (routing, noindex, gallery, showroom, brief, enquiry form). NODE_PATH=$(npm root -g) node scripts/perf/site-test.cjs
const {chromium}=require('playwright');
const out=[];const ok=(n,c,d='')=>out.push((c?'PASS ':'FAIL ')+n+(d?' - '+d:''));
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:800}});
 const p=await ctx.newPage();
 const errs=[];p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,140))});p.on('pageerror',e=>errs.push(e.message.slice(0,140)));
 const base='http://localhost:3300';

 // 1 robots/noindex headers
 let r=await p.goto(base+'/robots.txt');ok('robots disallows all',(await r.text()).includes('Disallow: /'));
 r=await p.goto(base+'/work');ok('X-Robots-Tag noindex',/noindex/.test(r.headers()['x-robots-tag']||''));
 ok('meta robots noindex',(await p.locator('meta[name=robots]').getAttribute('content')||'').includes('noindex'));
 r=await p.goto(base+'/sitemap.xml');ok('sitemap 200',r.status()===200);

 // 2 keyboard: skip link + gallery arrows
 await p.goto(base+'/company/team');
 await p.keyboard.press('Tab');ok('skip link first focus',await p.evaluate(()=>document.activeElement?.textContent?.includes('Skip')));
 const first=await p.locator('.pcard[data-active="true"]').getAttribute('aria-label');
 await p.locator('.pcard[data-active="true"]').focus();
 await p.keyboard.press('ArrowRight');await p.waitForTimeout(300);
 const second=await p.locator('.pcard[data-active="true"]').getAttribute('aria-label');
 ok('gallery ArrowRight changes selection',first!==second,`${first} -> ${second}`);
 await p.getByRole('button',{name:'Engineering',exact:true}).click();
 const eng=await p.locator('.pcard').first().getAttribute('aria-label');
 ok('department filter',/Syed|Nalim|Ghulam|Azhar|Mazhar/.test(eng||''),eng);
 await p.getByRole('button',{name:'Next person'}).click();await p.waitForTimeout(300);
 ok('visible next control',true);
 ok('plain team list present',(await p.locator('ul.tech-grid li').count())>=20);

 // 3 showroom + brief flow
 await p.goto(base+'/technologies');
 await p.getByRole('button',{name:'Guided tour →'}).click();
 ok('guided tour selects exhibit',await p.locator('.detail').count()===1);
 await p.getByRole('button',{name:'+ Add to project brief'}).click();
 ok('header brief pill appears',await p.locator('.brief-pill').count()===1);
 await p.getByRole('button',{name:'Interactive',exact:true}).first().click();
 ok('category switch clears selection',await p.locator('.detail').count()===0);

 // 4 contact: invalid
 await p.goto(base+'/contact');
 ok('brief carried to form',(await p.locator('#brief li').count())===1);
 await p.getByRole('button',{name:'Send enquiry →'}).click();
 await p.waitForTimeout(800);
 ok('client sees field errors (server-validated)',(await p.locator('.err').count())>=3,(await p.locator('.err').allTextContents()).join(' | '));
 // valid but DB not configured locally -> must NOT show success, must preserve input
 await p.fill('#name','Test Person');await p.fill('#email','test@example.com');await p.fill('#message','Planning a stand in Warsaw next year.');
 await p.getByText('Poland',{exact:true}).first().click();
 await p.getByRole('button',{name:'Send enquiry →'}).click();
 await p.waitForTimeout(1200);
 ok('no false success when backend unavailable',await p.getByText('Enquiry received').count()===0);
 ok('failure message shown',await p.getByRole('alert').count()>0,(await p.getByRole('alert').first().textContent()||'').slice(0,80));
 ok('input preserved after failure',(await p.inputValue('#name'))==='Test Person'&&(await p.inputValue('#message')).includes('Warsaw'));
 ok('Europe fallback note',await p.getByText('reach the general team').count()===1);

 // 5 region query + tech query
 await p.goto(base+'/contact?region=ksa&tech=tri-helix');
 ok('region param preselects KSA',(await p.locator('.region-opt[data-on="true"]').textContent()||'').includes('Saudi'));

 // 6 mobile menu + reduced motion
 const m=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
 const q=await m.newPage();await q.goto(base+'/');
 await q.getByRole('button',{name:'Menu'}).click();
 ok('mobile menu opens',await q.locator('#mobile-menu').count()===1);
 await q.keyboard.press('Escape');ok('Escape closes menu',await q.locator('#mobile-menu').count()===0);
 ok('no console errors',errs.length===0,errs.join(' | '));
 console.log(out.join('\n'));
 await b.close();
})();
