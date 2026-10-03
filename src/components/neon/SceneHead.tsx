import type { ReactNode } from "react";

/** Scene title with a node on the spine and a branch trace leading in from it. */
export function SceneHead({ eyebrow, title, id, children }: { eyebrow: string; title: ReactNode; id: string; children?: ReactNode }) {
  return (
    <div className="scene-head">
      <span className="node" aria-hidden="true" />
      <span className="branch" aria-hidden="true" />
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} style={{ marginTop: 12 }}>{title}</h2>
      {children}
    </div>
  );
}
