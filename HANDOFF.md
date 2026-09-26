# Farm Stand — approved concept and implementation brief

## 1. What we are making

A visually distinctive, single-page showcase that **demonstrates website services through a fictional farm-shop experience**. It should look carefully made enough that a grower thinks, “I want my business presented that well,” while remaining immediately understandable.

The visitor is a grower, farm-shop operator, or local-business owner—not necessarily someone interested in technology. Treat visitors as experts in their own work. Use ordinary language and recognizable actions. Do not make unverified claims about their preferences or their likely conversion behaviour.

The user explicitly approved this combination:

> The sunlit farm-stand direction: Oryzo's product storytelling, Shopify's restrained depth, Wild Souls' appetite appeal, and a clearly usable farm-shop demonstration. The ambition is a website a grower wants for their own business—not a technical performance they have to sit through.

The quote above is the **approved direction**, not approval of every default below. Composition, copy, initial type pairing, numerical budgets, and exact timing below are proposed implementation starting points. Make reversible improvements inside this direction and explain meaningful changes in the review.

“Farm Stand” is only a working project title. Do not invent an agency history, farm owner, local address, customers, awards, agricultural certifications, pricing, or support commitments. No award outcome is promised.

## 2. The scene and its visual promise

One sunlit packing table at a farm stand: a shallow wooden crate, a small selection of excellent produce, natural contact shadows, and a quiet glimpse of the growing environment. The environment must feel like a place, not produce floating against a green CSS gradient.

Start with the source-verified red apple and yellow onion candidates in `assets/manifest.json`. Make the apple the likely foreground anchor and the onion a textural contrast. These are candidates, not mandatory final products. Add another crop only when a suitable licensed asset improves the composition. Two excellent products beat six weak ones.

The background may be a licensed photograph or an offline-rendered plate. Selected foreground produce may be genuine live 3D. A textured wooden surface can be simple geometry; a convincing fruit should come from inspected artwork or a model, not a deformed sphere. The deliverable should state which layers are live 3D, images, or offline renders.

**Desktop starting composition:** camera just above table height, enough downward view to read produce shapes; primary products in the lower-middle/right; a clear upper/left text zone; depth visible through contact, overlap, and scale. Do not make this an obligatory left-text/right-card template. Test the actual scene before committing the text position.

**Portrait starting composition:** fewer props, closer product crop, heading above or in a genuinely quiet image region, readable controls below. Do not crop off the principal produce or shrink desktop wholesale. Keep the product surface large enough to appreciate.

Light should have one coherent direction. Match photographic and 3D colour, shadows, apparent scale, perspective, and sharpness. Avoid shiny plastic produce, black crushed shadows, floating crates, duplicates exposed behind moving cutouts, cutout halos, and impossible object contact.

Use pine/leaf green for interface structure, light neutral surfaces where content needs them, and saturated colour primarily from the food itself. No revival of the cancelled project's sepia museum treatment. No grain or bloom added to conceal poor images.

### Typography starting point—not an approved final pairing

Try Fraunces 600 for substantial display headings and Source Sans 3 for functional text. Use restrained letterforms, not excessive quirky alternates. Both have official distribution references in the research file. Do not copy the previous project's fonts by default.

Begin around 64–88 CSS px for the desktop headline and 38–52 px on portrait, adjusting optical fit rather than forcing line counts. Body text should generally be around 18 px; useful captions must not become microscopic. Keep the live text separate from the canvas. Source webfont files locally through official distributions when implementing, preserve notices, and serve only needed WOFF2 styles/subsets. Font binaries are intentionally not part of this handoff.

### The signature transition

**The physical farm stand becomes an online farm stand.**

As the visitor scrolls, a small camera adjustment and restrained foreground/background separation open room for real HTML product controls. The selected produce remains visually continuous with the physical scene. Its name and availability example become useful information rather than decorative labels.

Do not literally morph a crate into a laptop or send an apple across the screen. No new environment, tunnel, explosive transformation, or floating card grid is required. The delight is that a believable scene becomes usable.

## 3. The complete short journey

Build this as one coherent page, not five visually unrelated landing pages. The five beats below are planning units, not visible numbered chapters or a quota of full-screen sections.

| Beat | Scene and interaction | Visible communication |
|---|---|---|
| Arrival | Complete scene/poster and actual HTML heading are visible immediately. A small depth response is optional. | The site offers website services; it is not accepting vegetable orders. A direct contact link is already available. |
| Stand becomes shop | Short, reversible scroll-linked composition change. A selected product remains grounded and readable. | Product name, explicitly example availability, and a clear product selector appear. |
| Try it | Select either product and preview a simple pickup request. Scene response is subtle and helpful. | The visitor sees how a customer could make an enquiry. The preview clearly sends nothing. |
| Your business | The demo resolves into a concise service explanation using the same visual identity. | Show how produce listings, opening information, and enquiries can work on a website. Do not invent a management interface you did not build. |
| Contact and finish | Normal-flow contact area, readable credits, and optional return-to-demo link. Scene comes to rest. | Invite discussion of the visitor's actual business. An unconfigured contact path is visibly a preview, never a fake success. |

