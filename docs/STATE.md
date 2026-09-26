# Current state

## Approved direction

The user approved the sunlit farm-stand direction and the v2 local expansion. Preserve the current hero, rural setting, Fraunces/Source Sans 3 typography, wood/green/yellow palette, useful first frame, short stand-to-shop transition, static fallback, and explicit demonstration boundaries. The cancelled anatomy project is out of scope.

## Repository state

This is the existing `Denoax/farm-stand` Git worktree. Local development is on `farm-stand-v2`, based on main commit `893a48cacaf9d44ff995053d4334e5be8804c774`. Main is not being merged or deployed by this pass.

## Current implementation

The integrated v2 build adds a seven-product catalogue, filters and details, deterministic multi-item basket operations, quantity/removal/reset handling, sample totals, and a no-submission collection preview. It also adds three sourced-photography farm-life profiles, clearly fictional visit information, a concrete website-service process, and a copy-only contact brief whose destination remains unconfigured.

Below-fold media is intersection-deferred with reserved dimensions. The hero renderer pauses offscreen, resumes with current state, and retains model/WebGL and media-failure fallbacks. Inactive scroll-transition controls become inert; reduced motion uses ordinary document flow. Metadata, favicon, social image, asset provenance, and the `/farm-stand/` production path are present.

## Evidence checked

- Production build passes; Vite retains a raw-size warning for the lazy Three.js scene chunk.
- Playwright Chromium matrix passes 28/28 at 1440×960 and 390×844, including 320 px, 900 px, short landscape, 200% text, keyboard/dialog behavior, failures, reduced motion, refresh, asset paths, state independence, and renderer pause/resume.
- Measured enhanced opening: 2,793,186 encoded bytes with zero catalogue/farm-life requests at arrival; full visited page: 3,415,399 encoded bytes. Observed CLS was 0.0143. Headless SwiftShader is software rendering, not hardware evidence.
- Selected desktop/portrait captures and an end-to-end recording are under ignored `evidence/`; they are review evidence, not a human-approved baseline.
- Firefox, WebKit, physical-device, hardware-accelerated, and assistive-technology checks remain unperformed because only Chromium is locally installed for this pass.

## Open inputs and highest-impact limitations

- Public business/brand name, contact destination, commercial scope, pricing, support terms, backend, and integrations are not supplied; configuration keeps them inactive.
- The selected Pexels photography is licensed demonstration material, not verified client/property imagery.
- The lazy Three.js scene chunk is 615.02 kB raw (155.12 kB gzip), above Vite's generic chunk-warning threshold.
- Physical portrait-device, hardware GPU, Firefox/WebKit, and screen-reader behavior remain unverified.
- Composition, photography, type, and copy still require human visual/editorial approval; local captures are not self-approved baselines.

## Next action

Review `REVIEW-v2.md`, its machine summary, the selected stills, and the end-to-end recording. A later pass may incorporate approved identity/contact inputs or human visual corrections, but must not activate orders, payment, contact delivery, analytics, deployment, or commercial integrations without new authorization.
