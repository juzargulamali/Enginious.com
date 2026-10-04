"use client";

import Link from "next/link";
import { useRef } from "react";
import { useReached } from "@/lib/scrollBus";

/**
 * The destination. The neon thread ends here: a column of light rises from luminous rings on the floor, and the invitation stands in it.
 * The beam ignites when the light arrives (opacity only); the text and the action sit on a calm dark surface and never move.
 */
export function FinalCTA() {
  const ref = useRef<HTMLElement>(null);
  const reached = useReached(ref, 0.6);
  return (
    <section ref={ref} className="scene final home-sec" data-reached={reached || undefined}>
      <span className="fin-floor" aria-hidden="true" />
      <span className="fin-beam" aria-hidden="true" />
      <span className="fin-ring r3" aria-hidden="true" /><span className="fin-ring r2" aria-hidden="true" /><span className="fin-ring r1" aria-hidden="true" />
      <div className="container">
        <div className="final-box">
          <span className="final-link" aria-hidden="true" />
          <h2>Let&apos;s build something worth <span className="accent">experiencing.</span></h2>
          <p className="lede">Tell us your idea. We&apos;ll connect you with the right team in Dubai, Saudi Arabia or Poland.</p>
          <Link href="/contact" className="btn btn-primary btn-lg">Start a project →</Link>
        </div>
      </div>
    </section>
  );
}
