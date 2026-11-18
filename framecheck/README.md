# FRAMECHECK

A private, browser-based creative review room built for the AI-Verse Filmmakers community.

**Live app:** https://aiverse-filmmakers.github.io/hub/framecheck/

## What it does

- Opens a video locally through the browser's File API. No file upload, account, analytics, external script, or paid AI model.
- Play / pause, timeline scrub, and approximate single-frame stepping using a selectable 24 / 25 / 30 / 60 fps interval.
- Toggle a rule-of-thirds overlay and an approximate title-safe guide.
- Add timecoded findings by category and priority, then resolve or delete them.
- Complete eight manual professional quality checks, including continuity, brand, sound, rights, and delivery format.
- Capture a frame as PNG or export a six-frame contact sheet as JPEG.
- Copy or download a text review as Markdown, print it to PDF, or export / import a JSON notes backup.
- Keep a separate local draft for each selected video, using filename, size and last-modified time as the key.

## Quick start

1. Open the link and select or drop a video.
2. Pause at a problem. Use the arrow keys or player controls for approximate frame stepping.
3. Choose the category, priority, write a concrete action and click **Add note at this frame**.
4. Work through the manual preflight checklist and mark fixes resolved.
5. Export the Markdown report to a client or your AI-Verse community post. Use the contact sheet if you want to share visual references.
6. Export a JSON backup to move the review to another device. The backup **does not** include the video.

## Important limitations

- FRAMECHECK **does not run AI analysis**. Findings and checklist checks are entirely human-entered. No automated review or legal clearance is claimed.
- Frame stepping uses a configurable time increment. Compressed videos, variable-frame-rate media and browser decoding may make steps approximate rather than exact.
- The safe-area overlay is only an editing guide, not an official platform template. Check the actual destination's current requirements.
- Video support depends on browser codecs. If a MOV does not play, try an H.264 MP4.
- Drafts use localStorage. Clearing browser data, using private mode, or changing device can lose them. Export JSON for durability.
- Contact sheets sample six evenly spaced frames. They do not detect shots automatically and do not include the underlying video.
- Notes exported to Markdown or JSON may contain client-sensitive information. Share those exports deliberately.
- You must independently verify advertising claims, consent, likeness rights, licensed music, product accuracy and any platform or jurisdiction-specific AI disclosure requirements.

## Design principles

- A second pair of eyes, not an AI fortune teller.
- High-value utility without subscriptions.
- Keep the video local, make the review portable.
- Useful on a phone, but best on a larger screen for visual QC.
- No build tooling, runtime dependencies or backend. All code lives in `index.html` and runs on static GitHub Pages.

## Production review research

The tool is informed by publicly available references including:

- TikTok for Business, creative best practices: https://ads.tiktok.com/business/en/guides/video-advertising-guide
- Runway's reference workflow for subject consistency: https://help.runwayml.com/hc/en-us/articles/40042718905875-Creating-with-Gen-4-Image-References
- Google's video prompting and image-to-video guide: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/video/best-practice
- IAB's 2026 AI Transparency and Disclosure Framework: https://www.iab.com/news/updates-industry-framework-ai-transparency-disclosure-advertising/
- European Commission, Article 50 transparency: https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act

The app is not affiliated with these organizations. These resources are for context and should not be interpreted as legal advice.

## Manual smoke test

- Select a local MP4, verify resolution, duration and playback.
- Seek, play / pause and step both ways. Verify timecode moves.
- Add Fix and Good notes at different moments. Click their timeline markers.
- Mark a Fix resolved and verify the review status changes.
- Check all eight quality gates and verify progress and status.
- Download a PNG still and a six-frame JPEG contact sheet.
- Copy and download Markdown; verify timestamps, category, priority and checklist.
- Download JSON, clear the review, import the JSON with the same video selected.
- Reload the page, select the same video and confirm locally saved notes reappear.
- Verify keyboard behavior on desktop and touch controls on mobile.

## License and contribution

Built for AI-Verse Filmmakers. The code is contained in this public repository. No separate reuse license is granted by this README.
