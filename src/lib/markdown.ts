// A deliberately small, SAFE Markdown subset. It never produces raw HTML: the output is a typed tree that React renders as elements,
// so editors cannot inject scripts, styles, iframes or event handlers. Self-contained (no path aliases) so it runs under `node --test`.
//
// Supported: paragraphs, ## / ### / #### headings, - and 1. lists, > quotes, --- rules, **bold**, *italic*, `code`,
//            [text](https://… | mailto:… | /relative), and the restricted embed  {{youtube:VIDEO_ID}}  (privacy-enhanced domain only).

export type Inline =
  | { t: "text"; v: string }
  | { t: "strong"; c: Inline[] }
  | { t: "em"; c: Inline[] }
  | { t: "code"; v: string }
  | { t: "link"; href: string; external: boolean; c: Inline[] };

export type Block =
  | { t: "p"; c: Inline[] }
  | { t: "h"; level: 2 | 3 | 4; c: Inline[] }
  | { t: "ul"; items: Inline[][] }
  | { t: "ol"; items: Inline[][] }
  | { t: "quote"; c: Inline[] }
  | { t: "hr" }
  | { t: "youtube"; id: string };

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/** Only https, mailto and same-site paths are linkable. Anything else (javascript:, data:, //host) is dropped to plain text. */
export function safeHref(raw: string): { href: string; external: boolean } | null {
  const h = raw.trim();
  if (/^\/(?!\/)[^\s\\]*$/.test(h)) return { href: h, external: false };
  if (/^mailto:[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/i.test(h)) return { href: h, external: true };
  if (/^https:\/\/[^\s<>"'\\]+$/i.test(h)) {
    try { new URL(h); return { href: h, external: true }; } catch { return null; }
  }
  return null;
}

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let i = 0;
  let buf = "";
  const flush = () => { if (buf) { out.push({ t: "text", v: buf }); buf = ""; } };
  while (i < src.length) {
    const ch = src[i];
    if (ch === "`") {
      const end = src.indexOf("`", i + 1);
      if (end > i) { flush(); out.push({ t: "code", v: src.slice(i + 1, end) }); i = end + 1; continue; }
    }
    if (ch === "*" && src[i + 1] === "*") {
      const end = src.indexOf("**", i + 2);
      if (end > i + 2) { flush(); out.push({ t: "strong", c: parseInline(src.slice(i + 2, end)) }); i = end + 2; continue; }
    }
    if (ch === "*") {
      const end = src.indexOf("*", i + 1);
      if (end > i + 1 && src[end + 1] !== "*") { flush(); out.push({ t: "em", c: parseInline(src.slice(i + 1, end)) }); i = end + 1; continue; }
    }
    if (ch === "[") {
      const close = src.indexOf("](", i + 1);
      const end = close > 0 ? src.indexOf(")", close + 2) : -1;
      if (close > 0 && end > close) {
        const label = src.slice(i + 1, close);
        const target = safeHref(src.slice(close + 2, end));
        flush();
        if (target) out.push({ t: "link", href: target.href, external: target.external, c: parseInline(label) });
        else out.push({ t: "text", v: label });
        i = end + 1;
        continue;
      }
    }
    buf += ch;
    i++;
  }
  flush();
  return out;
}

export function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, "\n").replace(/\u0000/g, "").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  const flushPara = () => { if (para.length) { blocks.push({ t: "p", c: parseInline(para.join(" ")) }); para = []; } };
  for (let n = 0; n < lines.length; n++) {
    const line = lines[n];
    const trimmed = line.trim();
    if (!trimmed) { flushPara(); continue; }
    const yt = /^\{\{youtube:([A-Za-z0-9_-]+)\}\}$/.exec(trimmed);
    if (yt) { flushPara(); if (YT_ID.test(yt[1])) blocks.push({ t: "youtube", id: yt[1] }); continue; }
    const h = /^(#{2,4})\s+(.*)$/.exec(trimmed);
    if (h) { flushPara(); blocks.push({ t: "h", level: h[1].length as 2 | 3 | 4, c: parseInline(h[2]) }); continue; }
    if (/^---+$/.test(trimmed)) { flushPara(); blocks.push({ t: "hr" }); continue; }
    if (/^>\s?/.test(trimmed)) { flushPara(); blocks.push({ t: "quote", c: parseInline(trimmed.replace(/^>\s?/, "")) }); continue; }
    const ul = /^[-*]\s+(.*)$/.exec(trimmed);
    const ol = /^\d+[.)]\s+(.*)$/.exec(trimmed);
    if (ul || ol) {
      flushPara();
      const kind = ul ? "ul" : "ol";
      const items: Inline[][] = [];
      let m: RegExpExecArray | null = ul ?? ol;
      let k = n;
      while (m) {
        items.push(parseInline(m[1]));
        k++;
        const next = (lines[k] ?? "").trim();
        m = kind === "ul" ? /^[-*]\s+(.*)$/.exec(next) : /^\d+[.)]\s+(.*)$/.exec(next);
      }
      blocks.push({ t: kind, items });
      n = k - 1;
      continue;
    }
    para.push(trimmed);
  }
  flushPara();
  return blocks;
}

/** Plain-text version (for meta descriptions and structured data). */
export function toPlainText(src: string, max = 200): string {
  const flat = (c: Inline[]): string => c.map((x) => (x.t === "text" || x.t === "code" ? x.v : flat(x.c))).join("");
  const text = parseMarkdown(src)
    .map((b) => (b.t === "p" || b.t === "h" || b.t === "quote" ? flat(b.c) : b.t === "ul" || b.t === "ol" ? b.items.map(flat).join(" ") : ""))
    .filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  return text.length > max ? text.slice(0, max - 1).replace(/\s+\S*$/, "") + "…" : text;
}
