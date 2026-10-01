# Meadow, envelope and looping-film review

## Source state and scope

- Reviewed baseline: `f505792c944bfd4ef9ce96d1eaa81c2409675d0e` (`main`, clean before work).
- Scope: only the living-farm album and the visiting/service sections that follow it.
- The optional `Farm-Stand-Meadow-and-Envelope-Finish` package, `reference/meadow-reference.png`, `reference/envelope-reference.png`, and `SOURCE-NOTES.md` were not present in Downloads or the attachment store during implementation. The complete standalone brief was available and controlled the implementation. No claim of pixel-level comparison with the missing images is made.

## Delivered behavior

- The animal album now uses a pale yellow-green, edge-detailed CSS meadow treatment with two still, original inline-SVG margin studies. No new image asset, renderer, parallax layer or animated ornament was added.
- The local Hens/Cattle/Sheep navigation and per-film Play/Pause/Replay/Hear rows are removed. Real IDs, contextual links, hero Polaroid navigation and hens-to-eggs behavior remain.
- The retained muted films use their stable existing video elements with native `loop`. One compact section-level control owns user pause intent. Only the most-visible eligible film plays; overlays, offscreen state and hidden tabs pause it. Reduced motion starts still and permits explicit opt-in.
- `#visit` is one sealed cream envelope with a finite two-shiver invitation, hinged flap, occluding front pocket and content-sized letter extraction. Direct `#visit`, reduced motion and hidden-tab interruption fail open to useful content. The one paper sound is routed through the existing interface-sound system.
- The exact obsolete visiting/service/sign copy is removed. Visiting hours are the letter's dominant facts, the service proof is larger and editorial, and the controlled hours sign is materially larger without changing basket collection data.

## Provenance

- No external image, audio, font, video or code asset was added in this patch.
- Meadow layers and the two margin sketches are original CSS/SVG authored in `FarmLife.css` and `FarmLife.tsx`; they are not derivatives of an unseen reference file.
- The envelope is real HTML plus original CSS geometry in `VisitSection.tsx` and `AfterAlbum.css`; the absent four-state reference sheet was not pasted, traced or attributed.
- The three retained Pexels films and posters are unchanged. Their existing creator/source record remains in `src/content/farmLife.ts`, the visible footer credits and prior project records.
- Existing local pen/paper derivatives are reused for envelope activation through `details-open`/`details-close`; no audio mix or source was changed.

## Validation

- Production build: passed. The existing lazy Three.js chunk still triggers Vite's generic raw-size advisory.
- Integrated Playwright suite: **112 passed, 16 intentionally project-scoped skips**, desktop and portrait Chromium, one deterministic worker.
- Each retained film completed two observed native wraps at playback rate `1`; it remained playing, retained the same source element and emitted no animal cue at the boundary.
- Shared pause/resume, overlay pause, hidden-tab return, rejected/failed media retry, reduced-motion opt-in, direct animal hashes, hero transition arrival, hens-to-eggs and basket preservation passed.
- Envelope closed/open/direct/reduced-motion states, keyboard button semantics, one content tree, paper cue, phone/desktop layout and 200% text overflow checks passed.
- Hours valid, invalid and reset states passed without changing basket storage.
- Final capture report recorded no console errors, page errors or unexpected request failures. The desktop interaction recording contains the same-run browser Web Audio master; FFmpeg only muxed it with the Playwright video.

## Visual findings and limitations

- Matched local captures cover 1440×900, 390×844 and 1920×900. Album spacing is reduced while the films retain their accepted scale; the motion control and margin sketches do not overlap content at those sizes.
- The native retained-film joins are reliable but not seamless. Hens has the clearest subject-position jump; cattle and sheep retain smaller forward-motion jumps. No reverse playback, broad dissolve or dual-video concealment was added.
- The exact meadow/envelope reference-image match remains unverified because those two files were unavailable. This is the main reference-fidelity limitation.
- Review used software-rendered Chromium. Physical-phone, hardware-GPU, Safari, screen-reader, independent listening and independent artistic approval remain outstanding.

## Evidence

Ignored local evidence is under `evidence/meadow-envelope/`: matched baseline/final stills, closed/mid-hinge/mid-extraction/open envelope frames, loop end/start comparisons, the capture report, and normal-speed desktop/portrait recordings. The desktop recording contains actual application audio from the same run.
