"use client";

import { useEffect } from "react";

/**
 * One IntersectionObserver for every [data-neon] element: travelling light only runs while its panel is on screen.
 * Elements added later (client components) are picked up by the MutationObserver.
 */
export function NeonController() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.toggleAttribute("data-live", e.isIntersecting)),
      { rootMargin: "80px 0px" },
    );
    const seen = new WeakSet<Element>();
    const scan = () =>
      document.querySelectorAll("[data-neon]").forEach((el) => {
        if (!seen.has(el)) {
          seen.add(el);
          io.observe(el);
        }
      });
    scan();
    // Re-scan at most once per frame, and only when something was added.
    let raf = 0;
    const mo = new MutationObserver((records) => {
      if (raf || !records.some((r) => r.addedNodes.length)) return;
      raf = requestAnimationFrame(() => { raf = 0; scan(); });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}
