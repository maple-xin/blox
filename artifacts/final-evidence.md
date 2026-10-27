# BLOCK & BLOOM — Reskin verification (v1.0 archive)

## Delivered direction
Independent Blox edition of the existing 12-world game. New beveled block miners, block animals, fitted terrain, flowers, rocks, rescue station, plinth, equipment palette, water colors and debris. Full English UI and level text. Original little-miners runtime files were compared with the earlier v0.10.2 export and remained identical (see original-preserved.json). New save namespace is independent.

## Implementation
Local Three.js authored geometry with merged vertex-color parts and instanced repeated terrain/foliage. No external generation jobs, paid APIs, remote assets, or API keys. Native import-map standalone packaging uses Node standard library. Blender was not needed for this explicitly geometric art pass.

## Checks actually executed

| Check | Result |
| --- | --- |
| Gameplay / progression / persistence | 42 passed, 0 failed; includes complete solutions across all 12 worlds |
| Terrain visual/rule alignment | 24 fresh/edited states, 99 pick rays each; finite transforms and pool bounds |
| Facilities | 12 worlds: geometry, water tile picking and bridge heights checked |
| Models / animations | 7 cases: 3 miners, 2 animals, camp and rocks; all miner actions plus carried-animal support checked |
| Camera | 32 views / 3168 rays; four quarter turns at four viewport shapes, two representative maps |
| Desktop actual input | Selected real tiles 4, 8, 96; all three helpers took digging jobs; rescued both animals; recalled crew; observed World 1 win modal |
| Phone-sized browser | 390 × 844: cover, world selector, World 12 goal panel, camera and tool controls inspected. World 5 upper bridge built, then undo restored the kit |
| Standalone | Embedded HTML loaded and rendered in the browser without console errors. All 19 module dependencies and font are embedded |
| Browser errors | No console error/warning messages during the final observed flows |

Source tests and geometric checks are not a substitute for the browser flows above. Phone size means a resized browser viewport, not physical phone hardware.

## Render observations
During World 1 active gameplay at 1112 × 720: about 51 draws, 191,608 triangles, 65 geometries and 6 textures; observed p50 around 16.7ms and p95 around 17.6ms on this desktop. A completed round used about 48 draws / 187,360 triangles. These are not physical-phone FPS results or a worst-case guarantee. Terrain CPU peak: 148,152 triangles; facility CPU peak: 43,072 triangles.

## Actual browser captures
- screenshots/desktop-cover.png
- screenshots/desktop-rescue.png
- screenshots/desktop-win.png
- screenshots/desktop-bridge.png
- screenshots/mobile-cover.png
- screenshots/mobile-workshop.png

No generated image is used as gameplay proof. The L5 bridge screenshot is the main visual review image. The phone captures confirm 390 × 844 layout; their image sizes were verified.

## Packaging and limitations
The Eazo ZIP is a clean root-level project with index.html, local modules/assets, no-dependency start/build scripts, the standalone HTML, notices, verification summary and reference captures. It contains no personal save, private reference media, account credentials or old versions. ZIP integrity and SHA256 checks are required at creation.

No Eazo/Loopit import or publication was performed. Physical-phone performance, sound output on physical hardware and platform-specific embedding remain unverified. The game retains its existing synthesis SFX; this request did not add a new score.
