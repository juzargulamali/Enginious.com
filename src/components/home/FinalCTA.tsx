"use client";

import Link from "next/link";
import { useRef } from "react";
import { Edge } from "@/components/neon/Edge";
import { useReached } from "@/lib/scrollBus";

/** The light path ends here: a node on the spine, a branch into the panel, and the panel lights up when the light arrives. */
export function FinalCTA() {
  const ref = useRef<HTMLElement>(null);
  const reached = useReached(ref, 0.6);
  return (
    <section ref={ref} className="scene final home-sec" data-reached={reached || undefined}>
      <div className="container">
        <div className="final-box">
          <span className="final-link" aria-hidden="true" />
          <Edge variant="perimeter" duration={reached ? 5 : 11} />
          <h2>Let&apos;s build something worth <span className="accent">experiencing.</span></h2>
          <p className="lede">Tell us your idea. We&apos;ll connect you with the right team in Dubai, Saudi Arabia or Poland.</p>
          <Link href="/contact" className="btn btn-primary btn-lg">Start a project →</Link>
        </div>
      </div>
    </section>
  );
}
