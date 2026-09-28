# Brighter stage, transition, and basket review

## Source state and representation

- Reviewed source: `1dd1335f65965bbd85cafb0b41eeacacd4076c4c`.
- Final deployed SHA and exact Pages run are recorded in the delivery note inside the local review ZIP after publication.
- Representation: the existing permanent live timber frame and apple remain; one brighter real orchard photograph supplies deliberate desktop and portrait crops; the backing wall behind the four pinned links is removed; an authored four-panel canopy made from licensed real-leaf cutouts covers the stage before the existing shop is committed beneath it.
- This is the existing application and basket reducer. It is not a replacement site or a second cart.

## What changed

The selected orchard was evaluated inside the actual frame rather than as a freestanding image. The photographs now sit directly over that opening, larger and farther left, with the existing captions and nail heads. The timber members, apple support/occlusion path, product catalogue, animal videos, logo, shop, basket persistence, variant logic, and integer-money arithmetic remain.

The former sound panel is now one icon-only Music control. Music starts off. Browser-permitted shutter, leaves, animal cues, and semantic `add`, `details`, `quantity`, and `remove` effects are independent of music. The opening controller offsets late shutter playback to the current lift position and discards it after the lift, so a stale shutter cannot play in the shop. The cattle cue gain is `0.167`, down from `0.42`. Generic click feedback was removed from commerce controls.

The leaf handoff is an explicit `idle → armed → entering → covered → clearing → complete` state machine. Entry takes 600 ms; the opaque leaf hold lasts approximately one second; clearing takes 800 ms. The shop hash and scroll destination commit only after an opaque cover has painted. The fixed basket trigger unlocks after completion, or immediately on the existing direct-entry, reduced-motion, scene-failure, and interruption bypasses. Its mini-basket reads the original reducer and opens the original full drawer.

## Asset provenance

### Bright orchard

- Title: “Trees in Orchard”
- Creator: Mark Stebnicki
- Source page: <https://www.pexels.com/photo/trees-in-orchard-17765489/>
- Licence evidence: <https://www.pexels.com/license/>
- Source: 8640×5760; SHA-256 `d01d7c94cc243a152e5f83abb7c660e0bb0048afd8ced354b74600f649b59631`
- Desktop delivery: 2400×1600; SHA-256 `65e5b4a60edaeb3c3d3af864f3b3bd77d3844301ae773c662da0c421dc8f73b9`
- Portrait delivery: deliberate central 1200×1800 crop; SHA-256 `74bd1f11bfc75ec8be7af3cf2c3f4e4d88f840c0016f2a9393b4c15e5b4023b5`
- Processing: resize/crop and AVIF encoding only; no generative alteration or multi-photo composite.

### Leaf canopy

- Source: ambientCG `LeafSet006`, <https://ambientcg.com/view?id=LeafSet006>, CC0.
- Source package SHA-256: `4472ada45a3e0c56be20a4018339bb0e18db96a863b60f13dc3a9e228d9c2958`.
- Delivery: 2400×1600 WebP; SHA-256 `8720ad7cc85e8c18496679369e86964733d04a1edac7af0fd78657b958a895c2`.
- Processing: provider colour/opacity maps were combined and their leaf cutouts were cropped, repeated, rotated, and placed over a dark leaf bed to guarantee opaque coverage. This is an authored arrangement, not a photograph of a natural canopy.

### Semantic interface audio

The four new effects come from Kenney Interface Sounds, <https://kenney.nl/assets/interface-sounds>, CC0. The source pack SHA-256 is `f2193d072726d6758a5f7871b2dcc54dcce0d5c35c6f0a62f92549b327c81232`.

| Role | Source | Delivered SHA-256 |
| --- | --- | --- |
| Add | `confirmation_002` | `8828691f584087ebe1aeb2bf7b80b602af3fcdf1b9a505fd2cb812489bb01961` |
| Details | `open_004` | `b3c46fa5eb5fe97fe6271c38b76452a19a6f99b68aa59627064cef8ae79799cb` |
| Quantity | `click_004` | `454cf62b98d5e4f4488f745d562b4b1352ff3e20752a3da9557f8997e1646009` |
| Remove | `close_003` | `8aa90eda4f2c218ca5eb80cca58902692ca7b980a8e0ec7efaeb538fda03d836` |

