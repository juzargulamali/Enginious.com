"use client";

import { useBrief } from "./BriefProvider";

export function AddToBrief({ slug, name }: { slug: string; name: string }) {
  const { has, toggle } = useBrief();
  const on = has(slug);
  return (
    <button type="button" className={`btn ${on ? "" : "btn-primary"}`} aria-pressed={on} onClick={() => toggle(slug)}>
      {on ? `✓ ${name} in your brief (remove)` : "+ Add to project brief"}
    </button>
  );
}
