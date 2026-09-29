# Scene continuity and clipboard finish review

## Source and representation

- Reviewed and baseline SHA: `71bb728892d3494cf9425fddba783d3a78618200`.
- Final deployed SHA and exact Pages run: recorded in the local review ZIP delivery record and final handoff after publication.
- Representation: the existing live Three.js timber threshold, licensed orchard photograph, leaf canopy, HTML catalogue, and original basket reducer remain. This patch corrects their spatial/state continuity; it is not a new concept, scene engine, market, or cart.

## Result

The apple no longer occupies the shutter, brace, or rail depth at the start or during lift. The complete shutter assembly moved behind the apple lane while the counter, frame, roll distance, sampled support envelope, and left-post disappearance remain. Runtime diagnostics use the loaded apple mesh extents and a 101-sample motion sweep. At the tightest measured desktop/wide state, the apple retains `0.097` world-unit clearance from the post envelope, `0.237` from the shutter/braces and rails, and `0.487` from the fascia; computed counter penetration is `0.0000`. Portrait minimum clearance is `0.153`.

One shared responsive view configuration now owns FOV, camera position/target, frame width and orchard crop for desktop/wide and portrait aspect families. The settled camera is 32 degrees, with a deliberately separate portrait position. Full-resolution first-paint and settled posters were regenerated from those exact live states. The supplied perspective guides show orchard-row convergence, horizon, structural verticals and the counter contact plane together.

The leaf handoff uses the same owner-aware document lock as the opening. It acquires synchronously, rejects wheel/touch movement, holds the settled stand while predecoded leaves enter, waits two painted full-cover frames, commits the shop under the cover, holds for about one second, clears, and only then restores the destination scroll position. Its watchdog starts once. Escape, other links, visibility loss, page exit, reduced motion and missing leaf art release or bypass directly without an empty cover.

The market is one normal-flow clipboard surface: a slim rough-wood board edge, warm ivory paper and modest centred steel clip. Products, filters, dialogs and the original catalogue semantics remain ordinary HTML; there is no nested market scroller. The fixed basket remains outside the clipboard.

The 44 px olive speaker sits beside the independent logo anchor. A fresh visible visit requests music, reports policy blocking rather than pretending to play, and retries on the first eligible interaction. Actual playback, blocked request and saved session mute are separate states; mute cancels pending attempts. Basket open/close use retained Kenney CC0 `maximize_002` and `minimize_002` derivatives. User transitions cancel the prior basket voice; mini-to-full emits one expansion/open cue and no close cue.

The old immediate prompt is replaced by one hint after 5,000 ms of eligible inactivity. Closed-ready and returned-open are separately rate-limited once per visit. Meaningful input dismisses it; loading, locks, leaves, direct routes, dialogs, editing, hidden tabs and reduced motion suppress it. Its only animation is entrance plus one emphasis cycle.

## Acceptance matrix

| ID | Status | Evidence |
|---|---|---|
| G1 | resolved | 101-sample runtime sweep; front/side/top development views at closed, lift, roll-start and approach; positive post, shutter, rail and fascia clearance; zero counter penetration. |
| G2 | resolved | Normal-speed desktop and portrait recordings plus end-state frames retain the rear-lane roll and full left-structure occlusion. |
| P1 | resolved | 1440×900, 1920×1080, 2560×1440, 390×844 and 320 px browser review; desktop/portrait/wide perspective guides use the shared view source. |
| P2 | resolved | Four posters regenerated from current live states; delayed-model, scene-failure and reduced-motion captures show complete registered frames. |
| L1 | resolved | Entering, first full cover, held cover, clearing and revealed-shop frames; owner remains `leaf` until clear completes. |
| L2 | resolved | Non-passive momentum test plus Escape, link, hidden, page-exit, watchdog, failed-leaf and reduced-motion regressions. |
| C1 | resolved | Desktop/portrait clipboard captures; 320 px and 200% text tests; no nested scroll container. |
| M1 | resolved | Browser recording reports `blocked → playing → muted`; separate blocked-arrival frames and persisted session mute regression. No universal autoplay claim. |
| H1 | resolved | Timed closed-state capture and automated checks for initial absence, five-second appearance, one-shot dismissal and locked-state suppression. |
| A1 | resolved | Actual application-audio track contains two intentional basket opens (mini and mini-to-full) and one full close; transition regression proves no mini-to-full close. |
| R1 | resolved | 62 executable Playwright checks passed across desktop/portrait; 2 project-scoped duplicates intentionally skipped. Product count, variants, integer prices, migration/persistence, drawer, animal links/video and direct routes remain covered. |

## Performance and delivery tradeoffs

Matched local production measurements use the same Playwright Chromium, viewports and software renderer as the baseline. The initial encoded transfer increased from `2,766,531` to `3,003,059` bytes and requests from 43 to 44; the latest full-page visit increased from `12,359,998` to `13,855,536` bytes and requests from 102 to 106. An earlier candidate full-page run transferred `13,323,165` bytes, consistent with the harness warning that animal-video buffering varies. The adverse initial result is primarily the required fresh music request plus two small basket cues and regenerated posters; no quality setting was reduced to hide it.

Three candidate opening runs retained a 33.4 ms median frame interval. Candidate p95 was 100 ms in all three runs versus 83.4/99.9/83.4 ms in the baseline; candidate maximums were 116.7/133.2/150.1 ms versus 116.7/116.8/100.1 ms. Long intervals over 50 ms were 27/26/25 versus 29/30/30. The worse candidate maxima and slightly lower long-frame counts are both retained; this mixed software-rendered result establishes no confident performance improvement and leaves tail cadence as an adverse observation. These are requestAnimationFrame intervals, not GPU timings or physical-device evidence. Layout shift remained zero, draw calls/triangles stayed 36/24,224, and offscreen rendering still paused without new frames.

## Assets and provenance

- Orchard: Mark Stebnicki, “Trees in Orchard,” Pexels; retained source and licence record.
- Apple: Oliver Harries / Poly Haven `food_apple_01`, CC0; retained model and source record.
- Frame maps: Rob Tuytel / Poly Haven Rough Wood, CC0; retained derivatives.
- Leaf canopy: ambientCG `LeafSet006`, CC0; retained derivative.
- Basket cues: Kenney Interface Sounds `maximize_002.ogg` and `minimize_002.ogg`, CC0. The local delivery files are attenuated 5 dB and encoded as 96 kbps MP3; exact source/delivery SHA-256 values are in `assets/manifest.json`.
- Poster and social-image hashes were updated in `assets/manifest.json` after deterministic recapture from the corrected implementation.

No new runtime dependency, external message, order, payment, analytics integration or generated visual asset was added.

## Validation and limitations

- `npm run build`: passed; the existing lazy Three.js chunk remains above Vite's generic 500 kB raw advisory.
- `npm test`: 62 passed, 2 intentionally skipped; build, desktop and portrait suites completed without failures.
- Visual capture: software-rendered Chromium at matched desktop, portrait, WQHD, narrow and enlarged-text layouts; no console/page errors in the capture runs.
- Browser audio: the review WebM contains the application's Web Audio master from the same interaction run (VP8 video + Opus audio); FFmpeg only muxed that captured stream. Integrated loudness measured `-25.7 LUFS`, true peak `-16.7 dBFS` in the inspected run.

Remaining limitations: physical-phone/GPU, Safari, screen-reader and independent human art-direction/audio approval are not established. Browser autoplay can remain blocked until a qualifying interaction. The licensed orchard is illustrative scenery, not the customer's property or inventory. Publication is not permanent artistic approval.
