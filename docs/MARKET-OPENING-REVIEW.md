# Treatment A — production review

## Decision

Treatment A, “The market opens,” is implemented as the default opening. It uses one continuous farm-stand world: a prepared desktop/portrait stand plate behind a small live Three.js threshold set. A supported CC0 apple, counter, shutter slats, braces, rails, warm spotlight, close-passing timber underside, iron straps, and bolts share one camera and one progress evaluator. The app does not crossfade unrelated compositions.

The implementation is ready for independent visual review, not permanent artistic approval. The strongest reason to reject it is the deliberately dark 48–66% close passage: it reads as physical timber and fully protects the recomposition, but its simplified live geometry and brief low-detail field may still feel less materially rich than the prepared destination plate. Software-renderer cadence is also materially uneven; physical-device GPU review remains outstanding.

## Six-shot implementation

| Progress | Shot | Presented result |
| --- | --- | --- |
| 0–12% | Light | Warm light and narrow slat gaps establish a supported red apple on the counter. |
| 12–28% | Lift | The braced shutter rises as one rigid assembly in its side rails. |
| 28–48% | Threshold | The same field, shelter, counter, and right-side produce arrangement are progressively revealed. |
| 48–66% | Passage | A near timber underside with iron strap and bolts fully covers the changed region; the apple is recomposed only while covered. |
| 66–84% | Open | The prepared stand is fully visible and the live apple settles on the deliberately clear counter area. |
| 84–100% | Rest | The open composition holds before ordinary document flow reaches the unchanged shop. |

Requested scroll progress lives in `App.tsx`; the scene evaluator in `src/scene/marketOpeningShot.ts` derives the six states. `FarmScene.tsx` renders one requested state and reports it as presented only after drawing. CSS and accessible visibility follow presented progress, preventing a loading or rendering lag from exposing a different visual/copy state.

## Responsive composition

Desktop and portrait use separate prepared plates. Portrait is a same-set recomposition rather than a mechanical crop: its taller shelter and field remain legible, right-side produce stays supported, and the left/lower counter remains clear for the live apple. Live camera and apple positions are explicitly selected by the portrait breakpoint.

First-paint posters are deterministic captures of the actual initial live composition. The open plate is suppressed until the scene is ready, and the first live frame is drawn before the poster is removed. WebGL/model failure falls back to the retained empty-stand plate and full HTML content. New-plate failure follows the same complete static fallback. Reduced motion shows the final open plate in ordinary document flow and omits the live stage and motion control.

## Preserved and retired

- Preserved without business-rule changes: seven-product catalogue, product details, basket reducer, integer money, session persistence, quantity/undo/clear/preview flows, keyboard and Escape behavior, direct hashes, farm-life chapters, fictional service/contact boundaries, source records, and Pages workflow.
- Retired from the default presentation: the falling-apple orchard chain and the separate weather chapter. Their source/history remain in Git; no production history was rewritten.
- No real stock, order, reservation, payment, contact delivery, analytics, or external write was added.

## Source and reuse record

- Visual-world source: retained project-generated `farm-setting-v1.png`.
- Prepared destination plates: project-original OpenAI image edits using that source as the strict camera/light/set reference. Exact production requests, source hashes, derivative hashes, and transformations are recorded in `assets/source/generated/PROMPT.md`, `ASSETS.md`, and `assets/manifest.json`.
- Live apple: Oliver Harries, Poly Haven, CC0, existing pinned local glTF and textures.
- Wood map: existing project-generated `public/media/crate-wood.webp` crop.
- Runtime: existing pinned Three.js dependency and original project code/primitives. No code or media was copied from the researched reference sites.

## Review evidence

Evidence is intentionally ignored from Pages delivery under `evidence/market-opening/`.

- Matched old opening: `before/live-root-desktop.png`, `before/live-root-portrait.png`.
- Matched new opening: `final/after-root-desktop.png`, `final/after-root-portrait.png`.
- Direct shop comparison: `before/live-shop-desktop.png`, `before/live-shop-portrait.png`, `final/after-shop-desktop.png`, `final/after-shop-portrait.png`.
- Threshold stills: `final/desktop-lift.png`, `final/desktop-passage.png`, `final/desktop-open.png` and portrait equivalents.
- Full traversals: `final/recordings/desktop-normal-speed.webm`, `final/recordings/portrait-normal-speed.webm`.
- Interruption/loading: `final/interruptions/loading-poster-desktop.png`, `model-failure-desktop.png`, `image-failure-portrait.png`, `reduced-motion-portrait.png`, and `rapid-reversal-desktop.webm`.

## Validation and tradeoffs

- Build: TypeScript and Vite production build pass. The lazy Three.js chunk remains above Vite’s generic 500 kB raw warning.
- Browser behavior: 38 Playwright checks run in desktop and portrait projects, covering all six shots, requested/presented agreement, rapid reversal, pause/navigation, direct hashes, catalogue/basket regression, reduced motion, rendering pause/resume, failed models, failed opening images, 320 px/short layouts, and 200% text reflow.
- Local software-renderer measurement: initial media encoded body was 978,899 bytes, zero video, no initial catalogue/farm-life requests, CLS 0.00883, 31 opening draw calls, 14,400 triangles, and verified offscreen render suspension/resume.
- Three warmed SwiftShader traversals produced median frame intervals of 16.8–33.3 ms, p95 of 66.7–83.4 ms, and 83.4–100 ms maxima. These are end-to-end headless software-renderer intervals, not GPU timings or physical-device evidence. The representation intentionally retains antialiasing, soft shadows, 1.5 DPR cap, textured timber, hardware, and the live apple because removing them would materially weaken the assigned visual treatment.

## Remaining material limitations

- No physical-phone, hardware-GPU, screen-reader, Safari, or independent human art-direction review has occurred.
- The generated stand plates are illustrative and do not depict a verified client property or inventory.
- The close-passage timber is effective in motion but is less detailed than the prepared photographic plate.
- The pause control freezes the presented opening state and resumes to current scroll intent; it does not create a separate animation timeline.
- Publication and browser captures establish deployment and technical behavior, not permanent artistic approval.
