# AXIS LAB

**A scene-blocking and cut-continuity director for AI filmmakers.**

Stage two performers, move your camera around the action axis, capture coverage and export a shot plan before generating video.

**GitHub Pages URL after merging the pull request:** https://aiverse-filmmakers.github.io/hub/axis-lab/

AXIS LAB lives entirely inside this directory. It does not replace or alter the repository's existing website, FRAMECHECK or any other application.

## Features

- **Interactive floor plan:** On mobile, select Camera, Performer A or Performer B and tap a position on the stage, or drag the larger markers. On desktop, click-to-place and dragging also work. Keyboard users can focus a handle and reposition it using arrow keys.
- **Schematic camera preview:** Watch performer screen-left/screen-right order change as you move around the scene. Choose wide, medium or close framing.
- **Shot planning:** Save up to 60 independent setups, each with performer positions, camera position, framing, camera language and an optional story beat. Select any saved shot to restore its setup.
- **Continuity preflight:** Adjacent shots are checked for possible crossings of the 180-degree line, ambiguous camera positions, unexpected performer movement and nearly identical coverage.
- **Production brief:** Download or copy a Markdown shot list including camera side, approximate screen order, blocking coordinates, suggested generation direction, cut warnings and a human QC checklist.
- **Editable backup:** Save and reopen JSON scene projects. The current project also persists in the browser automatically.

This does not generate AI video, upload video, analyze rendered frames, call a model or inspect client assets. Its purpose is better planning before you spend generation credits.

## Start in one minute

1. Open the app on a phone or desktop, then rename the scene and performers if needed.
2. On your phone, tap **Performer A** then tap the floor where A should stand. Repeat for **Performer B**. You can also drag each labelled marker directly.
3. Select **Camera** then tap its desired location, or drag the camera marker. Move it to the opposite side of the line to see how screen direction changes.
4. Choose the framing, camera movement and optionally describe the story beat.
5. Click **Capture this setup**.
6. Move the camera and capture the next setup. Continue until you have your intended coverage.
7. Review the continuity preflight and export the Markdown shot brief for your generation and editing workflow.

**Directing principle:** Crossing the 180-degree line is not automatically an error. It can be a deliberate creative choice. The tool encourages you to notice the change and motivate it, show a continuous move or use a neutral shot to re-establish geography.

## What the continuity checks mean

| Flag | Detection | Director's decision |
| --- | --- | --- |
| Possible 180-degree crossing | Two consecutive cameras appear on different sides of their performers' action axes | Decide whether the reversal is intentional; consider matching geography, showing the move or inserting a neutral angle |
| Camera near axis | Camera appears close to the performer-to-performer line | Check the actual eyelines and left/right relationships |
| Blocking changed | One or more performers were repositioned significantly between snapshots | Verify that the action accounts for the movement or restore the same blocking |
| Similar coverage | Consecutive shots share nearly identical camera placement and shot size | Ask what the cut adds and consider differentiated coverage |

**Limitations:** All flags are geometric heuristics for a manually constructed schematic, not verified video defects or automated editorial judgments. Preview silhouettes estimate screen order rather than render a lens-accurate 3D environment. The stage units are arbitrary pixels, not real distances, and shot size does not correspond to measured focal length. Real editing still requires a visual and sound review. Actor movement, over-the-shoulder views, motivated axis crossing and camera motion can all justify exceptions to these rules.

## Privacy

No account, backend, dependencies, third-party scripts, analytics, video uploads, images or model API calls. All calculations run in your browser. The current scene is stored in localStorage, which may be lost when you clear browser data or switch devices. Download the JSON backup to preserve or transfer work. Downloaded JSON and Markdown files contain names and notes you entered and may be sensitive client materials.

## Deploy on GitHub Pages

This app is static HTML, CSS and JavaScript with relative asset paths. **No build step or configuration is required for the app itself.**

1. Review and merge the AXIS LAB pull request into the repository's main branch.
2. Open the GitHub repository's **Settings > Pages**.
3. If GitHub Pages already deploys the root of the main branch, leave that existing configuration unchanged. If Pages is not configured, choose **Deploy from a branch**, branch **main**, folder **/ (root)** and save.
4. Open https://aiverse-filmmakers.github.io/hub/axis-lab/ after the Pages deployment finishes.

If this repository uses an existing GitHub Actions Pages pipeline instead of branch publishing, the pipeline must include the new axis-lab directory in its published artifact. Do not replace the existing site or pipeline just for this tool.

For local preview, from the repository root run:

    python3 -m http.server 8000

Then open http://localhost:8000/axis-lab/.

## Tests

Dependency-free Node smoke tests:

    node axis-lab/tests/smoke.cjs

They check initial state, shot capture, keyboard camera movement across the line, a 180-degree warning, saved shot positions, restoring and deleting setups, exporting Markdown and JSON, resetting, importing JSON and invalid import protection.

A GitHub Actions workflow runs this test for relevant changes. It does not touch the website deployment. Recommended manual browser check: select each placement button and tap the floor on a phone; drag all three handles on desktop and mobile; save multiple shots; review the cut flags; restore earlier coverage; export a Markdown brief; save/reopen project JSON and check the layout at mobile width.

## Why this tool

Reference-image and video-generation models can create strong individual shots, but spatial continuity and intentional cutting remain directing responsibilities. AXIS LAB applies established film craft to model-independent planning, complementing the repository's existing FRAMECHECK video review tool. AXIS LAB is for **before generation**; FRAMECHECK is for **after generation**.

The decision, 10-pass research log and competing ideas are documented in [RESEARCH.md](./RESEARCH.md).

## Sources and further reading

- Oklahoma State University, Introduction to Film and TV, Editing: https://open.library.okstate.edu/introfilmtv/part/editing/
- Adobe, Continuity editing: https://www.adobe.com/creativecloud/video/hub/ideas/what-is-continuity-editing-in-film.html
- Learn About Film, The 180 degree rule: https://learnaboutfilm.com/film-language/sequence/180-degree-rule/
- Blackmagic Design, DaVinci Resolve training: https://www.blackmagicdesign.com/products/davinciresolve/training
- Runway, Gen-4 image references: https://help.runwayml.com/hc/en-us/articles/40042718905875-Creating-with-Gen-4-Image-References
- Google Cloud, video prompting best practice: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/video/best-practice

These resources provide film and model-workflow context; none endorses AXIS LAB. The tool's warnings are simplified original educational checks.

## Technical notes

- Plain HTML, CSS and JavaScript
- SVG Pointer Events and keyboard-accessible performer and camera handles
- Signed cross product for camera-side classification
- Camera-right projection for approximate screen-order preview
- Per-shot state snapshots and adjacent-shot continuity checks
- Browser localStorage plus explicit Markdown and JSON exports

Built for the AI-Verse Filmmakers community. This README does not grant a separate reuse license.
