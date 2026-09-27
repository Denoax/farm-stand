# Asset record

## Live produce

- **Food Apple 01** — Oliver Harries, Poly Haven, CC0. Listing: https://polyhaven.com/a/food_apple_01. Downloaded through Poly Haven's asset file endpoint as the 1K glTF set on 25 September 2026. Source files: `assets/source/polyhaven/food_apple_01/`; delivery derivative: `public/models/food_apple_01/`. Geometry is unchanged; 1K colour, OpenGL normal, and roughness JPG maps are retained. Source glTF SHA-256: `6a7dc1cda1271c8b08e36e2b9fd44371b7149cca6262c71bc36d971cdac4325f`.
- **Yellow Onion** — Kuutti Siitonen, Poly Haven, CC0. Listing: https://polyhaven.com/a/yellow_onion. Downloaded through Poly Haven's asset file endpoint as the 1K glTF set on 25 September 2026. Source files: `assets/source/polyhaven/yellow_onion/`; delivery derivative: `public/models/yellow_onion/`. Geometry is unchanged; 1K colour, OpenGL normal, and ARM JPG maps are retained. Source glTF SHA-256: `0d4aaa4046c5b471ea7f9197c453f3d48699bc85e06fd13606c8ea09a1dce699`.
- Provider licence evidence: https://polyhaven.com/license. Asset downloads are CC0; provider example renders, logo, and site content were not copied.

The models are normalized at runtime to a shared authored scale, receive/cast contact shadows, and use their supplied maps. The crate is original Three.js box geometry. Its small local colour texture (`public/media/crate-wood.webp`) is a crop/resize derivative of the project-generated foreground surface so its wood and light remain coherent with the plate; no external texture was introduced.

## Farm setting

- Original project-generated background plate, created with OpenAI's built-in image generation tool on 25 September 2026. The exact prompt is retained in `assets/source/generated/PROMPT.md`; it requested a fictional unbranded market-garden setting with no people, signage, identity, or foreground produce. Source: `assets/source/generated/farm-setting-v1.png` (`33ab7a6b4b23d4c440229fc27bb899e29afe0ef19b87027bd6ebfc9efecf17c7`). Delivery derivatives: `public/media/farm-setting-1920.avif` and `farm-setting-1280.avif`, resized and AVIF-encoded with FFmpeg. The output included a suitable foreground wooden surface, so no duplicate live table was added.
- Exact rendered desktop and portrait arrival compositions were captured from the local WebGL scene and encoded as `public/media/farm-stand-poster-desktop.avif` and `farm-stand-poster-portrait.avif`. They appear only after model/WebGL failure; live HTML remains separate. These are implementation fallbacks, not user-approved visual baselines.
- **v2.3 orchard and harvest basket** — project-original layers generated with OpenAI's built-in image generation tool on 25 September 2026. Exact prompt records and the basket transparency deviation are retained in `assets/source/generated/PROMPT.md`. Delivery derivatives are `public/media/harvest-orchard.avif` (1920 px, 203 kB) and `public/media/harvest-basket.webp` (1000 px, 179 kB), encoded with FFmpeg. The orchard remains a background plate; the basket is softly alpha-masked in CSS and duplicated only as a clipped front-rim layer so the live CC0 apple can pass behind it. Neither layer is shopping state or evidence of a real property.

## Treatment A market opening

- **Open stand plates** — project-original edits made with OpenAI's built-in image editing tool on 26 September 2026, using the retained farm-setting plate as the camera, shelter, counter, landscape, and light reference. The desktop and deliberately recomposed portrait masters add one coherent right-side arrangement of onions, potatoes, carrots, squash, eggs, and linen while reserving the left counter for the live CC0 apple. Exact production requests are retained in `assets/source/generated/PROMPT.md`; source and derivative hashes are in `assets/manifest.json`. Delivery files are `public/media/market-opening-open-desktop.avif` and `market-opening-open-portrait.avif`.
- **First-paint posters** — deterministic captures of the revised implemented starting state at 1536×1024 and 640×960 with interface copy and controls suppressed. They contain the actual timber shutter, fixed rails, removable display table, calculated apple cast/contact shadow, lighting, and retained CC0 apple used by the live scene. They were AVIF-encoded as `public/media/market-opening-poster-desktop.avif` and `market-opening-poster-portrait.avif`, preventing a different composition from appearing while Three.js and the apple model load.
- **Runtime source reuse** — the apple remains Oliver Harries's CC0 Poly Haven model; the wood map remains the existing project-generated `crate-wood.webp` crop. The monotonic shutter, fixed rails, removable display table, lighting, camera, and shot evaluator are original project code and Three.js primitives. The former close-passage assembly and fake oval shadow are no longer rendered. No third-party treatment code or reference-site media was copied.

## Fonts

- Fraunces 600 and Source Sans 3 are sourced from the official Google Fonts distribution under OFL 1.1. Only Latin WOFF2 delivery files are used. Notices are retained under `assets/licenses/`.

## Open-once market expansion

