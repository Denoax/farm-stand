# Current state

## Approved direction

The user approved the sunlit farm-stand direction, the v2 expansion, the v2.1 editorial/shop refinement, and the v2.2 motion direction. Preserve the current hero, rural setting, Fraunces/Source Sans 3 typography, wood/green/yellow palette, useful first frame, reversible stand-to-shop handoff, static fallback, and explicit demonstration boundaries. The cancelled anatomy project is out of scope.

## Repository state

This is the existing public `Denoax/farm-stand` Git worktree and uses the existing GitHub Pages site at `https://denoax.github.io/farm-stand/`.

Standing publication authorization is active for this project. Completed website work follows: implement → inspect → test → commit → integrate into the current `main` history → push `main` → verify the associated Pages deployment → verify the live HTTPS website. Failed checks block publication. Local-only delivery is appropriate only when the user explicitly requests it.

The authorization covers coherent verified website changes and the existing Pages workflow. It does not enable real orders, payments, bookings, message delivery, analytics, purchases, credential changes, force-pushes, destructive history edits, or unrelated infrastructure changes. Deployment status remains separate from artistic approval.

## Current implementation

The v2.2 build retains the complete v2.1 shop and adds three coordinated motion systems. The live Three.js apple publishes its projected browser-space bounds to a reversible DOM bridge that travels into the real apple-card image while the overlapping catalogue enters normal document flow. Direct shop entry, reduced motion, missing target media, WebGL fallback, and preserved filter/basket state bypass or unwind the handoff safely.

Product details remain native dialogs and use an inert, aria-hidden image clone inside the top layer for measured card-to-dialog and dialog-to-card travel. Opening/closing interruption, Escape, focus return, resize, offscreen source, live reduced-motion changes, and immediate basket commits are handled independently of decorative motion. Remaining product cards use bounded FLIP position changes; successful adds may travel only when the basket target is visible, while feedback remains explicit.

Farm-life entry uses a non-pinned photographic-window reveal. Profile changes preload and decode before committing coherent copy/image/link state, keep at most two image layers, use latest-request-wins semantics, retain the prior profile on failure, and implement arrow/Home/End tab behavior with roving focus. The sample-hours preview uses a restrained masked value change.

Deterministic multi-item basket operations, quantity/removal/reset handling, integer-money totals, and the no-submission collection preview remain intact. Fictional visit information, the concrete website-service process, and the copy-only contact brief remain separate from farm-customer actions; the contact destination is unconfigured.

Below-fold media is intersection-deferred with reserved dimensions. The hero renderer pauses offscreen, resumes with current state, and retains model/WebGL and media-failure fallbacks. Inactive scroll-transition controls become inert; reduced motion uses ordinary document flow. Metadata, favicon, social image, asset provenance, and the `/farm-stand/` production path are present.

## Evidence checked

- Production build passes; current output is 26.01 kB CSS, 263.63 kB main JavaScript (81.60 kB gzip), and a lazy 616.25 kB Three.js scene chunk (155.59 kB gzip). Vite retains its generic raw chunk-size warning.
- Playwright Chromium matrix passes 50 applicable checks across desktop and portrait with two intentional cross-project skips. It adds projected handoff arrival/reversal, direct-entry bypass, detail interruption/resize/focus return, runtime reduced-motion settlement, animal load failure/latest-request behavior, arrow-key tabs, and portrait touch to the previous responsive, state, media-failure, and accessibility coverage.
- Firefox passes a portrait shop/detail/farm-profile smoke journey with no console or page errors. The project-matched WebKit build is present but blocked by missing host libraries; no system dependencies or global configuration were installed. Physical-device, hardware-accelerated, screen-reader, and human usability checks remain unperformed.
- Production-served measurement at v2.2: arrival 2,798,326 encoded-body bytes with zero catalogue/farm-life requests; full visited page 3,403,328 encoded-body bytes; observed CLS remains 0.0143. Relative to v2.1, both transfer totals increase by 4,047 bytes (about 0.14% arrival).
- Headless Chromium/SwiftShader handoff measurement after a warm-up produced 49.9/33.4/33.4 ms median frame intervals across three 48-sample runs; p95 was 66.6/66.7/50.1 ms. These software-renderer frame intervals are not GPU timings or physical-device evidence. Observed detail travel was 593.9 ms open and 403.7 ms close.
- Normal-speed local recordings and selected desktop/portrait captures report zero console errors, page errors, or failed requests. They remain review evidence, not approved visual baselines.
- Selected matched shop captures, details, farm-life views, a seven-product contact sheet, and an end-to-end recording are under ignored `evidence/`; they are local review evidence, not a human-approved baseline.

## Publication status

The site is published through the existing push-to-main GitHub Pages workflow. Deployment remains gated by the production build and browser suite. Each completed change must be verified at the live HTTPS origin for desktop and portrait rendering, refresh, catalogue/details, basket/collection, farm-life, visit/service/contact content, asset delivery, keyboard interaction, and console/network health.

## Open inputs and highest-impact limitations

- Public business/brand name, contact destination, commercial scope, pricing, support terms, backend, and integrations are not supplied; configuration keeps them inactive.
- The selected Pexels photography is licensed demonstration material, not verified client/property imagery.
- The projected handoff deliberately transfers visual ownership from the live mesh to its catalogue render; it does not keep one live WebGL mesh moving through DOM top-layer space. Human motion review remains authoritative for whether that matched transfer is sufficiently seamless.
- The lazy Three.js scene chunk is 616.25 kB raw (155.59 kB gzip), above Vite's generic chunk-warning threshold.
- Physical portrait-device, hardware GPU, WebKit, and screen-reader behavior remain unverified; Firefox coverage is a focused local smoke journey rather than the full matrix. SwiftShader frame pacing is not evidence of hardware performance.
- Composition, photography, type, and copy still require human visual/editorial approval; local captures are not self-approved baselines.

## Next action

Future completed and verified website changes should follow the standing publication loop. A later pass may incorporate approved identity/contact inputs or human visual corrections, but must not activate orders, payment, contact delivery, analytics, or commercial integrations without new authorization.
