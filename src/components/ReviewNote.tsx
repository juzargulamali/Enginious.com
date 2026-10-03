import type { ReactNode } from "react";

/** Internal review notes. Rendered on previews only; hidden once ALLOW_INDEXING=true (public launch). */
export function ReviewNote({ children }: { children: ReactNode }) {
  if (process.env.ALLOW_INDEXING === "true") return null;
  return (
    <p className="review-note" role="note">
      <strong>REVIEW:</strong> {children}
    </p>
  );
}