The complete retained music, shutter, leaf, animal, image, font, and model provenance remains in `assets/manifest.json` with delivery hashes and licence records.

## Visual and interaction evidence

All evidence below is local and ignored by Git. It is copied into `Farm-Stand-Brighter-Stage-Transition-and-Basket-Review.zip`; source masters are not.

- `matched-before-after-desktop.png`: reviewed source on the left, candidate on the right at 1440×900.
- `matched-before-after-portrait.png`: reviewed source on the left, candidate on the right at 390×844.
- `desktop-1440x900-01-closed.png` through `08-mini-basket.png`.
- `portrait-390x844-01-closed.png` through `08-mini-basket.png`.
- `desktop-1440x900-opening-normal-speed.webm` and `portrait-390x844-opening-normal-speed.webm`.
- `desktop-sound-on-actual-browser-audio.webm`: one browser interaction recording containing its actual Web Audio master, not replacement post-production sound.
- `widescreen-1920x1080-final.png` and `widescreen-2560x1440-final.png`.
- `loading-first-paint-poster.png`, `reduced-motion-direct-shop-portrait.png`, and `scene-failure-static-fallback.png`.
- `capture-runtime.json`, `sound-capture.json`, and `safeguard-capture.json`: no captured console or page errors.

Rendered review caught and corrected two material defects before release: the first full-cover frame could momentarily expose a plain cream field, and the portrait timber continuation collided with the shop heading. The covered state now has its own leaf background and the portrait continuation is shorter and right-aligned.

## Validation

- `npm test`: build passed; 53 Playwright cases passed across desktop and portrait Chromium; one duplicate portrait watchdog case was intentionally skipped because its shared timer invariant runs once.
- Covered behaviors include the one-shot scroll hold, renderer-presented completion, watchdog release, Escape/touch/visibility/keyboard interruption, direct hashes, reduced motion, permanent frame and apple motion, full leaf coverage and destination timing, basket persistence/variants/undo/clear, mini-basket focus and Escape, semantic audio without duplicate clicks, lowered cattle gain, media failures, 320 px layout, and 200% text sizing.
- Asset manifest JSON and delivery hashes were validated.
- Local normal-speed captures were inspected at desktop, portrait, 1920×1080, and 2560×1440. These use software-rendered Chromium, not a physical phone or hardware GPU.

## Measured quality/performance trade-off

Measurements compare separately built copies of reviewed source and candidate under the same 1440 px Playwright Chromium/SwiftShader conditions. RequestAnimationFrame intervals are not GPU timings.

| Measure | Reviewed source | Candidate |
| --- | ---: | ---: |
| Initial requests | 42 | 43 |
| Initial encoded bytes | 2,012,186 | 2,766,531 |
| Initial encoded image bytes | 1,465,648 | 2,219,239 |
| Live frame draw calls | 42 | 36 |
| Live frame triangles | 26,024 | 24,224 |
| Three-run median rAF interval | 50 ms | 33.4 ms |
| Three-run intervals over 50 ms | 42 / 50 / 43 | 29 / 30 / 30 |
| Measured cumulative layout shift | 0.00345 | 0 |

The candidate deliberately spends about 754 kB more initial encoded data on the higher-resolution orchard, regenerated fallback poster, and opaque leaf canopy. Removing the live photo wall reduces draw calls and triangles. The cadence result improved in this environment, but it is not sufficient evidence for physical-device performance.

## Remaining defects and review boundary

- The leaf field still reads as a deliberately repeated authored collage at full hold rather than naturally filmed foliage. This is the strongest reason to reject the result: the mechanism meets coverage and timing requirements, but a demanding art review may find the full-screen material pattern too synthetic.
- The orchard is licensed illustrative scenery, not the eventual client’s property or proof of current inventory.
- Physical-phone, Safari, hardware-GPU, screen-reader, and independent subjective sound-mix reviews remain outstanding.
- The lazy Three.js chunk remains above Vite’s generic 500 kB raw advisory.
- Browser policy can block sound before trusted activation; the interface does not claim audible first-wheel playback.

Passing tests, successful deployment, and this review do not establish permanent artistic approval.
