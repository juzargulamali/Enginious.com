#!/usr/bin/env python3
"""Generates the three face textures of the Kinetic Tower (public/art/*.svg).

Each texture is one tall image (320 x 504, six tiers of 84) so the tiers read as one continuous
surface when they are aligned. Deterministic (seeded): re-running gives identical files.
Idea = blueprint, Engineering = circuit board, Experience = lit LED content.
"""
import math, os, random

W, H, TIERS = 320, 504, 6
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "art")
os.makedirs(OUT, exist_ok=True)


def svg(body: str, defs: str = "") -> str:
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="none"><defs>{defs}</defs>{body}</svg>'


def tier_seams(color="#27cdd8", op=0.35):
    return "".join(f'<path d="M0 {i*84} H{W}" stroke="{color}" stroke-opacity="{op}" stroke-width="1"/>' for i in range(1, TIERS))


# ---------------------------------------------------------------- IDEA: blueprint
def idea():
    r = random.Random(11)
    b = [f'<rect width="{W}" height="{H}" fill="#062536"/>']
    # fine grid
    for x in range(0, W + 1, 16):
        b.append(f'<path d="M{x} 0V{H}" stroke="#27cdd8" stroke-opacity="{0.22 if x % 64 == 0 else 0.08}" stroke-width="1"/>')
    for y in range(0, H + 1, 16):
        b.append(f'<path d="M0 {y}H{W}" stroke="#27cdd8" stroke-opacity="{0.22 if y % 64 == 0 else 0.08}" stroke-width="1"/>')
    # construction: big circle + radial lines + nested triangles (the idea taking shape)
    cx, cy = 160, 250
    b.append(f'<circle cx="{cx}" cy="{cy}" r="120" fill="none" stroke="#7be9f2" stroke-opacity=".55" stroke-width="1.4" stroke-dasharray="6 6"/>')
    for k in range(3):
        rr = 108 - k * 30
        pts = " ".join(f"{cx + rr*math.cos(math.radians(-90 + a)):.1f},{cy + rr*math.sin(math.radians(-90 + a)):.1f}" for a in (0, 120, 240))
        b.append(f'<polygon points="{pts}" fill="none" stroke="#7be9f2" stroke-opacity="{0.9 - k*0.2}" stroke-width="1.6"/>')
    for a in range(0, 360, 30):
        b.append(f'<path d="M{cx} {cy}L{cx + 160*math.cos(math.radians(a)):.1f} {cy + 160*math.sin(math.radians(a)):.1f}" stroke="#27cdd8" stroke-opacity=".25" stroke-width="1"/>')
    # sketch curves
    for i in range(6):
        y = 30 + i * 84
        b.append(f'<path d="M20 {y+30} C90 {y-10} 150 {y+60} 300 {y+14}" fill="none" stroke="#e8f3f5" stroke-opacity=".32" stroke-width="1.2" stroke-dasharray="1 5" stroke-linecap="round"/>')
    # dimension lines with arrowheads
    for (x1, y1, x2, y2) in [(30, 420, 290, 420), (30, 60, 290, 60), (24, 100, 24, 400)]:
        b.append(f'<path d="M{x1} {y1}L{x2} {y2}" stroke="#e8f3f5" stroke-opacity=".6" stroke-width="1"/>')
        for (px, py) in [(x1, y1), (x2, y2)]:
            b.append(f'<circle cx="{px}" cy="{py}" r="2.5" fill="#e8f3f5" fill-opacity=".8"/>')
    # annotation ticks
    for i in range(14):
        x, y = r.randint(20, 300), r.randint(20, 480)
        b.append(f'<path d="M{x} {y}h{r.randint(14,40)}" stroke="#27cdd8" stroke-opacity=".5" stroke-width="1"/>')
    b.append(tier_seams("#7be9f2", 0.5))
    return svg("".join(b))


