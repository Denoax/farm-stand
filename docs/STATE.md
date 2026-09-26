# Current state

## Approved direction

The user approved the sunlit farm-stand direction, the v2 through v2.4 expansions, and the focused independent-review correction pass. The current implementation preserves the rural setting, Fraunces/Source Sans 3 typography, wood/green/yellow palette, seven-product catalogue, product detail transition, accessibility fallbacks, and explicit demonstration-only boundaries. The correction pass addresses the reviewed poster/live mismatch, exposed orchard edit, portrait stand alignment, animal crops, sheep cutout, repeated weather-to-hens introduction, header contrast, and implementation-oriented public copy. The cancelled anatomy project remains out of scope.

## Repository and publication policy

This is the existing public `Denoax/farm-stand` worktree and deploys through its existing GitHub Pages workflow to `https://denoax.github.io/farm-stand/`.

Standing publication authorization remains active: implement → inspect → test → commit → safely integrate into current `main` → push `main` → verify the associated Pages deployment → verify the live HTTPS website. Failed checks block publication. This does not enable real orders, payments, bookings, message delivery, analytics, purchases, credential changes, force-pushes, destructive history changes, or unrelated infrastructure.

## Current implementation

The opening is a reversible scroll story. A live CC0 Three.js apple begins at the project-original orchard branch at a fixed within-shot scale, releases along authored progress-derived keyframes, falls behind a clean opaque wicker front rim, lands with contact support, and settles. A full-frame photographic orchard plate crosses the viewport and completely conceals the discrete location/scale edit; a captured complete-stand plate supplies the destination immediately even when rendering or scroll input is interrupted. The desktop and portrait first-paint posters are now generated from the matching live opening composition, and the portrait crate/produce plate is grounded on the table. The decorative basket never touches commerce state. Direct Shop entry bypasses the sequence; model/WebGL failure retains the static poster and full HTML journey; reduced motion presents the established stand in ordinary document flow.

The catalogue retains seven products, filters, source-card-to-detail image motion, immediate add feedback, keyboard/Escape focus return, and the no-commerce boundary. Its colour roles, filter hierarchy, card treatment, and featured mixed box are tightened without changing product data or integer-money logic. The basket remains a native-dialog right drawer on desktop and is now a true full-viewport drawer on portrait. It has one scroll region, a fixed summary/action area, labeled steppers, remove plus one-step undo, clear confirmation, same-surface collection preview, and a persistent basket action. Validated basket state survives close/reopen, navigation, scene motion, viewport changes, and refresh in the current browser tab through bounded `sessionStorage`; invalid or unavailable storage safely falls back to an empty in-memory demo.

A short muted Pexels rain passage connects the shop directly to the hens setting. On portrait, its resolved 58/42 image-and-copy geometry matches the first hens frame instead of returning through a separate introduction. Hens and cattle keep the subjects clear of copy in bounded portrait image regions, while sheep now uses one continuous photographic layer without the mismatched circular duplicate. Only crop, camera, foreground, and copy layers move; the depicted animals are never distorted to fake anatomy. Direct hashes prepare the relevant image immediately, adjacent scenes remain lazy, and useful text fallbacks remain in place. A visible Pause motion control complements the system reduced-motion preference and responds to preference changes at runtime.

Fictional visit information, the concrete website-service process, sample-hours editor, and copy-only contact preview remain unconfigured. Public-facing copy describes the example and service without exposing implementation or review language. No order, payment, reservation, booking, message, or analytics path exists.

## Validation and evidence

- Production build output: 48.38 kB CSS (10.85 kB gzip), 260.48 kB main JavaScript (80.09 kB gzip), and a lazy 615.97 kB Three.js scene chunk (155.50 kB gzip). Vite retains its generic raw chunk-size warning.
- All 38 Playwright checks pass across desktop and portrait. The suite covers stable apple scale and landing stages, fully covered forward/reverse/rapid orchard edits, direct entry/refresh, desktop/portrait/320 px/short-landscape layouts, full-width portrait drawer operations and preservation, detail interruption/focus, weather pause/skip/failure, addressable animal scenes, fictional boundaries, initial and runtime reduced motion, 200% text reflow, renderer pausing, model/media failures, and overflow.
- Normal-speed portrait and edit-interruption recordings, supplied before frames, matched corrected frames, contact sheets, and capture logs live under ignored `evidence/v2.4-corrections/Farm-Stand-v2.4-Correction-Review/`. Iris CLI captures independently confirm the opening and portrait hens composition. These are review evidence, not self-approved visual baselines.
- The v2.4 delivery adds a transparent basket, two replacement animal photographs, a seven-second rain clip/poster, and two complete hero fallback posters. Provenance, exact hashes, and transformations are in `assets/manifest.json`; raw sources remain ignored.
- Production-served measurement recorded 3,360,669 encoded bytes at arrival and 3,883,995 after the complete page visit, zero initial catalogue/farm-life requests, and 0.01095 observed CLS. The hero renderer stopped producing frames while offscreen and resumed on return.
- Three warm-headless SwiftShader hero traversals produced 16.7 ms median frame intervals and 33.4–50 ms p95 intervals; observed product-detail travel was about 585 ms open and 381 ms close. These are end-to-end software-renderer intervals, not GPU timings or physical-device evidence.

## Highest-impact limitations

- Public identity, contact destination, commercial scope, pricing, support terms, backend, and integrations are not supplied and remain inactive/configurable.
- Pexels photographs and project-generated harvest layers are illustrative and do not depict a client or verified property.
- The hero’s lazy Three.js chunk remains above Vite’s generic 500 kB raw advisory. It is off the main bundle and pauses when offscreen, but a later measured optimization pass could consider deeper module splitting.
- The seven-second decorative weather clip uses a 146 kB observed range during the measured journey, but its full delivered file is about 1.2 MB; a real client could choose a longer or property-specific passage after content and network budgets are known.
- Physical-device, hardware-GPU, screen-reader, background-tab, and independent human art-direction reviews remain outstanding. Browser captures and publication do not constitute artistic approval.

## Next action

For completed coherent work, follow the standing publication loop and verify the exact deployed commit on the live HTTPS origin. Do not stop at local readiness unless the user explicitly requests local-only work.
