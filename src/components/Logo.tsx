import Link from "next/link";

/**
 * Logo = official mark (extracted from the supplied SVG) + live-text wordmark.
 * The supplied SVG wordmark uses the font "BESAN", which browsers do not have, so the wordmark here is
 * PROVISIONAL until an outlined logo (text converted to curves) is supplied.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-3 ${className}`} aria-label="Enginious home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/enginious-mark.svg" alt="" width={46} height={32} style={{ height: 32, width: "auto" }} />
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          letterSpacing: "0.12em",
          fontSize: "1.05rem",
          color: "var(--brand)",
        }}
      >
        ENGINIOUS
      </span>
    </Link>
  );
}
