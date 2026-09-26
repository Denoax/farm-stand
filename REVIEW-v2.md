# Farm Stand v2 local review

## Review target

- Branch: `farm-stand-v2`
- Integrated website commit: `5e339ceecb7a6e11c44afc827e70da4b5d7df0d6`
- Base main commit: `893a48cacaf9d44ff995053d4334e5be8804c774`
- Preview: run `npm run preview -- --host 127.0.0.1`, then open `http://127.0.0.1:4173/farm-stand/`
- Publication state: local only; no push, merge, deployment, real order, payment, booking, message delivery, or analytics change was performed.

## Functioning scope

The approved sunlit hero, live apple/onion scene, typography, palette, and short stand-to-shop transition remain the opening. V2 adds seven clearly illustrative products across three categories, product details, an unavailable example, a multi-ID basket, bounded integer quantities, integer-money line totals/subtotal, removal/reset, and a collection preview that explicitly sends and reserves nothing.

Three manually selected and locally delivered farm-life photographs provide explicit hens/cattle/sheep choices with contextual links. Fictional visit hours, collection guidance, and access-note examples are separate from the real website-service explanation. The contact ending produces a copyable brief only; public identity, destination, scope, pricing, support, backend, and integrations stay unconfigured.

The production-path build retains static model/WebGL fallback, useful media failure states, reserved media dimensions, below-fold image deferral, offscreen renderer suspension, runtime reduced-motion changes, inert transition controls, keyboard dialog close/focus return, and responsive layouts through the checked widths.

## Validation and measurements

- `npm run build`: passed. Output includes 20.81 kB CSS, 250.46 kB main JS (77.98 kB gzip), and a lazy 615.02 kB FarmScene chunk (155.12 kB gzip). Vite reports its generic raw chunk-size warning.
- `npm run test:e2e`: 28/28 passed in Chromium projects at 1440×960 and 390×844. Coverage includes refresh/project paths; filters, details, basket operations and independence; collection preview; keyboard and dialog focus; 320/900/960-wide and 200% text layouts; reduced motion; model/WebGL/image/font failures; and renderer pause/resume.
- Production measurement: arrival 19 requests / 2,793,186 encoded bytes; full visited page 29 requests / 3,415,399 encoded bytes. No catalogue/farm-life media was requested at arrival. Observed CLS was 0.0143.
- Renderer measurement: 4 render calls before leaving the hero, still 4 after two offscreen samples, then 5 after return. The local renderer was SwiftShader software, so this is state evidence, not hardware or physical-device performance evidence.
- Evidence capture: zero console errors, page errors, or failed requests.
- Firefox, WebKit, physical-phone, hardware-accelerated GPU, screen-reader, and human usability checks were not available/performed in this pass.

## Selected evidence

- Matched opening: `evidence/v2-hero-before-desktop.png`, `evidence/v2-desktop-hero.png`, `evidence/v2-hero-before-portrait.png`, `evidence/v2-portrait-hero.png`
- Transition and shop: `evidence/v2-desktop-transition.png`, `evidence/v2-desktop-shop.png`, `evidence/v2-portrait-shop.png`
- Product and basket: `evidence/v2-desktop-product-detail.png`, `evidence/v2-desktop-basket.png`, `evidence/v2-portrait-basket.png`, `evidence/v2-desktop-collection.png`
- Story and service: `evidence/v2-desktop-farm-life.png`, `evidence/v2-portrait-farm-life.png`, `evidence/v2-desktop-visit.png`, `evidence/v2-desktop-service.png`, `evidence/v2-desktop-contact.png`
- Alternate flow: `evidence/v2-reduced-motion-flow.png`
- Recorded journey: `evidence/v2-end-to-end.webm`
- Runtime records: `evidence/capture-runtime-v2.json`, `evidence/production-measurements-v2.json`

These ignored files are local review evidence tied to the integrated website commit above; they are not self-approved visual baselines and should not be indiscriminately published.

## Asset record

Apple/onion catalogue crops derive from the existing project WebGL scene. New catalogue and farm-life photographs are locally delivered AVIF derivatives credited to Joao Teles, Ellie Burgin, MART PRODUCTION, Sophia Martin, Snappr, Eline Spee, Alina Vilchenko, and cottonbro studio under the Pexels free-use license. Exact source pages, hashes, acquisition date, and transformations are in `assets/manifest.json` and summarized in `ASSETS.md`.

## Five highest-impact remaining defects or decisions

1. The public brand, contact destination, commercial scope, pricing, support terms, backend, and any real integrations remain intentionally unconfigured; the preview cannot become a real enquiry/order channel without approved inputs and separate authorization.
2. The selected Pexels photos are coherent demonstration material, not authenticated imagery of a client, property, husbandry practice, or produce source. Final production art needs client approval or replacement.
3. Firefox, WebKit, physical-device, screen-reader, and hardware-accelerated GPU behavior is unverified; only local Chromium emulation and software rendering were available.
4. The lazy Three.js scene chunk is 615.02 kB raw and triggers Vite's generic 500 kB warning. The measured 2.79 MB enhanced opening remains below the requested 4 MB envelope, but further scene-code reduction is still the largest delivery optimization.
5. Typography, crops, service wording, and the complete page pacing have been inspected for significant failures but still need human visual/editorial approval. The captures are evidence, not an approved baseline.
