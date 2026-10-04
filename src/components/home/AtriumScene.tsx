/**
 * The Enginious Digital Atrium: the static architecture behind the hero. No scripts, no animation, no filters.
 *
 *  - <AtriumEnv>    distant environment. One SVG on a 1600 x 900 canvas (stretched, strokes stay 1px) with a single
 *                   vanishing point: floor rails and ceiling rails converge on it, a few dark fins recede along the
 *                   left and right walls, and one soft teal glow sits behind the vanishing point. STATIC: painted once.
 *  - <AtriumFrame>  the near-black opening: vignette, two edge-lit pillars, a lintel, plus the screen's cast shadow and
 *                   glow. STATIC too, so neither costs a compositor layer.
 *  - <AtriumPlanes> the receding planes, light rails and floor light around the showreel screen as ONE SVG. The 3D is
 *                   baked in with the same maths the browser uses for CSS perspective, so the planes line up with the
 *                   real 3D screen, but the whole thing is a single flat layer that moves with the pointer.
 *
 * One light direction everywhere: the light lives at the far end of the hall (the vanishing point, upper right of
 * centre). Faces that look toward it carry a thin teal rim; shadows fall away from it (down and to the left).
 * Everything here is decorative and aria-hidden.
 */

const VP = { x: 1020, y: 372 };            // vanishing point on the 1600 x 900 canvas
const W = 1600, H = 900;

// Floor and ceiling rails: lines from the vanishing point out to the edge of the canvas.
const FLOOR_X = [-1500, -820, -330, 150, 600, 1020, 1480, 2000, 2700, 3500];
const CEIL_X = [-700, -150, 380, 860, 1280, 1720, 2300];

// Fins along the walls: depth scale s (1 = nearest). x0 is the wall's x on the nearest plane; y0 are floor and ceiling there.
const LEFT_X0 = -260, RIGHT_X0 = 1800, FLOOR_Y0 = 1260, CEIL_Y0 = -360, FIN_W = 70;
const LEFT_S = [0.92, 0.72, 0.15];   // mid-depth left fins are left out on purpose: that zone stays calm behind the copy
const RIGHT_S = [0.9, 0.62, 0.46, 0.34, 0.26, 0.2];

const px = (n: number) => Math.round(n * 10) / 10;
const fin = (x0: number, s: number) => {
  const cx = VP.x + (x0 - VP.x) * s;
  const w = FIN_W * s;
  const top = VP.y + (CEIL_Y0 - VP.y) * s;
  const bottom = VP.y + (FLOOR_Y0 - VP.y) * s;
  return { x: px(cx - w / 2), y: px(top), w: px(w), h: px(bottom - top), edge: px(x0 < VP.x ? cx + w / 2 : cx - w / 2), s };
};

