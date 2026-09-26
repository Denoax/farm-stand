---
name: farm-stand-review
description: Review the actual farm-stand website through art/commercial and engineering lenses. Verify scene quality, native scroll, usable demo controls, honest contact states, accessibility, fallbacks and measured delivery before reporting completion.
---

# Farm-stand browser review

Use the running local build, not only the source or a designer's description. Read `HANDOFF.md` acceptance criteria. Keep the review compact and focused on defects that affect this experience.

## Art and commercial lens

Inspect opening, transition midpoint, usable product state, pickup preview and contact ending on desktop and portrait. The produce should be convincing and desirable without animation. Check crop, material response, object contact, background competition, type hierarchy and mobile touch layout.

Ask whether the service offer is obvious without completing the scroll, and whether the produce interaction is clearly a demonstration. Verify that no generic slogans, false proof, invented farm data, decorative glass controls or placeholder-looking geometry replaced the approved concept.

Observe normal forward/reverse movement. Stop midway, select the other product, resize and resume. Inspect continuity, duplicate subjects, matte halos, text collisions and sudden state jumps. Captures must show actual visible state, not only progress counters.

## Engineering lens

Check keyboard selection and focus, native page scrolling, anchor links, selected-product persistence, quantity bounds, accessible preview controls, visible labels, readable contrast and no horizontal overflow. Touch/keyboard must not depend on hover or 3D picking.

Reduced motion keeps all useful content without dead pinned space. Check text zoom and narrow screens. Verify effect cleanup/remount behaviour and that hidden scenes do not continue unnecessary work.

Exercise delayed/failed models, images and fonts. Verify the poster-to-render handoff and useful fallback. Simulate WebGL loss where supported and verify restoration or a complete fallback; label untested coverage explicitly. No scene failure may disable the HTML offer or enquiry preview.

Inspect contact mode and the network: no order/payment calls, analytics, leaked input, or fake submission result. Missing business configuration must remain evident and prevent public activation, not block a local demo.

## Measurements and evidence

Use a production-served build for transfer measurements; identify viewport, DPR, browser, renderer and acceleration. Separate cold/warm cache. Record per-scene calls/triangles where relevant and actual requested font/media bytes. Do not infer physical-phone or hardware performance from viewport emulation or SwiftShader.

A sparse recording can show behaviour but not real-time smoothness. Record method and cadence. Avoid intrusive instrumentation during timing; separate screenshot/capture overhead from runtime claims.

Deliver one selected screenshot set and one honest movement demonstration, plus concise `REVIEW.md` and `review-summary.json`. Identify exact implementation state and any dirty files. List remaining high-impact defects separately from tested behaviour. Fix important findings before final packaging when feasible.

Never silently update visual baselines to make tests pass. Do not claim an independent review, hardware run, source download, or observation that did not happen. Final artistic approval belongs to the user.
