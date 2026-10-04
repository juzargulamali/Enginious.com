# Video delivery

The homepage hero plays a muted, looping showreel behind the headline, with a pause control, reduced-motion and data-saver handling, and a centred modal for the full film. These controls are unchanged.

**Configure it in the CMS (Site settings -> Video):** YouTube IDs (privacy-enhanced embeds), an optional *video file address* (an approved MP4 on a video service or CDN, https) and a *poster image* (pick from the media library).

**Recommended limits for the background file:** H.264 MP4, 1920 x 1080 (and an optional 1280 x 720 or vertical file for phones), 15 to 30 seconds, muted, loopable, at most about 12 MB (5 MB for phones), no audio track needed. Put the first frame (poster) in the media library at 1920 x 1080.

**Not provided:** large video upload and transcoding. The hosting platform caps request bodies at about 4.5 MB, so videos are not uploaded through the CMS. Host them on a service built for video (for example Cloudflare Stream, Mux or Bunny Stream) and paste the file address. If you would like uploads and transcoding inside the CMS later, that needs a signed direct-to-storage upload and a transcoding service (see `docs/BACKLOG.md`).
