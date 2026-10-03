import Link from "next/link";
import { MAP } from "@/content/map";

const P = MAP.points;

/**
 * Real geography (Natural Earth, projected at build time). Offices are solid pulsing markers; places where the
 * profile records delivered projects are small hollow rings. Static SVG: no JS, no runtime cost beyond three CSS pings.
 */
export function WorldMap() {
  const arc = (a: { x: number; y: number }, b: { x: number; y: number }, lift: number) =>
    `M${a.x} ${a.y} Q${(a.x + b.x) / 2} ${(a.y + b.y) / 2 - lift} ${b.x} ${b.y}`;
  return (
    <svg className="map" viewBox={`0 0 ${MAP.width} ${MAP.height}`} role="img" aria-label="Map of Europe and the Middle East: Enginious headquarters in Dubai, a branch in Riyadh, Saudi Arabia, and a branch in Poland serving Europe. Delivered projects also appear in Jeddah, Madinah, Qatar, Oman and Bahrain.">
      <image href="/art/map-land.svg" width={MAP.width} height={MAP.height} />

      <path className="route" d={arc(P.dubai, P.poland, 120)} />
      <path className="route" d={arc(P.riyadh, P.poland, 90)} />
      <path className="route" d={arc(P.dubai, P.riyadh, 18)} />

      {(["jeddah", "madinah", "qatar", "oman", "bahrain"] as const).map((k) => (
        <circle key={k} className="proj" cx={P[k].x} cy={P[k].y} r="5.5" />
      ))}

      <Link href="/uae" aria-label="Dubai, UAE: global headquarters">
        <g className="office">
          <circle className="halo" cx={P.dubai.x} cy={P.dubai.y} r="6" />
          <circle className="core" cx={P.dubai.x} cy={P.dubai.y} r="6" />
          <text x={P.dubai.x + 16} y={P.dubai.y + 30}>Dubai · HQ</text>
        </g>
      </Link>
      <Link href="/saudi-arabia" aria-label="Riyadh, Saudi Arabia: branch">
        <g className="office">
          <circle className="halo" cx={P.riyadh.x} cy={P.riyadh.y} r="6" />
          <circle className="core" cx={P.riyadh.x} cy={P.riyadh.y} r="6" />
          <text x={P.riyadh.x - 16} y={P.riyadh.y - 18} textAnchor="end">Saudi Arabia</text>
        </g>
      </Link>
      <Link href="/europe" aria-label="Poland: branch serving Europe">
        <g className="office">
          <circle className="halo" cx={P.poland.x} cy={P.poland.y} r="6" />
          <circle className="core" cx={P.poland.x} cy={P.poland.y} r="6" />
          <text x={P.poland.x + 16} y={P.poland.y - 14}>Poland · Europe</text>
        </g>
      </Link>
    </svg>
  );
}