- **Expanded catalogue photography** — 43 additional Pexels photographs were selected and inspected for the exact product represented, including replacement photographs for the previous catalogue apple and onion renders. Together with five retained licensed catalogue photographs, they make the 48-item demonstration market. The complete per-photo creator, Pexels page, acquisition date, identifier, and alt description record is `assets/source/market-expansion/catalogue-sources.json`; the delivery derivatives are 960×640 AVIF files under `public/media/catalogue-expanded/`. Acquisition copies remain ignored and are not shipped. Delivery SHA-256 values are in `assets/market-expansion-delivery.sha256`.
- **Hens video** — Anurag Gusain, Pexels: https://www.pexels.com/video/29229103/. A ten-second section was resized to 1280×720, H.264-encoded at CRF 24 with fast-start metadata, and delivered without audio as `public/media/farm-life-motion/hens.mp4`; its inspected poster is delivered beside it.
- **Cattle video** — Taryn Elliott, Pexels: https://www.pexels.com/video/herd-of-cows-in-a-pastureland-3769204/. The inspected wide-pasture source was resized to 1280×720, H.264-encoded at CRF 24 with fast-start metadata, and delivered without audio as `public/media/farm-life-motion/cattle.mp4`; its inspected poster is delivered beside it.
- **Sheep video** — Matthias Groeneveld, Pexels: https://www.pexels.com/video/12116085/. A ten-second section was resized to 1280×720, H.264-encoded at CRF 24 with fast-start metadata, and delivered without audio as `public/media/farm-life-motion/sheep.mp4`; its inspected poster is delivered beside it.

All expansion photographs and videos are used under the [Pexels license](https://www.pexels.com/license/). The source record includes hashes for the three acquired videos and all six video/poster derivatives. The application permits only one large farm-life video to play, keeps every clip muted and non-looping, and falls back to its matching poster.

## v2 catalogue and farm-life photography

The v2 expansion uses locally delivered derivatives of Pexels photographs under the [Pexels license](https://www.pexels.com/license/). Acquisition copies remain outside public delivery under the ignored `assets/source/photography/v2/` directory. Each retained image was inspected at the intended crop, resized to 960 px (catalogue) or 1200 px (farm life), and AVIF-encoded with FFmpeg. Exact source URLs, creators, hashes, and derivative paths are recorded in `assets/manifest.json`.

- Catalogue: carrots by Joao Teles; potatoes by Ellie Burgin; squash by MART PRODUCTION; eggs by Sophia Martin; produce crate by Snappr.
- Farm life: hens by Eline Spee; cattle by Alina Vilchenko; sheep by cottonbro studio.
- Apple and onion catalogue images are dedicated 960×640 renders of the retained CC0 models, made with a neutral green backdrop, warm wooden ground, catalogue lighting, and contact shadows. They are independent of the hero composition; exact derivative hashes are in the manifest.
- `public/media/farm-stand-social.jpg` is a 1200×800 JPEG capture of the completed desktop composition for Open Graph clients. It includes the same master barn mark rendered by the shared Logo component; it is not separate identity artwork.

## v2.4 presentation media

- **Hen and chicks** — Nguyen Huy, Pexels: https://www.pexels.com/photo/hen-with-chickens-on-ground-17904089/. The inspected 6000×4000 source was resized to a 1920 px AVIF at `public/media/farm-life/hens-v24.avif` for the ground-level hens scene.
- **Cattle at sunset** — Helena Lopes, Pexels: https://www.pexels.com/photo/calves-feeding-grass-in-field-under-colorful-sky-at-sunset-4783410/. The inspected 5472×3648 source was resized to a 1920 px AVIF at `public/media/farm-life/cattle-v24.avif` for the wide pasture scene.
- **Rain over a field** — Pixabay via Pexels: https://www.pexels.com/video/rainy-weather-at-the-field-855592/. Seven seconds of the inspected static-camera source were resized to 1280×720 and H.264-encoded without audio at `public/media/weather-rain.mp4`; a representative AVIF poster is delivered alongside it. Playback is decorative, muted, looped, visibility-bounded, and replaced by the poster/clear composition on failure or reduced motion.
- **Harvest basket v2.4** — project-original extraction made with OpenAI's built-in image editing tool from the retained v2.3 basket source. The exact prompt is recorded in `assets/source/generated/PROMPT.md`. The inspected transparent derivative is `public/media/harvest-basket-v24.webp`.
- **Harvest fallback posters** — first-frame captures of the implemented orchard/apple/basket composition at 1440×900 and 390×844, regenerated from the corrected live framing and encoded as `public/media/harvest-poster-desktop.avif` and `public/media/harvest-poster-portrait.avif`. They are loading/failure fallbacks, not approved visual baselines.
- **Complete stand plates** — deterministic settled captures of the same project-generated background, live CC0 produce, authored crate, shadows, and support surface at both target viewports. `public/media/harvest-stand-complete-desktop.avif` and `public/media/harvest-stand-complete-portrait.avif` sit beneath the transition so an interrupted WebGL update cannot expose an empty destination. They are implementation fallbacks, not separate artwork or approved baselines.

All Pexels media above is used under the [Pexels license](https://www.pexels.com/license/). Acquisition files remain in ignored source directories. Exact source URLs, SHA-256 hashes, derivative hashes, and transformations are recorded in `assets/manifest.json`.
