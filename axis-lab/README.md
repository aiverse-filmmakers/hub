# AXIS LAB

**A scene-blocking and cut-continuity director for AI filmmakers.**

Stage up to eight performers, see their apparent sizes change with camera distance, measure planned ground distances, save numbered positions and export your camera diagram as a PNG before generating video.

**Live GitHub Pages app:** https://aiverse-filmmakers.github.io/hub/axis-lab/

AXIS LAB lives entirely inside this directory. It does not replace or alter the repository's existing website, FRAMECHECK or any other application.

## Features

- **Distance-based perspective preview:** Subjects closer to the camera appear larger; farther people shrink naturally, shift towards the horizon and can be hidden behind a nearer subject. The camera automatically looks toward the centre of the cast.
- **Meter-calibrated stage:** Each visible floor grid square equals the selectable **0.5 m, 1 m or 2 m**. Planned ground distances are shown for the camera to every subject and the first two subjects to one another. An annotated metric ruler is visible at the bottom of the floor plan.
- **Flexible subjects:** Start with two, add up to eight, rename or remove any performer. The first two subjects define the editable action axis; with only one subject the axis preflight is suppressed.
- **Quick position tabs:** Click **+ Position** above the preview to capture a numbered shot. Tap **1, 2, 3** and so on to switch shots, then move markers to update that saved position. The detailed coverage filmstrip remains below.
- **One-click PNG:** **Save position diagram** creates a local 1700 × 950 PNG with floor plan, calibrated scale, cast, camera, perspective preview and ground-distance labels. On supported mobile browsers it opens the system share sheet; otherwise it downloads a PNG.
- **Continuity preflight:** Adjacent shots are checked for action-axis crossing, ambiguous near-axis cameras, changes in cast or blocking, and overly similar coverage.
- **Portable files:** Copy/download the Markdown production brief, save/edit/import JSON project backups, and keep the working state automatically on this browser.

There are no uploads, accounts, remote scripts, AI model calls or fees. The app is a planning tool and does not generate footage.

## Phone quick start

1. Open the app, set a scene name and add or rename subjects if needed.
2. For a smaller or larger set, choose **Metres per grid square**. The default is **1 m** per square.
3. Under **Floor plan**, choose **A**, **B**, any added subject, or **Camera**. Tap the floor to place them, or drag the labelled marker.
4. In **Camera preview**, move the camera and the performers at different depths to see near subjects grow larger and far ones shrink. Check the live ground distances underneath.
5. Tap **+ Position** just above the preview to create shot **1**. Move the camera and create shot **2**. Select numbered tabs to revisit and edit shots.
6. Tap **Save position diagram** to save/share a PNG showing the spatial arrangement, scale, preview and measured plan distances.
7. Export the Markdown brief or a JSON backup if you want to share your plan or work on another device.

**Scale accuracy:** The grid is a user-defined *planning assumption*, not a rangefinder. If you choose 1 m per 80-unit square, a subject 160 units from camera is displayed as 2.0 m away horizontally. Set the size according to actual known measurements for a more useful previsualization. Distances are on the ground plane and do not include camera height.

**Perspective accuracy:** The camera preview uses a simplified pinhole-perspective model, approximate horizontal fields of view for Wide/Medium/Close, fixed 1.7 m subject heights and 1.6 m camera height. Moving closer increases apparent height and width. These numbers are educational defaults, not calibrated lenses, a full 3D scene or measured heights. A subject behind the camera will not be shown.

**Shot editing:** With a numbered position selected, subsequent placement and camera changes update that position. Press + to make another position. Older AXIS LAB v1 JSON backups and saved browser projects load in the new format.

**Directing principle:** Crossing the 180-degree line is not automatically an error. The tool calls attention to potential screen-direction reversal, not a creative prohibition.

## What the continuity checks mean

| Flag | Detection | Director's decision |
| --- | --- | --- |
| Possible 180-degree crossing | Two consecutive cameras appear on different sides of their performers' action axes | Decide whether the reversal is intentional; consider matching geography, showing the move or inserting a neutral angle |
| Camera near axis | Camera appears close to the performer-to-performer line | Check the actual eyelines and left/right relationships |
| Blocking changed | One or more performers were repositioned significantly between snapshots | Verify that the action accounts for the movement or restore the same blocking |
| Similar coverage | Consecutive shots share nearly identical camera placement and shot size | Ask what the cut adds and consider differentiated coverage |

**Limitations:** All flags are geometric heuristics for a manually constructed schematic, not verified video defects or automated editorial judgments. The preview uses depth-correct relative scaling within a simplified perspective model, not a lens-accurate 3D environment. The metre scale depends on user calibration; these are estimated planned dimensions rather than real measured distances. Real editing still requires a visual and sound review. Actor movement, over-the-shoulder views, motivated axis crossing and camera motion can all justify exceptions to these rules.

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

They check initial state, iPhone-style touch placement, metres and depth scaling, adding/removing cast, numbered position editing, PNG export, Markdown and JSON, version-1 project migration and invalid-import protection.

A GitHub Actions workflow runs this test for relevant changes. It does not touch the website deployment. Recommended manual browser check: change the metre calibration, move a subject farther from the camera, add and remove a third subject, create several numbered positions, export the PNG on iPhone, restore an earlier position, import a legacy JSON backup, and check the responsive layout.

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
- Perspective projection with depth-based subject sizing and depth ordering (conceptual 1.7 m subjects and 1.6 m camera)
- Per-shot state snapshots and adjacent-shot continuity checks
- Calibrated 80-unit floor-grid conversion to planned metres
- Local Canvas PNG renderer, mobile share fallback, browser localStorage and Markdown/JSON exports

Built for the AI-Verse Filmmakers community. This README does not grant a separate reuse license.