export function AtriumEnv() {
  const left = LEFT_S.map((s) => fin(LEFT_X0, s));
  const right = RIGHT_S.map((s) => fin(RIGHT_X0, s));
  const transverse = [
    ...[0.14, 0.34, 0.7].map((k) => px(VP.y + (H - VP.y) * k)),   // a few floor lines, spaced as they would be in perspective
    ...[0.56, 0.78, 0.9].map((k) => px(VP.y * k)),                 // and ceiling beams, closer together towards the horizon
  ];
  return (
    <div className="at-env" aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" focusable="false">
        <defs>
          {/* rails fade out near the vanishing point and near the canvas edge, so they read as distance, not as a grid */}
          <radialGradient id="at-fade" gradientUnits="userSpaceOnUse" cx={VP.x} cy={VP.y} r="760">
            <stop offset="0.06" stopColor="#000" /><stop offset="0.22" stopColor="#fff" /><stop offset="0.8" stopColor="#fff" /><stop offset="1" stopColor="#000" />
          </radialGradient>
          <mask id="at-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}><rect width={W} height={H} fill="url(#at-fade)" /></mask>
          <linearGradient id="at-fin-l" x1="0" x2="1"><stop offset="0" stopColor="#010508" /><stop offset="0.7" stopColor="#03111a" /><stop offset="1" stopColor="#0a3140" /></linearGradient>
          <linearGradient id="at-fin-r" x1="1" x2="0"><stop offset="0" stopColor="#010508" /><stop offset="0.7" stopColor="#03111a" /><stop offset="1" stopColor="#0a3140" /></linearGradient>
          <radialGradient id="at-sheen"><stop offset="0" stopColor="#46e9f3" stopOpacity="0.16" /><stop offset="0.6" stopColor="#46e9f3" stopOpacity="0.05" /><stop offset="1" stopColor="#46e9f3" stopOpacity="0" /></radialGradient>
          <linearGradient id="at-floor" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#0b4252" stopOpacity="0" /><stop offset="0.55" stopColor="#062431" stopOpacity="0.55" /><stop offset="1" stopColor="#01070c" stopOpacity="0.9" /></linearGradient>
        </defs>

        {/* floor plane, a faint horizon, and the glossy sheen under the light */}
        <rect x="0" y={VP.y} width={W} height={H - VP.y} fill="url(#at-floor)" />
        <ellipse cx={VP.x + 140} cy={VP.y + 262} rx="640" ry="120" fill="url(#at-sheen)" />

        <g mask="url(#at-mask)" className="at-rails">
          {FLOOR_X.map((x) => <line key={`f${x}`} x1={VP.x} y1={VP.y} x2={x} y2={H} />)}
          {CEIL_X.map((x) => <line key={`c${x}`} x1={VP.x} y1={VP.y} x2={x} y2={0} className="at-ceil" />)}
          {transverse.map((y) => <line key={`t${y}`} x1="0" y1={y} x2={W} y2={y} className="at-trans" />)}
        </g>

        {/* fins on the walls: dark slabs, lit only on the edge that faces the light */}
        <g className="at-fins">
          {left.map((f) => (
            <g key={`l${f.s}`} style={{ opacity: Math.min(1, 0.55 + f.s * 0.6) }}>
              <rect x={f.x} y={f.y} width={f.w} height={f.h} fill="url(#at-fin-l)" />
              <line x1={f.edge} y1={f.y} x2={f.edge} y2={f.y + f.h} className="at-rim" />
            </g>
          ))}
          {right.map((f) => (
            <g key={`r${f.s}`} style={{ opacity: Math.min(1, 0.55 + f.s * 0.6) }}>
              <rect x={f.x} y={f.y} width={f.w} height={f.h} fill="url(#at-fin-r)" />
              <line x1={f.edge} y1={f.y} x2={f.edge} y2={f.y + f.h} className="at-rim" />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

export function AtriumFrame() {
  return (
    <div className="at-frame" aria-hidden="true">
      <span className="at-cast" />
      <span className="at-glow" />
      <span className="at-lintel" />
      <span className="at-pillar at-pl" />
      <span className="at-pillar at-pr" />
    </div>
  );
}


// ---------------------------------------------------------------------------------------------------------------------
// Planes around the showreel screen. Units: the screen is 1000 wide and 562.5 tall (its centre is 500, 281.25).
// Each plane is a rectangle at depth z (negative = further away), yawed/pitched like the screen and projected with the same
// maths as CSS (rotateY, rotateX, then perspective d from origin o). Baked once, at build time.
// ---------------------------------------------------------------------------------------------------------------------
const SW = 1000, SH = 562.5;
type Pose = { yaw: number; pitch: number; d: number; ox: number; oy: number };
const DESKTOP: Pose = { yaw: 6, pitch: 0, d: 1500, ox: 0.18 * SW, oy: 0.5 * SH };
const MOBILE: Pose = { yaw: -3, pitch: 5, d: 1100, ox: 0.5 * SW, oy: 0.4 * SH };

function proj(x: number, y: number, z: number, v: Pose): [number, number] {
  const cy = Math.cos((v.yaw * Math.PI) / 180), sy = Math.sin((v.yaw * Math.PI) / 180);
  const cx = Math.cos((v.pitch * Math.PI) / 180), sx = Math.sin((v.pitch * Math.PI) / 180);
  const dx = x - SW / 2, dy = y - SH / 2;
  const x1 = dx * cy + z * sy, z1 = -dx * sy + z * cy;          // rotateY
  const y2 = dy * cx - z1 * sx, z2 = dy * sx + z1 * cx;         // then rotateX
  const f = v.d / (v.d - z2);
  return [px(v.ox + (SW / 2 + x1 - v.ox) * f), px(v.oy + (SH / 2 + y2 - v.oy) * f)];
}
// a plane: insets as a fraction of the screen (top, right, bottom, left; negative = grows outwards), at depth z, size-compensated
function plane(ins: [number, number, number, number], z: number, v: Pose): string {
  const k = 1 + Math.abs(z) / v.d;                              // same compensation the CSS version used: planes keep their nominal size
  const [t, r, b, l] = ins;
  const rect: [number, number][] = [[-l * SW, -t * SH], [SW + r * SW, -t * SH], [SW + r * SW, SH + b * SH], [-l * SW, SH + b * SH]];
  return rect.map(([x, y]) => proj(SW / 2 + (x - SW / 2) * k, SH / 2 + (y - SH / 2) * k, z, v).join(",")).join(" ");
}
function floor(z: number, v: Pose): string {
  const pts: [number, number][] = [[0.06 * SW, 1.03 * SH], [0.94 * SW, 1.03 * SH], [1.0 * SW, 1.45 * SH], [0.0, 1.45 * SH]];
  return pts.map(([x, y]) => proj(x, y, z, v).join(",")).join(" ");
}
function rails(v: Pose) {
  const top = proj(0, -0.1 * SH, -70, v), topR = proj(SW, -0.1 * SH, -70, v);
  const bot = proj(0, 1.13 * SH, -20, v), botR = proj(SW, 1.13 * SH, -20, v);
  return { r1: { x1: top[0] + 0.38 * (topR[0] - top[0]), y1: top[1] + 0.38 * (topR[1] - top[1]), x2: 1300, y2: topR[1] + 6 }, r2: { x1: bot[0] + 0.64 * (botR[0] - bot[0]), y1: bot[1] + 0.64 * (botR[1] - bot[1]), x2: -120, y2: bot[1] - 4 } };
}

function PlaneSet({ v, cls }: { v: Pose; cls: string }) {
  const m = v === MOBILE;
  const pa = plane(m ? [0.07, 0.04, 0.09, 0.03] : [0.09, 0.06, 0.12, -0.01], m ? -34 : -70, v);
  const pb = plane(m ? [0.16, 0.08, 0.16, 0.06] : [0.24, 0.14, 0.24, -0.06], m ? -90 : -170, v);
  const pc = m ? "" : plane([0.46, 0.26, 0.38, -0.12], -300, v);
  const fl = floor(-20, v);
  const rl = rails(v);
  return (
    <g className={cls}>
      {pc && <polygon points={pc} className="pl-c" />}
      <polygon points={pb} className="pl-b" />
      <polygon points={pa} className="pl-a" />
      <polygon points={fl} fill="url(#pl-floor)" mask="url(#pl-floor-mask)" />
      <line {...rl.r1} stroke="url(#pl-rail-r)" className="pl-rail" />
      <line {...rl.r2} stroke="url(#pl-rail-l)" className="pl-rail" />
    </g>
  );
}

export function AtriumPlanes() {
  return (
    <svg viewBox="-120 -400 1480 1360" focusable="false">
      <defs>
        <linearGradient id="pl-floor" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#27cdd8" stopOpacity="0" /><stop offset="0.1" stopColor="#27cdd8" stopOpacity="0.2" /><stop offset="0.55" stopColor="#27cdd8" stopOpacity="0.05" /><stop offset="1" stopColor="#27cdd8" stopOpacity="0" /></linearGradient>
        <linearGradient id="pl-floor-fade" x1="0" x2="1"><stop offset="0" stopColor="#000" /><stop offset="0.28" stopColor="#fff" /><stop offset="0.72" stopColor="#fff" /><stop offset="1" stopColor="#000" /></linearGradient>
        <mask id="pl-floor-mask" maskUnits="userSpaceOnUse" x="-120" y="-400" width="1480" height="1360"><rect x="-120" y="-400" width="1480" height="1360" fill="url(#pl-floor-fade)" /></mask>
        <linearGradient id="pl-rail-r" x1="0" x2="1"><stop offset="0" stopColor="#27cdd8" stopOpacity="0.3" /><stop offset="0.25" stopColor="#46e9f3" stopOpacity="0.55" /><stop offset="1" stopColor="#46e9f3" stopOpacity="0" /></linearGradient>
        <linearGradient id="pl-rail-l" x1="1" x2="0"><stop offset="0" stopColor="#27cdd8" stopOpacity="0.3" /><stop offset="0.25" stopColor="#46e9f3" stopOpacity="0.55" /><stop offset="1" stopColor="#46e9f3" stopOpacity="0" /></linearGradient>
      </defs>
      <PlaneSet v={DESKTOP} cls="pl-d" />
      <PlaneSet v={MOBILE} cls="pl-m" />
    </svg>
  );
}