Keep the principal sticky enhancement short: initially test roughly one additional viewport of scroll, not an extended locked flythrough. Total length follows useful content. Do not pad the page to a prescribed height. Natural scrolling must always reach the service and contact areas.

Give only one action visual priority at a time. Text does not bounce, spin, or appear letter-by-letter by default. Selection feedback may settle in roughly 180–300 ms; treat those numbers as initial tuning targets. The object does not need a perpetual idle animation. Audio is out of initial scope.

### Initial copy, editable within the approved intent

Service identifier: **Websites for growers and local businesses.**

Hero: **This is what your farm could look like online.**

Supporting line: **Show what's available. Help customers find you. Make enquiries straightforward.**

Primary example link: **Explore the demo**. Secondary/direct service link: **Discuss my website**.

Demo disclosure: **Example farm shop — no produce is sold here.**

Demo action: **Preview a pickup request**. Preview result: **Demo preview only. No request has been sent.**

Contact heading: **Tell me about your business.**

These are proposed original copy, not assertions about an existing farm. Do not add generic “elevate your brand” language, three-word slogans, fake scarcity, fabricated customer proof, or guarantees of enquiries/revenue. “Designed, built, and looked after” is not approved as a maintenance promise.

## 4. Interaction and business boundaries

The starter product records contain sample names and units, no actual prices, stock quantities, seasonality, farm location, or health claims. The interface should disclose their demonstration status without burying it in the footer.

Implement product selection through semantic HTML controls, with a clearly visible selection state. Keep the chosen product in state independently of scroll progress. Scrolling backward or resizing must not unexpectedly reset it. A canvas click can be an enhancement, never the only way to select.

The pickup preview should show the selected product and an optional quantity, then open or reveal a simple **local-only** summary. Use a clearly labeled demonstration collection option, not a fabricated real date/address. Do not collect payment or personal information for this pretend order. Do not call an external endpoint.

The real website-service contact path is separate from the farm demo. Business name, email destination, and backend are not provided. In the local build use an honest preview mode with a draft needs/brief field and a working copy-summary action (with a selectable-text alternative). Do not store contact input in logs, analytics, URLs, or persistent browser storage. Do not present “Sent” without an actual, later-authorized delivery mechanism.

Keep missing brand/contact configuration in one file. It blocks public launch, not scene and interaction implementation. Do not create a backend, payment integration, CRM, analytics stack, consent banner, or subscription system to solve unspecified requirements.

## 5. Assets before invention

Read each asset's actual licence and inspect the downloaded files locally before integrating. Asset-page facts are not proof of mesh, texture, or framing suitability. `assets/manifest.json` deliberately records `source_verified_not_downloaded` for the two known models.

For each retained asset, record creator, page and download source, source hash, licence evidence, source format, derivative path, and transformations. Keep original download files outside public delivery. Retain a compact preview for review. Do not hotlink production assets to a reference site.

Source the table/crate, background, and light treatment narrowly. Prefer a few compatible assets over a library sweep. A single coherent background plate is better than separately generated scenery with mismatched lighting. For photographic cutouts, inspect real alpha and the clean background; an image of transparency is not transparency.

The reference websites are inspiration, not asset stores. Do not reuse their brand names, copyrighted photographs, videos, code, or textures without permission. Poly Haven's downloadable CC0 assets are distinct from its protected example renders and website content [R13].

If a main ingredient looks poor, use a better inspected asset or a properly licensed photographic representation. Do not keep a proxy fruit in the best default build and promise that more motion will fix it. No paid tools/assets without further approval; do not assume paid image-generation access exists.

## 6. Implementation approach

Default: **React + TypeScript + Vite + Anime.js + a small Three.js scene**. For a genuinely new project, plain Three.js inside a well-cleaned-up React component is sufficient; R3F is not required. Reuse suitable existing code in the designated new project, but never revive the cancelled repository.

Check compatible versions against the official docs, pin actual installed versions in one lockfile, and document the real commands created. This handoff supplies no untested package-version claims or fictional scripts.

Anime.js's React docs use `createScope()` with effect cleanup. Its current scroll docs are under `/documentation/events/onscroll/`; do not rely on the old `/documentation/scroll/` path, which redirected to the homepage during research. Its engine documentation shows manual ticking for coordination with Three.js [R07–R10]. Use one owner of the animation/render update order. Do not add GSAP, Lenis, and Framer Motion alongside it.

For the short scroll-linked stage, derive visual state from local progress and stable layout measurements. Keep the product-selection state distinct. Recompute measurements on relevant resize/font-layout changes without jumping or losing focus. Support reverse scroll and direct navigation. Do not route every animation tick through a React state update.

Use appropriate texture colour spaces: colour imagery versus non-colour material maps have different roles [R14]. Audit material response before hiding problems under lighting or postprocessing. Prefer conventional physically based materials and good source maps; no custom shader research programme is required.

