# BLOCK & BLOOM — Rescue Crew

A standalone Blox-style edition of the twelve-world garden rescue puzzle. Original garden files remain in `../little-miners/`; this project has a separate save namespace.

## Play and import

- Open `Block-and-Bloom_Play.html` in a modern WebGL-enabled browser. All runtime code and the font are embedded. The single-file edition uses native ES modules/import maps; no server assets or CDN are needed.
- Editable project entry: root `index.html`. Serve it over HTTP/HTTPS rather than opening the modular entry with file://.
- Node 18+: `npm run dev` (or `npm start`). No npm packages, API keys, backend or installation are required.
- Default address: `0.0.0.0:3000`. Set `PORT` / `HOST` or use `--port` / `--host` to suit the platform.
- `npm run build` copies the modular game into `dist/`; `npm run preview` serves that output.
- `npm run standalone` rebuilds the embedded HTML with the Node standard library.
- For Eazo, import the entire ZIP as a project and paste `EAZO_PROMPT.txt`. Local verification does not mean the game has been imported or published on a platform.

## Controls

Choose Dig, Rescue, Move, Build or Fill; select a tile/animal/equipment, inspect the explanation, then confirm. Auto crew distributes jobs across Pip, Rusty and Sprout. Select a crew portrait to give that helper a job. Camp recalls everyone. Completed animal, water and wheel goals plus all three helpers at HQ finish a world.

- Phone/tablet touch: drag to pan, pinch to zoom. Hold for 320 ms to magnify the target; slide to aim, release to select, then confirm the job. Fit island restores an overview.
- Desktop mouse: click to select, drag the map to rotate. Camera buttons rotate, zoom and fit the island.
- Mobile HUD: compact live goals expand for full targets; crew and tools stay within thumb reach; pause contains sound, speed and the field guide. Portrait and landscape use separate layouts and safe-area spacing.
- Keyboard: 1–5 tools, Enter confirm, Q/E rotate, Esc pause, Ctrl/Command+Z undo, H photo mode.
- No timer. Undo restores terrain, animals, water and jobs; Fill repairs over-dug ground.

## Mobile v1.1

The phone view enlarges the playable island, places its optical center within the free map area, and keeps the raycast aligned with the displayed terrain. Single-finger pan and two-finger pinch have separate gesture states; lifting a finger after a pinch cannot submit a terrain tap. Cancelled touches and focus loss clear the session. Selection and construction remain separate actions. Existing campaign saves and all twelve maps/rules are preserved.

## What changed

- New original beveled block miners with articulated arms, gloves, helmets, glasses, backpacks and tools.
- New original block mole and groundhog characters with independent head, blink and breathing animation. Existing pickup, carrying and set-down timing remains.
- Fitted meadow tiles, layered clay sides, square sprouts/flowers, rock clusters and a cream/coral workshop plinth.
- Striped rescue station, bridge/gate/pump/wheel color kit, blue water and block debris.
- English title, objectives, twelve world descriptions, tooltips, guide, pause, win and selection interfaces; matching block portraits and responsive controls.
- Twelve original maps and their rules are preserved. Gameplay saves use `block-and-bloom-campaign-v1`, separate from the original garden edition.

The new art is authored local Three.js geometry. Runtime module sources include editable dimensions, palettes and pivots; no paid asset or model-generation service is required. This is an original block-toy design, with no Roblox branding or borrowed characters.

## Verification

- `npm test`: 48 checks passed: 42 existing rule/progression/save checks plus 6 mobile gesture/camera checks, including complete routes through all twelve worlds.
- `npm run check:art`: executed with Node 24. Checks 24 fresh/edited terrain states, all 99 tile rays per state, 12 facility states, and 7 model/rig cases. Includes finite transforms, pool capacities and animal/hand contact. Geometry checks are not browser screenshots.
- Browser: desktop actual input completed world 1; all three helpers took jobs, both animal deliveries counted and recalling the crew produced the win screen. Mobile-sized browser UI switched worlds, built a bridge and undid it. World 12 objectives and water rendering were inspected at 390 × 844. Modular and embedded editions loaded without console errors during these checks.
- Mobile v1.1 browser checks used an isolated local test origin, preserving the player’s preview save. At 390 × 844, actual input panned without rotation, held a block to magnify/select without construction, then confirmed a valid job and completed one dig. World 12 compact/expanded water and wheel goals and 844 × 390 landscape were inspected. See `artifacts/mobile-v1.1/evidence.md`.
- Physical phone hardware, multi-touch on a device, device FPS and the target platform runtime have not been tested. The provided screenshots are actual browser captures, not generated reference images.

## Licenses

Three.js and helpers: MIT (`vendor/LICENSE`). Meadow Hand is an OFL-1.1 subset derived from Xiaolai (`src/assets/fonts/OFL-Xiaolai.txt`, `SOURCE.txt`). The standalone embeds these notices as well. New models, UI, geometry and material kit are authored for this project.
