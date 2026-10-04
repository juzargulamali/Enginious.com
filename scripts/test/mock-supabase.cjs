// LOCAL TEST ONLY. A small Supabase stand-in so the app can be tested end to end without Docker or the hosted project:
//   - /rest/v1  : the subset of PostgREST the app uses, executed against the local test Postgres WITH REAL ROW LEVEL SECURITY
//                 (every request runs as the role/claims in its JWT: anon, authenticated, service_role)
//   - /auth/v1  : password login, refresh, user, logout, recovery, invite, verify (tokens are written to an outbox, never emailed)
//   - /storage/v1 : upload, public download, signed URLs, delete, with the bucket policies enforced through storage.objects
// Start:  node scripts/test/mock-supabase.cjs   (needs scripts/test/db-reset.sh to have run)
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const PORT = +(process.env.MOCK_PORT || 54321);
const SECRET = process.env.MOCK_JWT_SECRET || "test-secret-test-secret-test-secret-1234";
const STORE = process.env.MOCK_STORAGE_DIR || "/var/tmp/pgtest/storage";
const pool = new Pool({ host: process.env.PGHOST || "/var/tmp/pgtest", port: +(process.env.PGPORT || 54329), user: "postgres", database: "enginious_test", max: 8 });
fs.mkdirSync(STORE, { recursive: true });

// ------------------------------------------------------------------ JWT
const b64u = (b) => Buffer.from(b).toString("base64url");
const sign = (payload) => {
  const h = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" })), p = b64u(JSON.stringify(payload));
  return `${h}.${p}.${crypto.createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url")}`;
};
const verify = (tok) => {
  const [h, p, s] = String(tok || "").split(".");
  if (!s) return null;
  const want = crypto.createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url");
  if (want.length !== s.length || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(s))) return null;
  try { const c = JSON.parse(Buffer.from(p, "base64url").toString()); if (c.exp && c.exp < Date.now() / 1000) return null; return c; } catch { return null; }
};
const ANON = sign({ role: "anon", iss: "mock", exp: 4102444800 });
const SERVICE = sign({ role: "service_role", iss: "mock", exp: 4102444800 });

// ------------------------------------------------------------------ helpers
const send = (res, status, body, headers = {}) => {
  const isBuf = Buffer.isBuffer(body);
  res.writeHead(status, { "Content-Type": isBuf ? headers["Content-Type"] || "application/octet-stream" : "application/json", "Access-Control-Allow-Origin": "*", ...headers });
  res.end(body === undefined ? undefined : isBuf ? body : JSON.stringify(body));
};
const readBody = (req) => new Promise((ok) => { const c = []; req.on("data", (d) => c.push(d)); req.on("end", () => ok(Buffer.concat(c))); });
const ident = (s) => { if (!/^[a-z_][a-z0-9_]*$/i.test(s)) throw Object.assign(new Error("bad identifier " + s), { status: 400 }); return `"${s}"`; };
const claimsFrom = (req) => {
  const auth = (req.headers.authorization || "").replace(/^Bearer /i, "");
  const c = auth ? verify(auth) : verify(req.headers.apikey);
  return c;
};
// Run fn(client) inside a transaction as the JWT's role with request.jwt.claims set (this is what makes RLS real).
async function asRole(claims, fn) {
  const role = claims.role === "service_role" ? "service_role" : claims.role === "authenticated" ? "authenticated" : "anon";
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`set local role ${role}`);
    await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (e) { await client.query("rollback").catch(() => {}); throw e; }
  finally { client.release(); }
}
const pgErr = (e, role) => {
  const code = e.code || "XX000";
  const status = e.status || (code === "42501" ? (role === "anon" ? 401 : 403) : code === "23505" ? 409 : code.startsWith("23") ? 409 : code === "P0001" ? 400 : code === "P0002" ? 404 : code === "42P01" ? 404 : code.startsWith("22") ? 400 : code.startsWith("42") ? 400 : 500);
  return { status, body: { code, message: e.message, details: e.detail || null, hint: e.hint || null } };
};

