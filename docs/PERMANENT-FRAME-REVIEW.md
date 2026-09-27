# Permanent fruit-stand frame — production review

## Result

The opening and settled hero now share one permanent timber assembly: top beam, side posts, steel shutter rails, bottom fascia, and counter. The single shutter rises behind it and never performs a second close. The prior live-table exit has been removed. A short apple roll remains supported by the actual mesh envelope, derives rotation from travel distance, and ends behind the left post.

The desktop and portrait rear plates were produced against captures of the real runtime frame/camera guides, then inspected again with the live geometry. They own only the farm, supported rear produce, and attached inner wall; the live scene owns every foreground structural member. The four real destination photographs sit on that wall as separate HTML links with weathered-steel nail heads.

## Interaction and fallback behavior

- One meaningful downward wheel, touch, or page-navigation key starts the 6.5-second sequence.
- The only scroll hold is the initial 900 ms deadline. The copy uses an 850 ms opacity-led departure within that window.
- There is no visible Pause/Resume control. Escape, destination navigation, direct hashes, page hiding, reduced-motion changes, loading failure, and scene failure retain their documented stop/bypass paths.
- First-paint and settled static assets are captures of the same live composition, avoiding an empty stage or a different stand while the apple/WebGL path loads.

## Review evidence

The ignored `evidence/permanent-frame/review/` directory contains normal-speed desktop and portrait recordings, ten sampled states for each opening, DPR 1/2 final views, 1920×1080 and 2560×1440 wide views, nail/paper closeups, reduced-motion output, delayed-model states, model failure, plate failure, WebGL context loss, a runtime error report, and contact sheets. The prior accepted source-state captures are retained separately under `evidence/opening-ui-finish/review/` for matched comparison.

## Validation boundary

The production build and all 38 Playwright cases pass at both configured desktop and portrait projects. Automated functional checks cover the 48-product catalogue, direct hashes, basket variants/persistence/arithmetic, keyboard/hold paths, reduced motion, failure recovery, hidden-tab behavior, and permanent-frame motion invariants. The final capture report contains no unexpected console errors, page errors, or request failures; the four recorded network/console failures are the deliberately aborted model and rear-plate requests.

The matched 1440×900 software-rendered benchmark uses three fresh contexts and the complete unaccelerated opening. The accepted source-state baseline recorded 16.7 ms median requestAnimationFrame intervals, 50.1–66.6 ms p95 intervals, and 100–116.7 ms maxima. The permanent textured frame records 49.9 ms medians, 100 ms p95 values, and 133.3 ms maxima, with 34–36 intervals above 50 ms. These are frame intervals under SwiftShader, not CPU or GPU timings, and they are an adverse result rather than a physical-device claim.

The initial-load encoded body increased from 1,230,139 to 2,147,403 bytes, chiefly from the registered plates, complete fallback, and 18 small timber-map derivatives. Layout shift decreased from 0.00859 to 0.00263. A first implementation produced 186 draw calls; consolidating each rounded timber board from six redundant material groups to one mapped material reduced that to 36, close to the source state's 31, without removing diffuse, OpenGL normal, roughness, shadows, or rounded geometry. SwiftShader cadence did not materially improve, so the visual material treatment is retained and the software-rendering regression is reported rather than hidden by lowering output quality.

The hold's authored deadline remains 900 ms and never reacquires. DOM-observed release under this same overloaded software-rendering run was 1,153–1,169 ms, versus 1,057–1,060 ms in the accepted source-state measurement; timer scheduling under this harness therefore overshot the nominal deadline. Functional tests still verify that the hold preserves position, releases, never repeats, and releases immediately on every interruption path.

The rendered review uses project Playwright Chromium with software rendering; it does not substitute for physical-phone, Safari, hardware-GPU, screen-reader, or independent human art-direction review.

The lazy Three.js chunk remains above Vite's generic raw 500 kB advisory. Removing the visible motion control also means touch users have destination navigation but no dedicated on-screen pause for the short automatic sequence; reduced-motion users bypass it.
