# Farm stand website demonstration

A local, single-page website-services showcase for growers and local businesses. Its fictional farm includes a one-time cinematic market opening, a 48-product photographed catalogue, a variant-aware demonstration basket, collection preview, three licensed farm-life video scenes, practical visit content, a client-side sample-hours update, service explanation, and copy-only website brief. It cannot accept orders, payments, bookings, saved content updates, or contact submissions.

Basket persistence stores only validated product/variant identifiers and bounded integer quantities. Displayed prices are always read from the current catalogue rather than trusted from saved browser data.

The opening begins after the first meaningful downward wheel, touch, or keyboard intent and then runs on its own 6.5-second timeline. Its initial scroll hold is bounded to 900 ms; scrolling is then free while the sequence continues. A single shutter reveals the stand, a supported apple rolls behind the permanent left post, and the top beam, side posts, and counter remain in the settled composition. It is marked complete for the browser session; direct hash destinations and reduced-motion users receive the settled open stand. Escape and normal destination links can finish the sequence, and the entrance links remain normal HTML links during loading and after their staged return.

## Run locally

Requires Node 24 and npm 11. The original working directory may contain an ignored project-local runtime under `.tools/`, but fresh clones should use their normal Node installation.

```bash
cd Farm-Stand-Codex-Handoff-v1
npm ci
npm run dev
```

Open `http://localhost:5173/farm-stand/`. The project-path base matches GitHub Pages and keeps hash navigation unchanged.

Production build and local preview:

```bash
npm run build
npm run preview -- --host 127.0.0.1
```

Run the browser tests with `npm run test:e2e`. With the production preview running, `npm run measure` records transfer/layout/renderer evidence, `npm run measure:motion` records software-rendered motion and hold timing, `npm run capture:frame-guides` regenerates the plate-registration guides, and `npm run capture:finish` creates the current permanent-frame screenshots, failure states, and normal-speed recordings. Asset provenance and transformations are recorded in [ASSETS.md](./ASSETS.md). Bulky captures and recordings under `evidence/` are deliberately ignored; concise review reports and machine-readable summaries are tracked with the source.
