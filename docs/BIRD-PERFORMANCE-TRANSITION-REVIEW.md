# Bird performance and transition review

This review covers the focused work requested against reviewed commit
`4bf3419f1eadc40d9da26b4673d8d40b60d879cd`. It does not claim permanent
artistic approval.

## Delivered behavior

- A leaf handoff is owned by one immutable run ID. Parent renders, repeated
  wheel input, touch input, resize events and unrelated header state changes do
  not reload, seek or replay the active video. Destination commit and scroll
  unlock happen once, beneath an opaque source-frame hold.
- Both supplied leaf videos retain their source composition, play at `1.35x`,
  and use a reproducible black-key cleanup that contracts only fractional edge
  alpha. The source identity and native dark leaf interiors are retained.
- The supplied Bird Orange asset keeps its skinning, texture and `Take 001`.
  Three supported hops clear the complete right-side structure, quiet idle
  actions are separated by rests, and click, tap or keyboard activation cycles
  through two compact reactions and a four-step full turn. The turn reaches
  360 degrees and returns to the original planted root.
- The apple roll now has one travel-owned wood-roll voice. It starts from the
  corresponding offset if playback begins mid-travel and stops on rest,
  reversal, skip, hidden-document interruption or unmount.
- The two specified market passages are absent. A compact decorative hen, cow
  and sheep doodle group uses locally delivered Icons8 assets and retains the
  provider link in the site footer.

## Evidence

The capture script is `scripts/capture-bird-performance-review.mjs`. Its report
and review media are under `evidence/bird-performance/review/` in the local
review workspace and in the separately delivered review ZIP.

- Desktop bird route: cumulative minimum structure clearance `0.0579`, apple
  clearance `3.8641`, and planted support margin `0.0976` scene units.
- Portrait bird route: cumulative minimum structure clearance `0.0329`, apple
  clearance `0.3185`, and planted support margin `0.0726` scene units.
- Both runs end planted at root offset `(0, 0)` after a recorded `360.00` degree
  turn. The final planted orientation must render and remain visible for 220 ms
  before the controller returns to neutral, including under a throttled frame
  cadence. The desktop recording observes five idle actions across 15.96 seconds.
- The desktop normal-speed WebM contains VP8 video and an Opus browser-audio
  track. Its same-run event record includes shutter, apple-roll, three bird
  reactions and leaf cues.
- Each recorded handoff has one run, one load, one initial seek, one play, one
  covered event, one destination commit, one reveal and one termination.
- Native-size matte frames and alpha measurements are supplied over cream and
  dark-green backgrounds. The opaque holds were inspected at the actual commit
  frames for both routes.
- Post clearance uses the Euclidean separation of the skinned bird and timber
  AABBs at the corner rather than switching discontinuously between projected
  X and Z gaps.

## Validation

`CI=1 npm test` completed on the final local tree with 77 passing and 13
deliberately skipped tests.
The suite covers the stressed handoff lifecycle, shop and animal routes,
visibility and media failures, leaf-sound cancellation, apple-roll audio stop
paths, bird input/queueing/contact diagnostics, portrait support, reduced
motion, all 48 products, direct links and basket persistence/arithmetic. The
two timing-sensitive event/phase observations also passed three focused repeat
runs apiece, and the production build passed. Vite continues to report its
pre-existing generic
warning for the lazy Three.js chunk (about 645 kB uncompressed).

## Review boundaries

The visual and motion checks used software-driven Chromium at 1440 by 900 and
390 by 844. They are not physical-device, Safari, assistive-technology or GPU
performance certification. Browser audio routing, timing and captured samples
are evidenced, but no human headphone audition is claimed. Bird rights are
recorded exactly as user-provided clearance because the supplied archive did
not contain a named licence document. Human judgment remains authoritative for
the final visual and auditory character.
