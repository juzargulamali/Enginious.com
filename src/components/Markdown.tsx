import type { ReactNode } from "react";
import Link from "next/link";
import { parseMarkdown, type Inline } from "@/lib/markdown";
import { YouTubeEmbed } from "./YouTubeEmbed";

/** Renders the safe Markdown subset as React elements. No dangerouslySetInnerHTML anywhere. */
function inline(nodes: Inline[]): ReactNode[] {
  return nodes.map((n, i) => {
    switch (n.t) {
      case "text": return n.v;
      case "strong": return <strong key={i}>{inline(n.c)}</strong>;
      case "em": return <em key={i}>{inline(n.c)}</em>;
      case "code": return <code key={i}>{n.v}</code>;
      case "link":
        return n.external
          ? <a key={i} href={n.href} target={n.href.startsWith("mailto:") ? undefined : "_blank"} rel="noopener noreferrer">{inline(n.c)}</a>
          : <Link key={i} href={n.href}>{inline(n.c)}</Link>;
    }
  });
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = parseMarkdown(source);
  return (
    <div className={className ?? "md"}>
      {blocks.map((b, i) => {
        switch (b.t) {
          case "p": return <p key={i}>{inline(b.c)}</p>;
          case "h": return b.level === 2 ? <h2 key={i}>{inline(b.c)}</h2> : b.level === 3 ? <h3 key={i}>{inline(b.c)}</h3> : <h4 key={i}>{inline(b.c)}</h4>;
          case "ul": return <ul key={i}>{b.items.map((it, k) => <li key={k}>{inline(it)}</li>)}</ul>;
          case "ol": return <ol key={i}>{b.items.map((it, k) => <li key={k}>{inline(it)}</li>)}</ol>;
          case "quote": return <blockquote key={i}>{inline(b.c)}</blockquote>;
          case "hr": return <hr key={i} />;
          case "youtube": return <YouTubeEmbed key={i} id={b.id} />;
        }
      })}
    </div>
  );
}