Load a responsive static hero image before enhancing with 3D. It must correspond to the actual composition, not be an unrelated beautiful stock image. Replace it only when a complete corresponding scene can render; avoid doubled objects during the handoff. Defer optional models/textures until useful and share resources. Pause invisible work and let settled scenes rest. Dispose graphics resources and cancel listeners/observers on unmount.

If rendering fails, retain the intentional image version and working HTML. A WebGL failure must not remove the offer, the product selector, or the enquiry preview. Test context loss/recovery or a stable fallback, not merely HTTP success. The site is allowed to remain in image mode on a limited device.

### Small ownership map, not a mandatory file architecture

- Scene component: camera, models, material/light setup, rendering, disposal.
- Scene-motion module: stage progress and composition transforms.
- Demo state/component: selected product, quantity, pickup preview.
- Business content/config: copy, product examples, unconfigured contact settings.
- Page sections/CSS: semantic text, accessibility, mobile composition.

A new global state library, design system, custom scene editor, or orchestrator is unnecessary.

### Proposed first-build resource targets

These are project constraints to guide measurement, not claims of achieved performance or universal standards:

- Initial useful HTML/CSS/font/poster delivery: aim below 1 MB encoded; roughly 150 KB or less for requested fonts.
- Enhanced principal scene: start with a total delivered scene budget of about 4 MB including needed models and textures; no automatic 4K/8K textures or full-resolution HDRIs.
- A small cast of props and preferably under 50 visible draw calls. Confirm actual partitioning, not just mesh names.
- Bound device pixel ratio, provisionally 1–1.5 for the enhancement, and compare quality before raising it.
- Report production-served cold-cache bytes and frame intervals on an identified renderer. Aim for smooth interaction on a representative hardware device; software rendering cannot prove this.

A missed target requires a named cause and quality-preserving response, not silent acceptance or ugly decimation. Localhost ready time is not a prediction of rural network experience. Test delayed transfers as well as normal loads.

## 7. Execution: one useful first run

**Inspect:** confirm the designated new repository and real tool availability, existing instructions, source candidates, and accessible references. Reuse the user's current coding/visual tools; do not install GSD, new global hooks, or a collection of design plugins. No particular model identifier is required; use the model actually selected in Codex.

**Compose:** import the chosen assets, establish lighting and a compelling still on desktop and portrait. Inspect the actual pixels. If the still is unconvincing, change assets or composition rather than building an elaborate animation around it. Use the art skill to make a small comparison internally.

**Build:** implement the short stand-to-shop transition and product/pickup interaction. Include a concise service section and honest contact preview so the page has a complete purpose and ending. The real assets, not random placeholders, must anchor the default experience.

**Review and correct:** inspect desktop, portrait, normal scroll, reverse scroll, direct section links, selection changes mid-transition, reduced motion, and delayed/failed assets. Correct the largest visible defects before preparing the report. One independent review through already-available tooling can help; do not create a swarm of agents.

**Deliver:** one runnable local experience and compact evidence, not several disconnected demos. Do not stop after preflight or a written plan. Missing business configuration does not prevent local implementation. A genuine permissions/tool/asset blocker should be described precisely while independent work continues. Do not silently claim missing inputs were present.

## 8. Review criteria and output

Two separate judgments are required.

**Art/commercial:** Does the still scene already look credible and desirable? Does motion enhance it rather than distract? Is the same produce visually continuous into the demo? Can a nontechnical visitor see both the example farm shop and the actual website-service offer? Are scenery, type, shadows, and produce one composition? Are the touch layout and the ending equally deliberate?

**Engineering:** Do the controls work without hover or canvas interaction? Does selecting a product survive reversal/resizing? Do effects clean up under React remounts? Does the scene/poster transition avoid duplicates or flashes? Can a slow/failed image/model/font request leave useful content? Is reduced motion complete without dead pinned scroll? Are contact and order semantics truthful? Are source notices and production measurements recorded?

Test at least a desktop viewport, a portrait phone-sized viewport, and a narrow portrait width; identify exact dimensions rather than assuming emulation is a physical-device test. Check keyboard focus, text zoom, touch targets, labels, contrast, and no horizontal overflow. All decorative motion must be optional. Do not require a login or audio permission.

Deliver `REVIEW.md` and `review-summary.json` with exact implementation state, actual run commands, sources/derivatives, tested conditions, known gaps, and the few most important next corrections. Include selected desktop/portrait stills, the stand-to-shop midpoint, a product-selection/pickup state, contact state, fallback/reduced-motion evidence, and one forward/reverse demonstration. Label sparse/settled recordings honestly. Do not run a massive evidence matrix that displaces design work.

Put the report in the new repository and copy the final Markdown report and summary to `~/Downloads/` using a non-colliding farm-stand filename; preserve pre-existing files. User approval is separate from successful tests. No public deployment, remote repository mutation, payment/contact activation, or baseline promotion is authorized by this handoff.
