"use client";

import { useEffect } from "react";

/**
 * One IntersectionObserver for every [data-neon] element: travelling light only runs while its panel is on screen.
 * Elements added later (client components) are picked up by the MutationObserver.
 */
export function NeonController() {
  useEffect(() => {
    // Scroll-linked states only apply once the page is running; without JavaScript every scene stays fully visible.
    document.documentElement.setAttribute("data-js", "1");
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
    // the neon thread leads to the scene at the middle of the viewport: mark it so its node, branch and thread light up
    const act = new IntersectionObserver((entries) => entries.forEach((e) => e.target.toggleAttribute("data-active", e.isIntersecting)), { rootMargin: "-46% 0px -46% 0px" });
    document.querySelectorAll<HTMLElement>(".scenes .scene").forEach((el) => act.observe(el));
    // Re-scan at most once per frame, and only when something was added.
    let raf = 0;
    const mo = new MutationObserver((records) => {
      if (raf || !records.some((r) => r.addedNodes.length)) return;
      raf = requestAnimationFrame(() => { raf = 0; scan(); });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      act.disconnect();
      mo.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}
