# Current state

## Approved direction

The user approved the sunlit farm-stand direction and the v2 local expansion. Preserve the current hero, rural setting, Fraunces/Source Sans 3 typography, wood/green/yellow palette, useful first frame, short stand-to-shop transition, static fallback, and explicit demonstration boundaries. The cancelled anatomy project is out of scope.

## Repository state

This is the existing public `Denoax/farm-stand` Git worktree and uses the existing GitHub Pages site at `https://denoax.github.io/farm-stand/`.

Standing publication authorization is active for this project. Completed website work follows: implement → inspect → test → commit → integrate into the current `main` history → push `main` → verify the associated Pages deployment → verify the live HTTPS website. Failed checks block publication. Local-only delivery is appropriate only when the user explicitly requests it.

The authorization covers coherent verified website changes and the existing Pages workflow. It does not enable real orders, payments, bookings, message delivery, analytics, purchases, credential changes, force-pushes, destructive history edits, or unrelated infrastructure changes. Deployment status remains separate from artistic approval.

## Current implementation

The integrated v2 build adds a seven-product catalogue, filters and details, deterministic multi-item basket operations, quantity/removal/reset handling, sample totals, and a no-submission collection preview. It also adds three sourced-photography farm-life profiles, clearly fictional visit information, a concrete website-service process, and a copy-only contact brief whose destination remains unconfigured.

Below-fold media is intersection-deferred with reserved dimensions. The hero renderer pauses offscreen, resumes with current state, and retains model/WebGL and media-failure fallbacks. Inactive scroll-transition controls become inert; reduced motion uses ordinary document flow. Metadata, favicon, social image, asset provenance, and the `/farm-stand/` production path are present.

## Evidence checked

- Production build passes; Vite retains a raw-size warning for the lazy Three.js scene chunk.
- Playwright Chromium matrix passes 28/28 at 1440×960 and 390×844, including 320 px, 900 px, short landscape, 200% text, keyboard/dialog behavior, failures, reduced motion, refresh, asset paths, state independence, and renderer pause/resume.
- Measured enhanced opening: 2,793,186 encoded bytes with zero catalogue/farm-life requests at arrival; full visited page: 3,415,399 encoded bytes. Observed CLS was 0.0143. Headless SwiftShader is software rendering, not hardware evidence.
- Selected desktop/portrait captures and an end-to-end recording are under ignored `evidence/`; they are review evidence, not a human-approved baseline.
- Firefox, WebKit, physical-device, hardware-accelerated, and assistive-technology checks remain unperformed because only Chromium is locally installed for this pass.

## Publication status

The v2 site is published through the existing push-to-main GitHub Pages workflow. Its gated production build and browser suite passed before deployment, and the live HTTPS origin was verified afterward for desktop and portrait rendering, refresh, catalogue/details, basket/collection, farm-life, visit/service/contact content, asset delivery, keyboard interaction, and console/network health.

## Open inputs and highest-impact limitations

- Public business/brand name, contact destination, commercial scope, pricing, support terms, backend, and integrations are not supplied; configuration keeps them inactive.
- The selected Pexels photography is licensed demonstration material, not verified client/property imagery.
- The lazy Three.js scene chunk is 615.02 kB raw (155.12 kB gzip), above Vite's generic chunk-warning threshold.
- Physical portrait-device, hardware GPU, Firefox/WebKit, and screen-reader behavior remain unverified.
- Composition, photography, type, and copy still require human visual/editorial approval; local captures are not self-approved baselines.

## Next action

Future completed and verified website changes should follow the standing publication loop. A later pass may incorporate approved identity/contact inputs or human visual corrections, but must not activate orders, payment, contact delivery, analytics, or commercial integrations without new authorization.
