# Current state

## Approved direction

The user approved the sunlit farm-stand direction, the v2 expansion, and the v2.1 editorial/shop refinement. Preserve the current hero, rural setting, Fraunces/Source Sans 3 typography, wood/green/yellow palette, useful first frame, short stand-to-shop transition, static fallback, and explicit demonstration boundaries. The cancelled anatomy project is out of scope.

## Repository state

This is the existing public `Denoax/farm-stand` Git worktree and uses the existing GitHub Pages site at `https://denoax.github.io/farm-stand/`.

Standing publication authorization is active for this project. Completed website work follows: implement → inspect → test → commit → integrate into the current `main` history → push `main` → verify the associated Pages deployment → verify the live HTTPS website. Failed checks block publication. Local-only delivery is appropriate only when the user explicitly requests it.

The authorization covers coherent verified website changes and the existing Pages workflow. It does not enable real orders, payments, bookings, message delivery, analytics, purchases, credential changes, force-pushes, destructive history edits, or unrelated infrastructure changes. Deployment status remains separate from artistic approval.

## Current implementation

The v2.1 build retains the seven-product catalogue and refines it into a compact customer-facing shop. Apple and onion now use dedicated model renders; product copy, detail layouts, persistent add feedback, and the `Dozen eggs` styling-prop disclosure are explicit. The hens action reveals the egg product across filter states while preserving basket state and placing focus on the destination. The sourced farm-life profiles use subject-led copy and a lower hens crop. A local sample-hours interaction demonstrates an editable preview with reset while saving and publishing nothing.

Deterministic multi-item basket operations, quantity/removal/reset handling, integer-money totals, and the no-submission collection preview remain intact. Fictional visit information, the concrete website-service process, and the copy-only contact brief remain separate from farm-customer actions; the contact destination is unconfigured.

Below-fold media is intersection-deferred with reserved dimensions. The hero renderer pauses offscreen, resumes with current state, and retains model/WebGL and media-failure fallbacks. Inactive scroll-transition controls become inert; reduced motion uses ordinary document flow. Metadata, favicon, social image, asset provenance, and the `/farm-stand/` production path are present.

## Evidence checked

- Production build passes; Vite retains a raw-size warning for the lazy Three.js scene chunk.
- Playwright Chromium matrix passes 39 tests with one intentional desktop skip for the portrait-only first-card composition assertion. It includes direct anchors, 320 px, 900 px, short landscape, 200% text, keyboard/dialog behavior, delayed and failed media, rapid animal switching, filtered animal-to-product navigation, reduced motion, refresh, state independence, and renderer pause/resume.
- Firefox passed a portrait shop/detail smoke journey with no page errors. The project-local WebKit build is blocked by missing host libraries; no global packages were installed. Physical-device, hardware-accelerated, screen-reader, and human usability checks remain unperformed.
- Production-served measurement: arrival 2,794,279 encoded-body bytes with zero catalogue/farm-life requests; full visited page 3,399,281 encoded-body bytes. Observed CLS was 0.0143. A 30-run headless Chromium add-to-count measurement after three warm-ups was 32.5 ms median / 32.8 ms p95; it includes the next animation frame and is not INP. Headless SwiftShader is software rendering, not hardware evidence.
- Selected matched shop captures, details, farm-life views, a seven-product contact sheet, and an end-to-end recording are under ignored `evidence/`; they are local review evidence, not a human-approved baseline.

## Publication status

The site is published through the existing push-to-main GitHub Pages workflow. Deployment remains gated by the production build and browser suite. Each completed change must be verified at the live HTTPS origin for desktop and portrait rendering, refresh, catalogue/details, basket/collection, farm-life, visit/service/contact content, asset delivery, keyboard interaction, and console/network health.

## Open inputs and highest-impact limitations

- Public business/brand name, contact destination, commercial scope, pricing, support terms, backend, and integrations are not supplied; configuration keeps them inactive.
- The selected Pexels photography is licensed demonstration material, not verified client/property imagery.
- The lazy Three.js scene chunk is 615.02 kB raw (155.12 kB gzip), above Vite's generic chunk-warning threshold.
- Physical portrait-device, hardware GPU, WebKit, and screen-reader behavior remain unverified; Firefox coverage is a focused local smoke journey rather than the full matrix.
- Composition, photography, type, and copy still require human visual/editorial approval; local captures are not self-approved baselines.

## Next action

Future completed and verified website changes should follow the standing publication loop. A later pass may incorporate approved identity/contact inputs or human visual corrections, but must not activate orders, payment, contact delivery, analytics, or commercial integrations without new authorization.
