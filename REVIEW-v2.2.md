# Farm Stand v2.2 motion review

## Review target

- Branch: `farm-stand-v2-2`
- Feature commit: `791adac2e4316dc287eee840ff40181c16b6defa`
- Base/deployed predecessor: `d2e43a524d751600fb5b4f4eb906bdf06bd644cc`
- Preview: run `npm run preview -- --host 127.0.0.1`, then open `http://127.0.0.1:4173/farm-stand/`
- Publication target: the existing `main` branch and GitHub Pages workflow. The exact integrated/deployed commit and run belong in the delivery report because this review is stored inside that commit.

## Implemented motion system

The sunlit hero, scenery, products, catalogue, basket, farm-life photography, copy, and demonstration boundaries remain intact. The catalogue now overlaps the final hero viewport in ordinary document flow. The Three.js scene projects the live apple's bounds into browser coordinates; a single inert DOM bridge takes visual ownership, expands from a tight apple crop, and lands on the actual apple-card picture. The path is scroll-evaluated and reversible. Direct `#shop`, reduced motion, missing card media, filtered-out apple state, and WebGL fallback do not depend on the bridge.

Product detail opening measures its actual card picture before state changes, then moves an inert image clone inside the native dialog top layer to the committed destination. Closing reverses to a connected visible source; otherwise it closes simply. Escape, focus return, resize, opening interruption, runtime reduced-motion changes, and basket state remain independent. Filters use short FLIP position changes; basket state commits before any optional visible-target thumbnail flight.

Farm life has a non-pinned photographic-window entry and two-layer profile transition. The next photograph must load and decode before its heading, copy, link, credit, and tab selection commit. Rapid switches are latest-request-wins; failures preserve the previous coherent profile. Tabs implement roving focus plus arrow/Home/End behavior. Sample hours use a compact masked value change.

## Validation and measurements

- `npm test`: passed. Production build succeeded; Playwright reported 50 passed and two intentional skips across 1440×960 desktop Chromium and 390×844 touch-enabled portrait Chromium.
- Added coverage: handoff arrival/reversal/state preservation, direct hash bypass, detail opening interruption and resized close, runtime reduced-motion settlement, failed animal load retention, arrow-key tabs, and portrait touch.
- Firefox 155 portrait shop/detail/farm-profile smoke: passed with no console or page errors.
- WebKit 26.6: browser build downloaded project-locally, but launch is blocked by missing host libraries. No system packages or global configuration were changed.
- Production transfer: 2,798,326 encoded bytes at arrival and 3,403,328 after a full visit, with no catalogue/farm-life media at arrival. This is +4,047 bytes versus the v2.1 figures for both paths. CLS remained 0.0143.
- Motion timing in headless Chromium/SwiftShader: three warmed 48-sample hero traversals had 33.4–49.9 ms median frame intervals, 50.1–66.7 ms p95, and 66.7–83.3 ms maxima. This software-renderer result is preserved and is not physical-device or GPU evidence.
- Detail travel observed in-page: 593.9 ms open and 403.7 ms close.
- Capture runtime: zero console errors, page errors, or failed requests.

## Selected evidence

- Before: `evidence/live-v2.1-desktop-shop.png`, `evidence/live-v2.1-portrait-shop.png`, `evidence/live-v2.1-desktop-detail.png`, `evidence/live-v2.1-portrait-farm-life.png`, `evidence/live-v2.1-e2e-journey.webm`
- Handoff: `evidence/v2.2-desktop-handoff-mid.png`, `evidence/v2.2-desktop-handoff-arrival.png`, `evidence/v2.2-hero-handoff-desktop.webm`
- Detail and farm life: `evidence/v2.2-portrait-product-detail.png`, `evidence/v2.2-desktop-farm-life.png`, `evidence/v2.2-portrait-farm-life.png`
- Touch interaction recording: `evidence/v2.2-interactions-portrait.webm`
- Independent camera capture: `evidence/iris-v2.2-desktop-shop.png`
- Runtime records: `evidence/capture-runtime-v2.2.json`, `evidence/production-measurements-v2.json`, `evidence/motion-measurements-v2.2.json`

Evidence is ignored local review material tied to the validated integrated tree. It is not a visual baseline and does not imply human artistic approval.

## Highest-impact remaining defects or decisions

1. The handoff uses projected live-model geometry followed by a matched catalogue-render takeover. It is visually continuous and reversible, but it is not literally one live WebGL mesh rendered across the DOM endpoint. A stricter object-identity interpretation needs another technical/art pass.
2. Headless SwiftShader measured roughly 20–30 fps median during forced scroll sampling. Hardware-accelerated and physical-device review is still required before making smoothness claims.
3. WebKit is unverified because required host libraries are absent. Physical-device, screen-reader, and full Firefox matrix checks remain unperformed.
4. The 616.25 kB raw lazy Three.js scene chunk still triggers Vite's generic chunk warning and remains the largest delivery optimization opportunity.
5. Public identity/contact/commercial inputs remain intentionally unconfigured, and the photography/crops/motion pacing still require human approval. No real order, payment, message, booking, analytics, or persistence path was enabled.