// ------------------------------------------------------------------ PostgREST subset
const colTypes = {};
async function typesOf(client, table) {
  if (!colTypes[table]) {
    const r = await pool.query("select column_name, data_type from information_schema.columns where table_schema = 'public' and table_name = $1", [table]);
    colTypes[table] = Object.fromEntries(r.rows.map((x) => [x.column_name, x.data_type]));
  }
  return colTypes[table];
}
const parseList = (s) => { // "(a,b,"c d")" -> [a,b,c d]
  s = s.replace(/^\(|\)$/g, ""); const out = []; let cur = "", q = false;
  for (const ch of s) { if (ch === '"') q = !q; else if (ch === "," && !q) { out.push(cur); cur = ""; } else cur += ch; }
  out.push(cur); return out.filter((x) => x !== "" || out.length === 1);
};
function cond(col, spec, params) {
  let neg = false;
  if (spec.startsWith("not.")) { neg = true; spec = spec.slice(4); }
  const dot = spec.indexOf("."); const op = spec.slice(0, dot), val = spec.slice(dot + 1);
  const c = col.includes("->") ? col : ident(col); let sql;
  const push = (v) => { params.push(v); return `$${params.length}`; };
  switch (op) {
    case "eq": sql = `${c}::text = ${push(val)}`; break;
    case "neq": sql = `${c}::text <> ${push(val)}`; break;
    case "gt": sql = `${c} > ${push(val)}`; break;
    case "gte": sql = `${c} >= ${push(val)}`; break;
    case "lt": sql = `${c} < ${push(val)}`; break;
    case "lte": sql = `${c} <= ${push(val)}`; break;
    case "like": sql = `${c}::text like ${push(val.replace(/\*/g, "%"))}`; break;
    case "ilike": sql = `${c}::text ilike ${push(val.replace(/\*/g, "%"))}`; break;
    case "is": sql = val === "null" ? `${c} is null` : val === "true" ? `${c} is true` : `${c} is false`; break;
    case "in": sql = `${c}::text = any(${push(parseList(val))})`; break;
    case "cs": sql = `${c} @> ${push(val)}::text[]`; break;
    default: throw Object.assign(new Error("unsupported operator " + op), { status: 400 });
  }
  return neg ? `not (${sql})` : sql;
}
function where(url, params) {
  const parts = [];
  for (const [k, v] of url.searchParams) {
    if (["select", "order", "limit", "offset", "on_conflict", "columns"].includes(k)) continue;
    if (k === "or") { parts.push("(" + parseList(v).map((e) => { const i = e.indexOf("."); return cond(e.slice(0, i), e.slice(i + 1), params); }).join(" or ") + ")"); continue; }
    parts.push(cond(k, v, params));
  }
  return parts.length ? " where " + parts.join(" and ") : "";
}
const selectCols = (url) => {
  const s = url.searchParams.get("select") || "*";
  if (s === "*") return "*";
  if (/[()]/.test(s)) throw Object.assign(new Error("embedded selects are not supported by the test shim"), { status: 400 });
  return s.split(",").map((c) => (c.trim() === "*" ? "*" : ident(c.trim()))).join(", ");
};
const orderBy = (url) => {
  const o = url.searchParams.get("order"); if (!o) return "";
  return " order by " + o.split(",").map((p) => { const [c, d, n] = p.split("."); return `${ident(c)} ${d === "desc" ? "desc" : "asc"}${n === "nullsfirst" ? " nulls first" : n === "nullslast" ? " nulls last" : ""}`; }).join(", ");
};