# ---------------------------------------------------------------- ENGINEERING: circuit board
def engineering():
    r = random.Random(23)
    b = [f'<rect width="{W}" height="{H}" fill="#04141c"/>']
    grid = 16
    occupied = set()
    colors = ["#27cdd8", "#26798d", "#3dd2dc"]
    # orthogonal traces with 45-degree bends, ending in pads (as in the logo)
    for _ in range(46):
        x, y = r.randrange(1, W // grid) * grid, r.randrange(1, H // grid) * grid
        pts = [(x, y)]
        for _ in range(r.randint(2, 5)):
            d = r.choice([(1, 0), (-1, 0), (0, 1), (0, -1)])
            n = r.randint(1, 4) * grid
            x = max(grid, min(W - grid, x + d[0] * n))
            y = max(grid, min(H - grid, y + d[1] * n))
            if r.random() < 0.4:
                x += d[0] * 0
                y += 8 * (1 if r.random() < .5 else -1)
            pts.append((x, y))
        c = r.choice(colors)
        path = "M" + "L".join(f"{px} {py}" for px, py in pts)
        b.append(f'<path d="{path}" fill="none" stroke="{c}" stroke-opacity="{r.choice([.55,.8,.95])}" stroke-width="{r.choice([1.6,2,2.6])}" stroke-linejoin="round"/>')
        for (px, py), filled in ((pts[0], False), (pts[-1], True)):
            b.append(f'<circle cx="{px}" cy="{py}" r="{4.2 if not filled else 3}" fill="{"#04141c" if not filled else c}" stroke="{c}" stroke-width="1.8"/>')
    # chips
    for _ in range(9):
        w, h = r.choice([36, 48, 60]), r.choice([24, 32, 44])
        x, y = r.randrange(1, (W - w) // grid) * grid, r.randrange(1, (H - h) // grid) * grid
        b.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="3" fill="#0a2a36" stroke="#3dd2dc" stroke-opacity=".7" stroke-width="1.4"/>')
        for k in range(w // 8):
            b.append(f'<path d="M{x+6+k*8} {y}v-5M{x+6+k*8} {y+h}v5" stroke="#7be9f2" stroke-opacity=".7" stroke-width="1.4"/>')
    b.append(tier_seams("#3dd2dc", 0.45))
    return svg("".join(b))


# ---------------------------------------------------------------- EXPERIENCE: lit LED content
def experience():
    r = random.Random(37)
    defs = (
        '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#021b24"/><stop offset=".45" stop-color="#0b6f7e"/><stop offset="1" stop-color="#27cdd8"/></linearGradient>'
        '<radialGradient id="g1" cx=".28" cy=".18" r=".7"><stop offset="0" stop-color="#d9fbff" stop-opacity=".95"/><stop offset="1" stop-color="#27cdd8" stop-opacity="0"/></radialGradient>'
        '<radialGradient id="g2" cx=".78" cy=".62" r=".6"><stop offset="0" stop-color="#7be9f2" stop-opacity=".9"/><stop offset="1" stop-color="#27cdd8" stop-opacity="0"/></radialGradient>'
        '<radialGradient id="g3" cx=".3" cy=".92" r=".55"><stop offset="0" stop-color="#e8f3f5" stop-opacity=".8"/><stop offset="1" stop-color="#27cdd8" stop-opacity="0"/></radialGradient>'
    )
    b = [f'<rect width="{W}" height="{H}" fill="url(#bg)"/>', f'<rect width="{W}" height="{H}" fill="url(#g1)"/>', f'<rect width="{W}" height="{H}" fill="url(#g2)"/>', f'<rect width="{W}" height="{H}" fill="url(#g3)"/>']
    # flowing wave bands (like content running across the screens)
    for i in range(16):
        y = i * 32 + r.randint(-6, 6)
        amp = r.randint(14, 40)
        d = f"M-10 {y} " + " ".join(f"Q{x+40} {y + (amp if (x//80)%2==0 else -amp)} {x+80} {y}" for x in range(-10, W + 80, 80))
        b.append(f'<path d="{d}" fill="none" stroke="#e8f3f5" stroke-opacity="{r.choice([.18,.3,.5])}" stroke-width="{r.choice([1,1.6,2.6])}"/>')
    # glowing dots (light points)
    for _ in range(70):
        x, y, rad = r.randint(0, W), r.randint(0, H), r.choice([1.2, 1.8, 2.6, 4])
        b.append(f'<circle cx="{x}" cy="{y}" r="{rad}" fill="#fff" fill-opacity="{r.choice([.35,.6,.9])}"/>')
    # LED matrix: fine pixel grid overlay
    b.append('<defs><pattern id="px" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="none" stroke="#021b24" stroke-opacity=".55" stroke-width="1"/></pattern></defs>')
    b.append(f'<rect width="{W}" height="{H}" fill="url(#px)"/>')
    b.append(tier_seams("#021b24", 0.7))
    return svg("".join(b), defs)


for name, fn in {"idea": idea, "engineering": engineering, "experience": experience}.items():
    path = os.path.join(OUT, f"{name}.svg")
    with open(path, "w") as f:
        f.write(fn())
    print(path, os.path.getsize(path), "bytes")
