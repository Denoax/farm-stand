# Real farm, leaf handoff, and sound review

## Source and scope

- Reviewed production source: `60ad61ff1432402848fe49b3a525fd2ee0a92dbb`.
- Implementation target: the existing `Denoax/farm-stand` main worktree. No reset, alternate application, framework migration, commerce activation, animal-layout redesign, analytics, or production-history rewrite was used.
- Representation: one licensed real photograph behind the retained live permanent timber; one small live timber reveal for the existing four HTML photo anchors; a fixed-depth, mesh-supported apple roll; one deterministic DOM/CSS leaf handoff; one shared opt-in Web Audio controller.

## Reference status

Both exact YouTube pages were opened and played in project Chromium on 27 September 2026.

- Leaf reference: `https://www.youtube.com/watch?v=RRyXHZKOYGc`, titled “No Copyright I Autumn Red Leaves Transition 01 I free stock videos,” duration 5.061 seconds. Frames at 0.7, 1.7, 2.7, and 3.7 seconds showed large photographed orange/red leaves entering from the perimeter, progressively closing the centre, then resolving as a leaf field. The implemented 1.42-second motion adapts that perimeter-to-centre curtain into a transparent, one-shot page transition; it is not represented as copied code or an exact frame-for-frame recreation.
- Shutter reference: `https://www.youtube.com/watch?v=3F-a6TU9LiY`, titled “Barn Stall Door Slide Open - Farm,” duration 4.221 seconds. The player and timeline were verified. The runtime available to this review could not provide the model with reliable subjective audio audition, and the listing did not establish reuse permission. No audio was ripped. The application instead uses a separately licensed CC0 old-barn-door recording, shortened and tied to the presented shutter lift. Exact auditory-character fidelity to the supplied video remains unverified.

## Implemented result

- The Hudson Graves Unsplash photograph is delivered in separate 2400×1600 desktop and 1200×1800 portrait crops. The red barns, eye-level field rows, horizon, warm right-side light, live frame, and counter read as one threshold without a second near counter or duplicated posts.
- The live directional and threshold lights now follow the photograph’s right-side light. The right photo area is three real Rough Wood boards in the existing Three.js set, covered by the rising shutter and retained after opening.
- The four photo anchors are roughly 10–15% larger, shifted inward at wide sizes, remain real links, and use local Caveat 600 captions. Their weathered nail heads remain stationary while paper hover motion pivots beneath them.
- The apple keeps a straight rear lane at `z=0.620`. Its actual prepared-mesh half-depth is `0.283` desktop and `0.227` portrait; the post rear plane is `z=1.000`, leaving measured clearance of `0.097` desktop/wide and `0.153` portrait. Final x-position is centred behind the post, with no z-teleport.
- The document scroll gate has one owner. It begins only after deliberate downward intent and scene readiness, releases normally only after the renderer presents progress `1.0000`, and has a separate 9000 ms fail-open watchdog. Escape, destination activation, skip/focus departure, touch cancellation, hidden/pagehide, reduced-motion changes, runtime/context/model failure, direct hashes, restored non-root position, and unmount settle/release without reacquisition.
- The removed hero eyebrow and fictional-farm disclaimer are absent from the DOM. The existing service and commerce-boundary copy remains elsewhere.
- The leaf handoff arms only after a played opening, starts on the first continued downward input or Shop activation, lasts 1.58 seconds including cleanup, does not capture input, remains behind persistent controls, and cannot replay. Reduced motion and unrelated destination jumps omit/cancel it.
- Sound starts silent and makes no audio requests before explicit activation. Sound on creates one audio graph; music has independent on/off and volume; shutter, leaf, UI, and animal cues share bounded gain stages. Animal targets use pointer dwell, a 2.5-second per-animal cooldown, one replaceable voice, and immediate native hash navigation. Hidden tabs, global mute, teardown, and failures stop or degrade safely; existing animal videos remain muted.

## Visual evidence

Ignored review evidence is under `evidence/real-farm/review/` and is included in the local review ZIP.

