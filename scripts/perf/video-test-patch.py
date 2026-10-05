# Temporary test content (NEVER commit): gives some starter projects/technologies a video so the preview/player can be tested locally.
# python3 scripts/perf/video-test-patch.py <repo root>   then build; revert with: git checkout src/lib/content/seed.ts
import sys, os
p = os.path.join(sys.argv[1], "src/lib/content/seed.ts"); s = open(p).read()
vt = '''const TV: Record<number, Record<string, unknown>> = {
  0: { video_url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ", video_preview_start: 5, video_preview_seconds: 3 },
  1: { video_url: "https://videos.test/clip.webm", video_preview_start: 2, video_preview_seconds: 4 },
  2: { video_url: "https://youtu.be/jNQXAC9IVRw", video_preview_url: "https://videos.test/clip.webm", video_preview_start: 0, video_preview_seconds: 3 },
  3: { video_url: "https://videos.test/bad.mp4" },
  4: { video_url: "https://www.youtube.com/watch?v=STALL000000" },
  5: { video_url: "https://videos.test/clip.webm" },
};
const TT: Record<string, Record<string, unknown>> = { "tri-helix": { video_url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ", video_preview_start: 3, video_preview_seconds: 3 }, holofan: { video_url: "https://videos.test/clip.webm" } };
'''
s = s.replace("const TECH_EXTRA", vt + "const TECH_EXTRA", 1)
s = s.replace("...(PROJECT_EXTRA[p.slug] ?? {}) },", "...(PROJECT_EXTRA[p.slug] ?? {}), ...(TV[i] ?? {}) },", 1)
s = s.replace("...(TECH_EXTRA[t.slug] ?? {}) } }));", "...(TECH_EXTRA[t.slug] ?? {}), ...(TT[t.slug] ?? {}) } }));", 1)
open(p, "w").write(s)
