# Asset record

## Live produce

- **Food Apple 01** — Oliver Harries, Poly Haven, CC0. Listing: https://polyhaven.com/a/food_apple_01. Downloaded through Poly Haven's asset file endpoint as the 1K glTF set on 25 September 2026. Source files: `assets/source/polyhaven/food_apple_01/`; delivery derivative: `public/models/food_apple_01/`. Geometry is unchanged; 1K colour, OpenGL normal, and roughness JPG maps are retained. Source glTF SHA-256: `6a7dc1cda1271c8b08e36e2b9fd44371b7149cca6262c71bc36d971cdac4325f`.
- **Yellow Onion** — Kuutti Siitonen, Poly Haven, CC0. Listing: https://polyhaven.com/a/yellow_onion. Downloaded through Poly Haven's asset file endpoint as the 1K glTF set on 25 September 2026. Source files: `assets/source/polyhaven/yellow_onion/`; delivery derivative: `public/models/yellow_onion/`. Geometry is unchanged; 1K colour, OpenGL normal, and ARM JPG maps are retained. Source glTF SHA-256: `0d4aaa4046c5b471ea7f9197c453f3d48699bc85e06fd13606c8ea09a1dce699`.
- Provider licence evidence: https://polyhaven.com/license. Asset downloads are CC0; provider example renders, logo, and site content were not copied.

The models are normalized at runtime to a shared authored scale, receive/cast contact shadows, and use their supplied maps. The crate is original Three.js box geometry. Its small local colour texture (`public/media/crate-wood.webp`) is a crop/resize derivative of the project-generated foreground surface so its wood and light remain coherent with the plate; no external texture was introduced.

## Farm setting

- Original project-generated background plate, created with OpenAI's built-in image generation tool on 25 September 2026. The exact prompt is retained in `assets/source/generated/PROMPT.md`; it requested a fictional unbranded market-garden setting with no people, signage, identity, or foreground produce. Source: `assets/source/generated/farm-setting-v1.png` (`33ab7a6b4b23d4c440229fc27bb899e29afe0ef19b87027bd6ebfc9efecf17c7`). Delivery derivatives: `public/media/farm-setting-1920.avif` and `farm-setting-1280.avif`, resized and AVIF-encoded with FFmpeg. The output included a suitable foreground wooden surface, so no duplicate live table was added.
- Exact rendered desktop and portrait arrival compositions were captured from the local WebGL scene and encoded as `public/media/farm-stand-poster-desktop.avif` and `farm-stand-poster-portrait.avif`. They appear only after model/WebGL failure; live HTML remains separate. These are implementation fallbacks, not user-approved visual baselines.

## Fonts

- Fraunces 600 and Source Sans 3 are sourced from the official Google Fonts distribution under OFL 1.1. Only Latin WOFF2 delivery files are used. Notices are retained under `assets/licenses/`.