async function rest(req, res, url) {
  const claims = claimsFrom(req);
  if (!claims) return send(res, 401, { code: "PGRST301", message: "JWT invalid or expired" });
  const role = claims.role;
  const rel = url.pathname.replace(/^\/rest\/v1\//, "");
  const prefer = String(req.headers.prefer || "");
  const wantObject = /vnd\.pgrst\.object/.test(String(req.headers.accept || ""));
  const body = ["POST", "PATCH", "PUT"].includes(req.method) ? await readBody(req) : null;
  const json = body && body.length ? JSON.parse(body.toString()) : null;
  try {
    if (rel.startsWith("rpc/")) {
      const fn = rel.slice(4); ident(fn);
      const args = json || {}; const keys = Object.keys(args);
      const out = await asRole(claims, async (c) => {
        const meta = (await c.query("select proretset, prorettype::regtype::text as rt from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = $1 limit 1", [fn])).rows[0];
        const vals = keys.map((k) => (args[k] !== null && typeof args[k] === "object" ? JSON.stringify(args[k]) : args[k]));
        const r = await c.query(`select * from public.${ident(fn)}(${keys.map((k, i) => `${ident(k)} => $${i + 1}`).join(", ")})`, vals);
        return { meta, r };
      });
      if (out.meta && out.meta.rt === "void") return send(res, 204, undefined);
      const f = out.r.fields;
      const scalar = f.length === 1 && f[0].name === fn;
      if (out.meta && out.meta.proretset) return send(res, 200, scalar ? out.r.rows.map((x) => x[fn]) : out.r.rows);
      return send(res, 200, scalar ? out.r.rows[0][fn] : out.r.rows[0]);
    }
    const table = ident(rel);
    const params = [];
    const types = await typesOf(null, rel);
    const enc = (col, v) => (types[col] === "jsonb" || types[col] === "json") && v !== null ? JSON.stringify(v) : v;
    let sql, countSql = null;
    if (req.method === "GET" || req.method === "HEAD") {
      const w = where(url, params);
      sql = `select ${selectCols(url)} from public.${table}${w}${orderBy(url)}`;
      const lim = url.searchParams.get("limit"), off = url.searchParams.get("offset");
      if (/count=/.test(prefer)) countSql = { sql: `select count(*)::int as n from public.${table}${w}`, params: [...params] };
      if (lim) sql += ` limit ${parseInt(lim, 10)}`;
      if (off) sql += ` offset ${parseInt(off, 10)}`;
    } else if (req.method === "POST") {
      const rows = Array.isArray(json) ? json : [json];
      const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
      const vals = rows.map((r) => "(" + cols.map((c) => { if (!(c in r)) return "default"; params.push(enc(c, r[c])); return `$${params.length}`; }).join(", ") + ")");
      sql = `insert into public.${table} (${cols.map(ident).join(", ")}) values ${vals.join(", ")}`;
      if (/resolution=merge-duplicates/.test(prefer)) {
        const oc = (url.searchParams.get("on_conflict") || "id").split(",").map(ident);
        sql += ` on conflict (${oc.join(", ")}) do update set ${cols.map((c) => `${ident(c)} = excluded.${ident(c)}`).join(", ")}`;
      } else if (/resolution=ignore-duplicates/.test(prefer)) sql += " on conflict do nothing";
      sql += " returning *";
    } else if (req.method === "PATCH") {
      const sets = Object.entries(json).map(([k, v]) => { params.push(enc(k, v)); return `${ident(k)} = $${params.length}`; });
      sql = `update public.${table} set ${sets.join(", ")}${where(url, params)} returning *`;
    } else if (req.method === "DELETE") {
      sql = `delete from public.${table}${where(url, params)} returning *`;
    } else return send(res, 405, { message: "method not allowed" });

    const out = await asRole(claims, async (c) => {
      const r = await c.query(sql, params);
      const n = countSql ? (await c.query(countSql.sql, countSql.params)).rows[0].n : null;
      return { r, n };
    });
    const headers = {};
    if (out.n !== null) { const off = +(url.searchParams.get("offset") || 0); headers["Content-Range"] = `${out.r.rows.length ? off : "*"}${out.r.rows.length ? `-${off + out.r.rows.length - 1}` : ""}/${out.n}`.replace(/^\*(-\d+)?/, "*"); }
    const mutating = req.method !== "GET" && req.method !== "HEAD";
    if (mutating && !/return=representation/.test(prefer)) return send(res, req.method === "POST" ? 201 : 204, undefined, headers);
    if (wantObject) {
      if (out.r.rows.length !== 1) return send(res, 406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: `The result contains ${out.r.rows.length} rows`, hint: null });
      return send(res, mutating && req.method === "POST" ? 201 : 200, out.r.rows[0], headers);
    }
    return send(res, mutating && req.method === "POST" ? 201 : 200, out.r.rows, headers);
  } catch (e) {
    const { status, body: b } = pgErr(e, role);
    return send(res, status, b);
  }
}