- Matched baseline/candidate: `matched-before-after-desktop.png`, `matched-before-after-portrait.png`.
- Full opening-to-shop recordings: `desktop-1440x900-opening-normal-speed.webm`, `portrait-390x844-opening-normal-speed.webm`.
- Wide/phone finals and print closeups: `widescreen-1920x1080-final.png`, `widescreen-2560x1440-final.png`, `portrait-390x844-final.png`, and the `*-nail-paper-closeup.png` files.
- Apple evidence: `apple-clearance-side-debug.png`, dense roll frames `*-05-roll-start.png` through `*-07-roll-occluded.png`, and `capture-runtime.json` with numeric clearance.
- Loading/interruption/fallback: delayed-model, model-failure, plate-failure, context-loss, reduced-motion, and normal capture frames.
- Leaf/shop: `*-11-leaf-handoff.png`, `*-12-shop-arrival.png`, and the two normal-speed journey recordings.
- Browser audio: `desktop-sound-on-actual-browser-audio.webm` contains VP8 video plus an Opus track recorded from the application’s Web Audio master during the same Chromium run. `sound-capture.json` records the method, stream inventory, durations, and clean console. FFmpeg only remuxed/end-aligned that browser track; no replacement soundtrack was added.

## Validation

- `npm test`: 47 passed, 1 intentionally skipped. The shared nine-second watchdog test runs once on desktop; all other coverage runs in both 1440 px desktop and 390 px portrait projects. Coverage includes all 48 products, counts, search, variants, price arithmetic, basket migration/persistence/editing, direct links, animal video constraints, reduced motion, 200% text, failures, overflow, completion-bound gate, non-root bypass, no reacquisition, apple coupling/clearance, one-shot leaves, sound opt-in, shutter phase event, animal cooldown, global mute, and audio-file degradation.
- Evidence capture: 42 named captures, no unexpected console errors, page errors, or request failures. Expected model and photo aborts are separately recorded.
- Sound recording inspection: VP8 video and Opus audio streams are present; the final captured application track measured -39.6 dB mean and -16.6 dB peak. This establishes a quiet, unclipped encoded track, not subjective mix quality.

## Controlled production comparison

The candidate and the retained `60ad61f` baseline were measured with the same built-preview harness at 1440 px. Both ran in software-rendered SwiftShader, so requestAnimationFrame intervals are not GPU timings or physical-device evidence.

| Metric | Baseline | Candidate | Interpretation |
|---|---:|---:|---|
| Initial requests | 41 | 42 | One additional request despite the new feature set; audio remains zero requests until opt-in. |
| Initial encoded bytes | 2,147,403 | 2,012,186 | 135,217 bytes lower (about 6.3%). |
| Initial encoded media bytes | 1,894,400 | 1,754,113 | 140,287 bytes lower. |
| Live draw calls | 36 | 42 | Six-call cost for the three-board reveal and changed material grouping. |
| Live triangles | 24,224 | 26,024 | 1,800-triangle cost for the reveal boards. |
| Cumulative layout shift | 0.00263 | 0.00345 | Small adverse increase, still low in this run. |
| Median frame interval | 49.9 ms | 50.0 ms | Essentially unchanged under SwiftShader. |
| p95 frame interval | 100 ms | 100.1–116.7 ms | Two candidate runs were worse; no hardware-performance pass is claimed. |
| Opening wall time | 6.87–6.91 s | 6.63–6.65 s | Candidate uses elapsed wall time and no longer extends the decorative gate by discarding long frame intervals. |
| New hold duration | 1.15–1.17 s | 6.61–6.64 s | Intentional requirement change: one completion-bound hold, not a performance improvement. |

Offscreen rendering still paused with no new frames and resumed with current state. The long music file (about 1.84 MB) and all short effects remain outside the silent critical path and load only after Sound on.

## Remaining material limitations

- Subjective listening on headphones/small speakers and physical-device approval remain outstanding. The captured track and automated routing checks cannot certify that the chosen music, shutter timbre, or mix is artistically pleasing.
- Exact auditory fidelity to the supplied shutter video is unverified, and the independent CC0 adaptation should be judged on the supplied sound-on recording.
- The leaf result follows the observed large-leaf perimeter closure but compresses a five-second reference into a short 1.42-second page handoff. It is an adaptation, not an exact match.
- SwiftShader’s roughly 20 fps median cadence and adverse p95 cannot establish hardware-GPU smoothness. Safari, a physical phone, assistive-technology listening, and independent art-direction review remain outstanding.
- The farm photograph is licensed illustrative scenery from Leicester, New York, not the user’s property or evidence of inventory.
- The lazy Three.js chunk remains above Vite’s generic 500 kB raw advisory.

Successful tests and deployment do not constitute permanent artistic approval.
