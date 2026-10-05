import test from "node:test";
import assert from "node:assert/strict";
import { parseVideoUrl, toVideoSpec } from "./video.ts";

test("YouTube links in every common shape resolve to an id", () => {
  for (const u of ["https://www.youtube.com/watch?v=aqz-KE-bpKQ", "https://youtu.be/aqz-KE-bpKQ", "https://m.youtube.com/watch?v=aqz-KE-bpKQ&t=5", "https://www.youtube.com/embed/aqz-KE-bpKQ", "https://www.youtube.com/shorts/aqz-KE-bpKQ", "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ"]) {
    assert.deepEqual(parseVideoUrl(u), { kind: "youtube", id: "aqz-KE-bpKQ" }, u);
  }
});

test("direct video files are accepted; sharing pages and unsafe links are not", () => {
  assert.equal(parseVideoUrl("https://cdn.example.com/a/b.mp4")?.kind, "file");
  assert.equal(parseVideoUrl("https://cdn.example.com/a/b.webm?x=1")?.kind, "file");
  for (const u of ["https://company.sharepoint.com/:v:/s/team/Eabc", "https://1drv.ms/v/s!abc", "https://drive.google.com/file/d/abc/view", "http://cdn.example.com/a.mp4", "javascript:alert(1)", "https://www.youtube.com/watch", "https://www.youtube.com/watch?v=short", "https://cdn.example.com/page.html", ""]) {
    assert.equal(parseVideoUrl(u), null, u);
  }
});

test("video spec: defaults, clamping, and override only when it is a direct file", () => {
  assert.equal(toVideoSpec({}), undefined);
  assert.equal(toVideoSpec({ video_url: "https://company.sharepoint.com/x" }), undefined);
  const d = toVideoSpec({ video_url: "https://youtu.be/aqz-KE-bpKQ" })!;
  assert.deepEqual([d.start, d.seconds, d.previewUrl, d.poster], [0, 10, undefined, undefined]);
  const c = toVideoSpec({ video_url: "https://youtu.be/aqz-KE-bpKQ", video_preview_start: -5, video_preview_seconds: 500, video_preview_url: "https://youtu.be/aqz-KE-bpKQ", video_poster: "img-1" })!;
  assert.deepEqual([c.start, c.seconds, c.previewUrl, c.poster], [0, 60, undefined, "img-1"]);
  assert.equal(toVideoSpec({ video_url: "https://youtu.be/aqz-KE-bpKQ", video_preview_url: "https://cdn.example.com/p.mp4" })!.previewUrl, "https://cdn.example.com/p.mp4");
});