// ------------------------------------------------------------------ GoTrue subset
const outbox = []; // { to, type, token_hash, link, at }
const refreshTokens = new Map();
const hashPw = (pw) => { const salt = crypto.randomBytes(8).toString("hex"); return salt + ":" + crypto.scryptSync(pw, salt, 32).toString("hex"); };
const checkPw = (pw, h) => { const [salt, k] = String(h || "").split(":"); return !!k && crypto.timingSafeEqual(crypto.scryptSync(pw, salt, 32), Buffer.from(k, "hex")); };
const publicUser = (u) => ({ id: u.id, aud: "authenticated", role: "authenticated", email: u.email, email_confirmed_at: u.email_confirmed_at, app_metadata: { provider: "email" }, user_metadata: u.raw_user_meta_data || {}, created_at: u.created_at });
const session = (u) => {
  const now = Math.floor(Date.now() / 1000);
  const access = sign({ sub: u.id, role: "authenticated", aud: "authenticated", email: u.email, iat: now, exp: now + 3600, session_id: crypto.randomUUID() });
  const refresh = crypto.randomBytes(12).toString("hex"); refreshTokens.set(refresh, u.id);
  return { access_token: access, token_type: "bearer", expires_in: 3600, expires_at: now + 3600, refresh_token: refresh, user: publicUser(u) };
};
const tokens = new Map(); // token_hash -> { userId, type }
const mkToken = (userId, type, to, redirect) => {
  const th = crypto.randomBytes(16).toString("hex"); tokens.set(th, { userId, type });
  outbox.push({ to, type, token_hash: th, redirect_to: redirect || null, at: new Date().toISOString() });
  return th;
};
async function auth(req, res, url) {
  const sub = url.pathname.replace(/^\/auth\/v1\//, "");
  const body = ["POST", "PUT"].includes(req.method) ? await readBody(req) : null;
  const j = body && body.length ? JSON.parse(body.toString()) : {};
  const bearer = verify((req.headers.authorization || "").replace(/^Bearer /i, ""));
  const userBy = async (q, v) => (await pool.query(`select * from auth.users where ${q}`, [v])).rows[0];
  if (sub === "token") {
    const grant = url.searchParams.get("grant_type");
    if (grant === "password") {
      const u = await userBy("lower(email) = lower($1)", j.email || "");
      if (!u || !checkPw(j.password || "", u.encrypted_password)) return send(res, 400, { error: "invalid_grant", error_code: "invalid_credentials", error_description: "Invalid login credentials", msg: "Invalid login credentials" });
      return send(res, 200, session(u));
    }
    if (grant === "refresh_token") {
      const id = refreshTokens.get(j.refresh_token);
      if (!id) return send(res, 400, { error: "invalid_grant", error_description: "Invalid Refresh Token" });
      refreshTokens.delete(j.refresh_token);
      return send(res, 200, session(await userBy("id = $1", id)));
    }
  }
  if (sub === "user" && req.method === "GET") {
    if (!bearer || !bearer.sub) return send(res, 401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" });
    const u = await userBy("id = $1", bearer.sub); if (!u) return send(res, 404, { msg: "User not found" });
    return send(res, 200, publicUser(u));
  }
  if (sub === "user" && req.method === "PUT") {
    if (!bearer || !bearer.sub) return send(res, 401, { msg: "invalid JWT" });
    if (j.password) { if (String(j.password).length < 10) return send(res, 422, { error_code: "weak_password", msg: "Password should be at least 10 characters." }); await pool.query("update auth.users set encrypted_password = $1, email_confirmed_at = coalesce(email_confirmed_at, now()) where id = $2", [hashPw(j.password), bearer.sub]); }
    return send(res, 200, publicUser(await userBy("id = $1", bearer.sub)));
  }
  if (sub === "logout") return send(res, 204, undefined);
  if (sub === "recover") {
    const u = await userBy("lower(email) = lower($1)", j.email || "");
    if (u) mkToken(u.id, "recovery", u.email, url.searchParams.get("redirect_to"));
    return send(res, 200, {});
  }
  if (sub === "verify" && req.method === "POST") {
    const t = tokens.get(j.token_hash); if (!t || t.type !== j.type) return send(res, 403, { error_code: "otp_expired", msg: "Email link is invalid or has expired" });
    tokens.delete(j.token_hash);
    await pool.query("update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where id = $1", [t.userId]);
    return send(res, 200, session(await userBy("id = $1", t.userId)));
  }
  if (sub === "invite" && req.method === "POST") {
    if (!bearer || bearer.role !== "service_role") return send(res, 401, { msg: "not allowed" });
    const email = String(j.email || "").toLowerCase();
    let u = await userBy("lower(email) = $1", email);
    if (u && u.email_confirmed_at) return send(res, 422, { error_code: "email_exists", msg: "A user with this email address has already been registered" });
    if (!u) u = (await pool.query("insert into auth.users (email, invited_at) values ($1, now()) returning *", [email])).rows[0];
    mkToken(u.id, "invite", email, url.searchParams.get("redirect_to"));
    return send(res, 200, publicUser(u));
  }
  const m = sub.match(/^admin\/users\/([0-9a-f-]{36})$/);
  if (m) {
    if (!bearer || bearer.role !== "service_role") return send(res, 401, { msg: "not allowed" });
    if (req.method === "GET") { const u = await userBy("id = $1", m[1]); return u ? send(res, 200, publicUser(u)) : send(res, 404, { msg: "User not found" }); }
    if (req.method === "DELETE") { await pool.query("delete from auth.users where id = $1", [m[1]]); return send(res, 200, {}); }
  }
  return send(res, 404, { msg: "mock auth: unsupported " + req.method + " " + sub });
}

// ------------------------------------------------------------------ Storage subset
const signed = new Map();
const filePath = (bucket, name) => path.join(STORE, bucket, ...name.split("/").map((s) => s.replace(/\.\./g, "_")));
function multipartFile(buf, ct) {
  const b = /boundary=(.+)$/.exec(ct)[1]; const parts = buf.toString("latin1").split("--" + b);
  for (const p of parts) { const i = p.indexOf("\r\n\r\n"); if (i > 0 && /filename=/.test(p.slice(0, i))) { const head = p.slice(0, i); const data = Buffer.from(p.slice(i + 4, p.lastIndexOf("\r\n")), "latin1"); return { data, type: (/Content-Type: ([^\r\n]+)/i.exec(head) || [])[1] }; } }
  return null;
}
async function storage(req, res, url) {
  const claims = claimsFrom(req) || { role: "anon" };
  const parts = decodeURIComponent(url.pathname.replace(/^\/storage\/v1\//, "")).split("/");
  try {
    if (parts[0] === "object" && parts[1] === "public" && req.method === "GET") {
      const [bucket, ...rest] = parts.slice(2); const name = rest.join("/");
      const b = (await pool.query("select public from storage.buckets where id = $1", [bucket])).rows[0];
      if (!b || !b.public || !fs.existsSync(filePath(bucket, name))) return send(res, 404, { error: "not_found", message: "Object not found" });
      return send(res, 200, fs.readFileSync(filePath(bucket, name)), { "Content-Type": mime(name) });
    }
    if (parts[0] === "object" && parts[1] === "sign" && req.method === "POST") {
      const [bucket, ...rest] = parts.slice(2); const name = rest.join("/");
      const ok = await asRole(claims, async (c) => (await c.query("select 1 from storage.objects where bucket_id = $1 and name = $2", [bucket, name])).rowCount);
      if (!ok) return send(res, 400, { error: "not_found", message: "Object not found", statusCode: "404" });
      const tok = crypto.randomBytes(12).toString("hex"); signed.set(tok, { bucket, name, exp: Date.now() + 3600e3 });
      return send(res, 200, { signedURL: `/object/sign/${bucket}/${rest.join("/")}?token=${tok}` });
    }
    if (parts[0] === "object" && parts[1] === "sign" && req.method === "GET") {
      const s = signed.get(url.searchParams.get("token")); if (!s || s.exp < Date.now()) return send(res, 400, { error: "invalid_token" });
      return send(res, 200, fs.readFileSync(filePath(s.bucket, s.name)), { "Content-Type": mime(s.name) });
    }
    if (parts[0] === "object" && req.method === "POST") {
      const [bucket, ...rest] = parts.slice(1); const name = rest.join("/");
      let data = await readBody(req); let type = req.headers["content-type"] || "application/octet-stream";
      if (/multipart\/form-data/.test(type)) { const f = multipartFile(data, type); if (f) { data = f.data; type = f.type || "application/octet-stream"; } }
      const bk = (await pool.query("select * from storage.buckets where id = $1", [bucket])).rows[0];
      if (!bk) return send(res, 404, { error: "Bucket not found", message: "Bucket not found", statusCode: "404" });
      if (bk.file_size_limit && data.length > bk.file_size_limit) return send(res, 413, { error: "Payload too large", message: "The object exceeded the maximum allowed size", statusCode: "413" });
      if (bk.allowed_mime_types && !bk.allowed_mime_types.includes(String(type).split(";")[0])) return send(res, 415, { error: "invalid_mime_type", message: "mime type " + type + " is not supported", statusCode: "415" });
      await asRole(claims, async (c) => {
        const upsert = String(req.headers["x-upsert"]) === "true";
        await c.query(`insert into storage.objects (bucket_id, name, owner, metadata) values ($1, $2, $3, $4)${upsert ? " on conflict (bucket_id, name) do update set metadata = excluded.metadata" : ""}`, [bucket, name, claims.sub || null, JSON.stringify({ size: data.length, mimetype: type })]);
      });
      fs.mkdirSync(path.dirname(filePath(bucket, name)), { recursive: true }); fs.writeFileSync(filePath(bucket, name), data);
      return send(res, 200, { Key: `${bucket}/${name}`, Id: crypto.randomUUID() });
    }
    if (parts[0] === "object" && req.method === "DELETE") {
      const bucket = parts[1]; const { prefixes = [] } = JSON.parse((await readBody(req)).toString() || "{}");
      const removed = await asRole(claims, async (c) => { const out = []; for (const n of prefixes) { const r = await c.query("delete from storage.objects where bucket_id = $1 and name = $2 returning name", [bucket, n]); out.push(...r.rows); } return out; });
      for (const r of removed) fs.rmSync(filePath(bucket, r.name), { force: true });
      return send(res, 200, removed.map((r) => ({ name: r.name, bucket_id: bucket })));
    }
  } catch (e) { const { status, body } = pgErr(e, claims.role); return send(res, status === 403 ? 400 : status, { error: "Unauthorized", message: status === 403 || status === 401 ? "new row violates row-level security policy" : body.message, statusCode: String(status === 403 ? 403 : status) }); }
  return send(res, 404, { message: "mock storage: unsupported" });
}
const mime = (n) => ({ webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", pdf: "application/pdf" }[n.split(".").pop().toLowerCase()] || "application/octet-stream");

// ------------------------------------------------------------------ server
http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (req.method === "OPTIONS") return send(res, 204, undefined, { "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*" });
  try {
    if (url.pathname === "/__mock/keys") return send(res, 200, { anon: ANON, service: SERVICE, secret: SECRET });
    if (url.pathname === "/__mock/outbox") { if (req.method === "DELETE") outbox.length = 0; return send(res, 200, outbox); }
    if (url.pathname === "/__mock/user" && req.method === "POST") { // create a confirmed user with a password: { email, password }
      const j = JSON.parse((await readBody(req)).toString());
      const r = await pool.query("insert into auth.users (email, encrypted_password, email_confirmed_at) values ($1, $2, now()) on conflict (email) do update set encrypted_password = excluded.encrypted_password returning id", [j.email.toLowerCase(), hashPw(j.password)]);
      return send(res, 200, r.rows[0]);
    }
    if (url.pathname.startsWith("/rest/v1/")) return await rest(req, res, url);
    if (url.pathname.startsWith("/auth/v1/")) return await auth(req, res, url);
    if (url.pathname.startsWith("/storage/v1/")) return await storage(req, res, url);
    send(res, 404, { message: "mock: not found" });
  } catch (e) { console.error("mock error", e); send(res, 500, { message: String(e.message) }); }
}).listen(PORT, "127.0.0.1", () => console.log(`mock supabase on :${PORT}`));
