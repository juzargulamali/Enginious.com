// LOCAL TEST ONLY: a stand-in for the email provider's HTTP API (Resend-compatible subset).
//   POST /emails           -> 200 {id} and records the message, unless failure mode is on (then 500)
//   POST /__fail?on=1|0    -> toggle failure mode        GET /__sent -> recorded messages     DELETE /__sent -> clear
const http = require("http");
let fail = false; const sent = [];
http.createServer((req, res) => {
  const url = new URL(req.url, "http://x"); const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const send = (code, body) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
    if (url.pathname === "/__fail") { fail = url.searchParams.get("on") === "1"; return send(200, { fail }); }
    if (url.pathname === "/__sent") { if (req.method === "DELETE") sent.length = 0; return send(200, sent); }
    if (url.pathname === "/emails" && req.method === "POST") {
      if (!/^Bearer test-key$/.test(req.headers.authorization || "")) return send(401, { message: "bad key" });
      if (fail) return send(500, { message: "provider down" });
      sent.push(JSON.parse(Buffer.concat(chunks).toString())); return send(200, { id: "msg_" + sent.length });
    }
    send(404, {});
  });
}).listen(54399, "127.0.0.1", () => console.log("fake mail on :54399"));
