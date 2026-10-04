import type { CSSProperties } from "react";

/**
 * Neon edge treatments. Each variant lights a different set of edges so panels do not all share one outline.
 * Light travels along edges via transform-only animation; see neon.css.
 */
export type EdgeVariant = "perimeter" | "top" | "left" | "bottom-right" | "brackets" | "under" | "lit";

const EDGES: Record<EdgeVariant, ("t" | "r" | "b" | "l")[]> = {
  perimeter: ["t", "r", "b", "l"],
  top: ["t"],
  left: ["l"],
  "bottom-right": ["b", "r"],
  brackets: ["t", "b"],
  under: ["b"],
  lit: ["t", "r"], // rim light on the two edges that face the scene light (top and right): no corner brackets
};

export function Edge({ variant = "perimeter", duration = 9, delay = 0, className = "", style }: { variant?: EdgeVariant; duration?: number; delay?: number; className?: string; style?: CSSProperties }) {
  const edges = EDGES[variant];
  return (
    <span className={`nx ${className}`} data-neon aria-hidden="true" style={{ ["--dur" as string]: `${duration}s`, ...style }}>
      {edges.map((e, i) => (
        <span key={e} className={`nx-e nx-${e}`} style={{ ["--delay" as string]: `${delay + (variant === "perimeter" ? i * (duration / 4) : i * 2)}s` }}>
          <span className="nx-c" />
        </span>
      ))}
      {(variant === "perimeter" || variant === "brackets") && (
        <>
          <span className="nx-k nx-k1" />
          <span className="nx-k nx-k2" />
          <span className="nx-k nx-k3" />
          <span className="nx-k nx-k4" />
        </>
      )}
    </span>
  );
}
