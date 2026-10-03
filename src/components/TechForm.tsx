import type { ReactNode } from "react";

/**
 * Line-art forms, one per technology. Each is drawn from the company profile's description of that
 * technology (what it is and how it moves/behaves), so no two read as the same symbol.
 * These are illustrations, not renders of the real equipment. Pure SVG: no filters, no animation cost.
 */

const W = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const soft = { fill: "currentColor", fillOpacity: 0.12, stroke: "currentColor", strokeWidth: 1.5, strokeLinejoin: "round" } as const;
const dot = (x: number, y: number, r = 2.6) => <circle cx={x} cy={y} r={r} fill="currentColor" stroke="none" />;

const FORMS: Record<string, () => ReactNode> = {
  // Rotating triangular screens that stack and turn 360 degrees
  "tri-helix": () => (
    <g {...W}>
      {[0, 1, 2, 3, 4].map((i) => {
        const y = 100 - i * 18;
        const o = Math.sin(i * 1.1) * 9;
        return (
          <g key={i}>
            <path {...soft} d={`M${34 + o} ${y} L${62 + o} ${y} L${62 + o} ${y - 14} L${34 + o} ${y - 14} Z`} />
            <path {...soft} d={`M${62 + o} ${y} L${90 + o} ${y} L${90 + o} ${y - 14} L${62 + o} ${y - 14} Z`} fillOpacity={0.28} />
          </g>
        );
      })}
    </g>
  ),
  // Curved, motion-driven transitions: panels sliding along an arc
  "arc-shift": () => (
    <g {...W}>
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${14 + i * 6} ${88 - i * 14} A${52} ${52} 0 0 1 ${106 - i * 6} ${88 - i * 14}`} strokeWidth={9 - i * 2} strokeOpacity={0.35 + i * 0.25} />
      ))}
      <path d="M22 100 H98" strokeDasharray="2 6" />
      {dot(60, 34, 3)}
    </g>
  ),
  // Circular display systems revolving on an axis
  "arc-revolve": () => (
    <g {...W}>
      <path d="M60 14 V106" strokeDasharray="3 5" />
      {[30, 54, 78].map((y, i) => (
        <g key={y}>
          <ellipse cx="60" cy={y} rx={40 - i * 4} ry={11} {...soft} fillOpacity={0.08 + i * 0.07} />
        </g>
      ))}
      <path d="M96 40 a8 8 0 0 1 4 12" />
      <path d="M100 52 l-1 -5 M100 52 l-5 -1" />
    </g>
  ),
  // Rotating visual elements: a double helix
  "dna-xs": () => (
    <g {...W}>
      <path d="M40 12 C80 30 80 46 40 60 C0 74 0 90 40 108" transform="translate(10 0)" />
      <path d="M80 12 C40 30 40 46 80 60 C120 74 120 90 80 108" transform="translate(-10 0)" />
      {[24, 36, 48, 72, 84, 96].map((y) => (
        <path key={y} d={`M${42 + Math.abs(y - 60) * 0.2} ${y} H${78 - Math.abs(y - 60) * 0.2}`} strokeOpacity={0.55} />
      ))}
    </g>
  ),
  // Rotating triangular screen system
  triaxis: () => (
    <g {...W}>
      <path {...soft} d="M60 24 L98 90 H22 Z" />
      <path d="M60 24 L60 62 M22 90 L60 62 M98 90 L60 62" strokeOpacity={0.5} />
      <path d="M100 40 a46 46 0 0 1 8 30" />
      <path d="M108 70 l-6 -4 M108 70 l3 -6" />
      <path d="M20 80 a46 46 0 0 1 -8 -30" opacity={0.45} />
    </g>
  ),
  // A moving-screen interface on a rail
  "sliding-screen": () => (
    <g {...W}>
      <path d="M12 98 H108" />
      <rect {...soft} x="18" y="30" width="44" height="58" rx="3" />
      <rect {...soft} x="46" y="24" width="56" height="62" rx="3" fillOpacity={0.24} />
      <path d="M82 104 l8 -6 l-8 -6" transform="translate(0 6)" opacity={0.7} />
      <path d="M38 100 h-18" opacity={0.5} />
    </g>
  ),
  // Synchronised wall of triangular tiles, with one row tilting
  "kinetic-wall-ceiling": () => (
    <g {...W}>
      {[0, 1, 2, 3].map((r) =>
        [0, 1, 2, 3].map((c) => {
          const x = 14 + c * 24 + (r % 2) * 12;
          const y = 22 + r * 21;
          const rot = r === 1 ? 14 : 0;
          return <path key={`${r}-${c}`} {...soft} fillOpacity={0.08 + ((r + c) % 3) * 0.09} d={`M${x} ${y + 18} L${x + 12} ${y} L${x + 24} ${y + 18} Z`} transform={`rotate(${rot} ${x + 12} ${y + 12})`} />;
        }),
      )}
    </g>
  ),
  // Browse on a small screen, throw to a large one
  "touch-and-throw": () => (
    <g {...W}>
      <rect {...soft} x="16" y="14" width="88" height="48" rx="3" />
      <rect x="34" y="78" width="52" height="28" rx="3" />
      <path d="M60 100 V68" />
      <path d="M52 76 l8 -8 l8 8" />
      <circle cx="60" cy="96" r="4" fill="currentColor" stroke="none" />
      <path d="M26 24 h30 M26 34 h20" strokeOpacity={0.45} />
    </g>
  ),
  // A rotary control driving a synchronised main display
  "circular-dial": () => (
    <g {...W}>
      <rect {...soft} x="14" y="14" width="92" height="40" rx="3" />
      <circle cx="60" cy="86" r="26" />
      <circle cx="60" cy="86" r="17" strokeOpacity={0.5} />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <path key={i} d={`M${60 + Math.cos(a) * 26} ${86 + Math.sin(a) * 26} L${60 + Math.cos(a) * 31} ${86 + Math.sin(a) * 31}`} strokeOpacity={0.6} />;
      })}
      <path d="M60 86 L74 72" strokeWidth={2.4} />
      <path d="M92 62 a38 38 0 0 1 -6 6" opacity={0.5} />
    </g>
  ),
  // A 30-inch glass display: see-through with a sheen
  "transparent-oled": () => (
    <g {...W}>
      <rect {...soft} fillOpacity={0.05} x="22" y="16" width="76" height="88" rx="4" />
      <path d="M34 98 L86 22 M52 100 L98 34 M30 76 L62 28" strokeOpacity={0.35} />
      <circle cx="60" cy="60" r="11" />
      {dot(60, 60, 2.4)}
      <path d="M20 108 H100" strokeOpacity={0.5} />
    </g>
  ),
  // A wall that responds to gesture
  "interactive-wall": () => (
    <g {...W}>
      <rect {...soft} x="12" y="18" width="96" height="72" rx="3" />
      {[8, 17, 26].map((r, i) => (
        <circle key={r} cx="64" cy="52" r={r} strokeOpacity={0.9 - i * 0.28} />
      ))}
      {dot(64, 52)}
      <path d="M64 56 L50 100 L60 98 L64 108" strokeOpacity={0.7} />
    </g>
  ),
  // Slot-car racing track and laser maze
  "interactive-games": () => (
    <g {...W}>
      <path d="M26 40 H78 a22 22 0 0 1 0 44 H42 a14 14 0 0 1 0 -28 H80" />
      <path d="M26 40 a14 14 0 0 0 0 28 H60" strokeOpacity={0.45} />
      <rect {...soft} x="30" y="34" width="14" height="7" rx="2" transform="rotate(-8 37 38)" />
      <path d="M14 100 L106 94 M14 108 L106 84" strokeDasharray="2 5" strokeOpacity={0.6} />
    </g>
  ),
  // A room: surfaces that surround you
  "immersive-room": () => (
    <g {...W}>
      <path {...soft} fillOpacity={0.05} d="M12 20 L108 20 L108 100 L12 100 Z" />
      <path d="M12 20 L38 38 H82 L108 20 M12 100 L38 82 H82 L108 100 M38 38 V82 M82 38 V82" />
      <rect {...soft} x="38" y="38" width="44" height="44" fillOpacity={0.22} />
      {dot(60, 60, 4)}
    </g>
  ),
  // Fan blades producing floating 3D visuals
  holofan: () => (
    <g {...W}>
      <circle cx="60" cy="60" r="6" />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} {...soft} fillOpacity={0.22 - i * 0.04} d="M60 54 L56 14 L68 14 Z" transform={`rotate(${i * 90 + 20} 60 60)`} />
      ))}
      <circle cx="60" cy="60" r="44" strokeDasharray="2 6" />
      <path d="M100 38 a44 44 0 0 1 4 20 M104 58 l-1 -6 M104 58 l-6 0" strokeOpacity={0.7} />
    </g>
  ),
  // An RFID tube with a volumetric figure
  holotube: () => (
    <g {...W}>
      <ellipse cx="60" cy="24" rx="26" ry="8" />
      <path d="M34 24 V92 M86 24 V92" />
      <ellipse cx="60" cy="92" rx="26" ry="8" {...soft} />
      <path d="M60 40 L52 76 M60 40 L68 76 M44 54 H76" strokeOpacity={0.6} />
      {dot(60, 38, 4)}
      <path d="M48 106 H72" />
    </g>
  ),
  // A headset
  "ar-vr": () => (
    <g {...W}>
      <rect {...soft} x="20" y="38" width="80" height="38" rx="14" />
      <circle cx="46" cy="57" r="9" />
      <circle cx="74" cy="57" r="9" />
      <path d="M20 54 H10 M100 54 H110 M52 38 V28 H68 V38" strokeOpacity={0.6} />
      <path d="M32 92 q28 12 56 0" strokeDasharray="2 5" />
    </g>
  ),
  // A photobooth frame with a lens and a spark
  "ai-photobooth": () => (
    <g {...W}>
      <rect {...soft} x="30" y="12" width="60" height="96" rx="5" fillOpacity={0.07} />
      <circle cx="60" cy="30" r="6" />
      <rect x="40" y="46" width="40" height="40" rx="3" />
      <path d="M96 40 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 Z" {...soft} fillOpacity={0.4} />
      <path d="M44 98 H76" />
    </g>
  ),
  // A voice-based assistant
  "ai-assistant": () => (
    <g {...W}>
      <path {...soft} d="M18 26 H102 V76 H64 L44 96 V76 H18 Z" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <path key={i} d={`M${34 + i * 9} ${51 - [4, 10, 16, 7, 18, 9, 5][i]} V${51 + [4, 10, 16, 7, 18, 9, 5][i]}`} />
      ))}
    </g>
  ),
  // Visitor tracking by camera
  "ai-camera-tracking": () => (
    <g {...W}>
      <rect {...soft} x="22" y="14" width="40" height="22" rx="4" />
      <circle cx="42" cy="25" r="6" />
      <path d="M60 36 L88 62" strokeDasharray="2 5" />
      <path d="M72 58 V50 H80 M110 50 V58 M72 100 V108 H80 M110 108 V100" transform="translate(-14 -8)" />
      <circle cx="82" cy="74" r="6" />
      <path d="M72 100 q10 -16 20 0" />
    </g>
  ),
  // An industrial robot arm
  "robotic-arm": () => (
    <g {...W}>
      <rect {...soft} x="34" y="96" width="52" height="10" rx="2" />
      <path d="M60 96 V76" strokeWidth={5} />
      <circle cx="60" cy="72" r="6" />
      <path d="M60 72 L92 44" strokeWidth={4} />
      <circle cx="92" cy="44" r="5" />
      <path d="M92 44 L74 22" strokeWidth={3} />
      <path d="M74 22 l-6 -4 M74 22 l-2 -8" />
      {dot(60, 72, 2)}
    </g>
  ),
  // Fallback: the Enginious circle-and-trace motif
  mark: () => (
    <g {...W}>
      <circle cx="68" cy="60" r="38" strokeOpacity={0.9} />
      <path d="M14 46 H34 L40 40 H80 M20 62 H60 M30 78 H72" />
      {dot(14, 46)}
      {dot(20, 62)}
      {dot(30, 78)}
    </g>
  ),
};

export type FormSlug = keyof typeof FORMS;

export function TechForm({ slug, size = 120, className = "", title }: { slug: string; size?: number; className?: string; title?: string }) {
  const draw = FORMS[slug] ?? FORMS.mark;
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false">
      {draw()}
    </svg>
  );
}
