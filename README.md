# Farm stand website demonstration

A local, single-page website-services showcase for growers and local businesses. The farm shop is a fictional interaction demo: it cannot accept orders, payments, or contact submissions.

## Run locally

This working copy includes a project-local Node 24.21.0 runtime under `.tools/`; it does not change the global system configuration.

```bash
cd Farm-Stand-Codex-Handoff-v1
export PATH="$PWD/.tools/node-v24.21.0-linux-x64/bin:$PATH"
npm run dev
```

Open `http://localhost:5173/farm-stand/`. The project-path base matches GitHub Pages and keeps hash navigation unchanged.

Production build and local preview:

```bash
export PATH="$PWD/.tools/node-v24.21.0-linux-x64/bin:$PATH"
npm run build
npm run preview -- --host 127.0.0.1
```

Run the browser tests with `npm run test:e2e`. Asset provenance and transformations are recorded in [ASSETS.md](./ASSETS.md). Local review evidence and reports are deliberately ignored by Git and remain in the working directory only.
