# Farm stand website demonstration

A local, single-page website-services showcase for growers and local businesses. The farm shop is a fictional interaction demo: it cannot accept orders, payments, or contact submissions.

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

Run the browser tests with `npm run test:e2e`. Asset provenance and transformations are recorded in [ASSETS.md](./ASSETS.md). Local review evidence and reports are deliberately ignored by Git and remain in the working directory only.
