# Farm stand website demonstration

A local, single-page website-services showcase for growers and local businesses. Its fictional farm includes a seven-product catalogue, multi-item demonstration basket, collection preview, farm-life stories, practical visit content, a client-side sample-hours update, service explanation, and copy-only website brief. It cannot accept orders, payments, bookings, saved content updates, or contact submissions.

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

Run the browser tests with `npm run test:e2e`. With the production preview running, `npm run measure` records transfer/layout/renderer evidence, `npm run measure:motion` records software-rendered motion timing, and `npm run capture:motion` creates selected screenshots and normal-speed recordings. Asset provenance and transformations are recorded in [ASSETS.md](./ASSETS.md). Bulky captures and recordings under `evidence/` are deliberately ignored; concise review reports and machine-readable summaries are tracked with the source.
