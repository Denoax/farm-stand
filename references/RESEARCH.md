# Sources and how to use them

Checked 25 September 2026. These are research anchors, not permission to copy another site's assets or identity.

**Evidence boundary:** page content, creator explanations, documentation, and model-catalogue entries were inspected. The live WebGL reference sites were not interactively audited here. No downloadable produce mesh was imported. Do not turn source descriptions into claims about personally measured motion or performance.

The adaptations below are proposed design decisions for this project. They are not claims that the reference teams recommend our exact implementation.

## Creative references

### R01 — Oryzo, Lusion
https://oryzo.ai/

Supported: the site ultimately identifies its coaster as fictional and frames the experience as a demonstration of Lusion's creative services. Adapt: sell the capability through a tangible product demonstration. Unlike its late reveal, identify our website service near the opening. Do not import the AI satire, fake reviews, parody metrics, product tiers, or fictional checkout.

### R02 — Oryzo creator account: UX/UI and illustrations
https://blog.lusion.co/oryzo-bts-part-3-7-website-ux-ui-and-illustrations

Supported: the team moved from an abstract concept toward a believable desk setting and reduced competing type/colour treatments. Adapt: a lived-in farm stand and fewer interface ideas; scenery and produce carry the appeal. The production techniques in a creator account are not a recipe guaranteeing our quality.

### R03 — Shopify Editions, Winter '26
https://www.shopify.com/editions/winter2026

Supported: Renaissance-themed product-updates experience, with many categories and over 150 updates. The user likes its presentation. Adapt: art-integrated depth and deliberate transitions as visual goals. Do not copy its paintings, immense information architecture, or Renaissance styling. Its exact live motion, rendering implementation, and device performance were not verified in this pass; do not assert a particular internal stack.

### R04 — Wild Souls creator case study, Big Horror
https://www.bighorrorathens.com/work/wild-souls/

Supported: the agency describes expressive food colour/texture with usability and lists photography, design, and development in its scope. Adapt: desirable, substantial produce imagery and confident type, not a generic grid. Do not import all psychedelic forms or the brand palette. Treat the agency's speed claims as its claims, not independently measured evidence.

### R05 — Encyclopedia of the Farm, Slowness / Studio Airport
https://slowness.com/encyclopedia-of-the-farm/

Supported: a crop-centered story connecting farm and kitchen, with Studio Airport credited. Adapt: use crop, setting, and grower context rather than invented agritech spectacle. Do not copy health/nutrition claims, harvest data, farm identity, or opaque navigation into our demo.

### R06 — Beerenberg
https://beerenberg.com.au/

Supported: a real farm/product site with visiting and shopping information. Adapt: make availability, finding a business, and enquiries understandable. Do not copy a large retail navigation system or imply endorsement/client status.

Farm Minerals was a secondary reference in earlier research. Its creator case study remains an optional lead, not an audited implementation requirement:
https://www.behance.net/gallery/244224457/web-design-development-for-agritech-Farm-Minerals

## Motion and rendering documentation

### R07 — Anime.js getting started and React integration
https://animejs.com/documentation/getting-started
https://animejs.com/documentation/getting-started/using-with-react/

Supported: the documented React pattern uses `createScope()` in an effect and scope cleanup. Read the actual installed-version-compatible examples; do not copy their bouncing-logo visual style.

### R08 — Anime.js native-scroll integration
https://animejs.com/documentation/events/onscroll/
https://animejs.com/documentation/events/onscroll/scrollobserver-synchronisation-modes/

Supported: `onScroll()` can trigger/synchronize animation and timeline instances. The old `/documentation/scroll/` URL redirected to the homepage when checked. Use these current pages rather than assuming a v3/v4/tutorial API.

### R09 — Anime.js scopes and media conditions
https://animejs.com/documentation/scope/

Supported: scopes can react to media queries and batch-revert instances; its example includes reduced motion. Use this to support a complete simpler composition, not just to slow an otherwise inaccessible animation.

### R10 — Anime.js manual engine update / Three.js coordination
https://animejs.com/documentation/engine/engine-methods/update/

Supported: manual `engine.update()` with the default loop disabled is documented for external render loops; the page includes a Three.js adapter example. Choose one coherent update owner. Do not copy incidental example choices such as unbounded device pixel ratio or `preserveDrawingBuffer: true` into production without need.

### R14 — Three.js colour management
https://threejs.org/manual/pages/color-management.html

Supported: correct input/output colour-space handling is necessary; maps used as colour and maps used as non-colour data differ. Confirm texture roles, output conversion, and lighting together instead of compensating for colour mistakes with arbitrary exposure.

## Concrete starting asset candidates

### R11 — Food Apple 01, Oliver Harries
https://polyhaven.com/a/food_apple_01

Catalogue lists glTF, CC0, approximately 7K triangles and multiple texture resolutions. Source-verified only; the actual chosen download and maps need inspection. The red apple is a proposed scene anchor, not a final approved asset.

### R12 — Yellow Onion, Kuutti Siitonen
https://polyhaven.com/a/yellow_onion

Catalogue lists glTF, CC0, approximately 5K triangles and multiple texture resolutions. Source-verified only. Useful contrast to the apple's surface; confirm the scale, normal-map convention, source realism and optimized delivery locally.

### R13 — Poly Haven asset licence and website-content boundary
https://polyhaven.com/license

The provider labels downloadable assets CC0 and permits commercial use. Its example renders, logos and other site content are separately protected; the assets' licence does not authorize copying everything on the site. API access has separate terms. Use intended download channels and retain source evidence; do not perform a bulk scrape.

## Typography and delivery

### R15 — Official font sources, trial pairing
https://github.com/google/fonts/tree/main/ofl/fraunces
https://github.com/google/fonts/blob/main/ofl/fraunces/article/ARTICLE.en_us.html
https://github.com/google/fonts/tree/main/ofl/sourcesans3
https://github.com/google/fonts/blob/main/ofl/sourcesans3/OFL.txt

Fraunces is documented as a display soft-serif with variable axes. Source Sans 3's distribution includes its OFL notice. The proposed pairing is our design trial, not user-approved typography. Fetch only through official sources during implementation and retain the relevant notices. No font binaries are included in this package.

### R16 — Webfont delivery guidance
https://web.dev/learn/performance/optimize-web-fonts

Use WOFF2 and thoughtful character/style coverage. Record actual requested transfer; do not assume an installed font rendered just because CSS names it.

## Codex and verification

### R17 — Official project instructions and skills
https://learn.chatgpt.com/docs/agent-configuration/agents-md
https://learn.chatgpt.com/docs/build-skills

The former `developers.openai.com/codex/...` links redirect here. Project instructions use `AGENTS.md`; repository skills use `.agents/skills/<name>/SKILL.md` with name and description metadata. The included skills are instruction-only and require no plugin installation. They do not grant unavailable tools or bypass permissions.

### R18 — Playwright visual comparisons
https://playwright.dev/docs/test-snapshots

The documentation notes that screenshot output can vary by browser, OS, hardware and settings. Record conditions and inspect intermediate frames. A passing snapshot comparison does not establish artistic quality; a new capture does not become approved merely because a tool produced it.

## Reference use during implementation

When a browser can run a chosen reference, inspect a few specific useful moments: opening, first transition, one interaction, portrait treatment. Record observed behaviour separately from interpretation. Do not claim to have watched an inaccessible page. Do not spend the build exhaustively auditing all references; focus on decisions that affect this scene.
