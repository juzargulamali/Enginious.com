import Link from "next/link";
import { MAP } from "@/content/map";
import { Trace } from "@/components/neon/Trace";

const P = MAP.points;

/**
 * Real geography (Natural Earth, projected at build time). Offices are solid pulsing markers; places where the
 * profile records delivered projects are small hollow rings. Static SVG: no JS, no runtime cost beyond three CSS pings.
 */
export function WorldMap() {
  // Circuit-style route between the offices (orthogonal with 45-degree bends), lit by a travelling pulse.
  const route: [number, number][] = [
    [P.dubai.x, P.dubai.y], [P.riyadh.x, P.riyadh.y], [P.riyadh.x - 44, P.riyadh.y - 44], [P.poland.x + 60, P.riyadh.y - 44], [P.poland.x, P.riyadh.y - 104], [P.poland.x, P.poland.y],
  ];
  return (
    <div className="map-wrap">
    <svg className="map" viewBox={`0 0 ${MAP.width} ${MAP.height}`} role="img" aria-label="Map of Europe and the Middle East: Enginious headquarters in Dubai, a branch in Riyadh, Saudi Arabia, and a branch in Poland serving Europe. Delivered projects also appear in Jeddah, Madinah, Qatar, Oman and Bahrain.">
      <image href="/art/map-land.svg" width={MAP.width} height={MAP.height} />


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
          <text x={P.riyadh.x - 18} y={P.riyadh.y + 34} textAnchor="end">Saudi Arabia</text>
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
    <Trace points={route} w={MAP.width} h={MAP.height} duration={7000} nodes={[1, 5]} className="map-trace" />
    </div>
  );
}
