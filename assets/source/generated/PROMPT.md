# Farm setting generation prompt

Built-in OpenAI image generation tool, 25 September 2026.

```text
Use case: photorealistic-natural
Asset type: responsive website hero background plate behind live 3D farm produce
Primary request: create a quiet, sunlit small-farm setting seen from just above the height of an outdoor packing table, with a soft distant market-garden field and simple open timber shelter framing
Scene/backdrop: late summer rural growing rows, softly out of focus, credible unbranded working farm environment; empty foreground area where a live 3D wooden packing table and produce will be composited
Subject: environment only, no hero produce and no people
Style/medium: natural editorial photography, tactile and believable, restrained depth, no cinematic fantasy
Composition/framing: wide 3:2 landscape; broad quiet area across the upper-left for live HTML heading; brightest sun enters from upper left; lower third kept dark-neutral and uncluttered for composited table; center-right distant field remains readable but subdued
Lighting/mood: warm clear morning sun from upper left, gentle atmospheric depth, honest natural contrast, soft greens and straw neutrals
Color palette: leaf green, warm cream, weathered timber, restrained blue sky
Materials/textures: realistic timber posts and distant leaves, subtle lens depth, no artificial grain
Constraints: no logos, no text, no signs, no people, no vehicles, no buildings identifiable as a real business, no foreground fruit or vegetables, no crates, no table, no dramatic sun flare, no watermark; must work as a background layer behind a physically lit live 3D still life
```

The generated output included a usable foreground table despite the exclusion. The implementation accepted that reversible deviation, used it as the scene surface, and did not add a duplicate live table.

## v2.3 harvest layers

Built-in OpenAI image generation tool, 25 September 2026.

The orchard plate requested a wide, photorealistic late-summer orchard in warm morning light, with an apple branch across the upper third, one clear empty attachment point, open grass in the lower middle, and no apples, basket, people, buildings, marks, or text. The 1536×1024 source output was resized to 1920 px and AVIF-encoded for `public/media/harvest-orchard.avif`.

The basket prompt requested one empty, low-handled, weathered wicker apple-harvest basket in front three-quarter view, lit from the upper left, with no fruit, people, marks, or text. A follow-up edit requested transparent alpha; the generator retained a dark graduated background. Rather than misrepresenting that output as transparent, the implementation uses the selected source inside a soft CSS alpha mask. The selected output was resized to 1000 px and WebP-encoded for `public/media/harvest-basket.webp`.

## v2.4 basket extraction

Built-in OpenAI image editing tool, 26 September 2026. The retained v2.3 basket source was supplied as the editing reference.

```text
Use case: background-extraction
Preserve the exact wicker harvest basket: its full geometry, handles, rim, weave, colour, lighting, perspective, and material detail. Remove the entire dark graduated background and every surrounding haze or ground residue. Return the complete basket on genuine transparent alpha, including clean open spaces between handle and weave where visible. Do not redraw, simplify, crop, add fruit, add a floor shadow, add text, add a border, or alter the basket proportions. Keep natural anti-aliased wicker edges without a dark or light halo so it can be composited over both a bright orchard and a dark green test field.
```

The selected 1538×1023 RGBA output was inspected over split light/dark fields, resized to 1200 px width, and WebP-encoded with alpha as `public/media/harvest-basket-v24.webp`. Its source and derivative hashes are recorded in `assets/manifest.json`.

## Treatment A open-stand plates

Built-in OpenAI image editing tool, 26 September 2026. The retained project-original `farm-setting-v1.png` plate was supplied as the visual reference so the camera, shelter, counter, field, and morning-light direction stayed in one physical world.

Desktop production request:

```text
Use the supplied farm-setting plate as a strict camera, architecture, counter, landscape, and light reference. Preserve the exact open timber shelter, field horizon, viewpoint, weathered counter, and warm morning light. Dress only the right side of the counter as a restrained, believable farm stand: one weathered crate of onions and potatoes, carrot bunches with tops, a few small squash, an egg basket, and a folded natural linen. Keep the left and front counter deliberately clear for a live red apple. Match contact shadows, scale, perspective, depth of field, and material response so every object belongs to the photographed set. Natural editorial photography, tactile produce and wood, no visual fantasy. No apples, people, text, signage, logos, vehicles, mismatched light, floating objects, extra structures, or watermark. Wide 3:2 landscape composition with quiet upper-left space for separate HTML copy.
```

Portrait production request, using the selected desktop result as the reference:

```text
Create a deliberate 2:3 portrait companion of this same farm-stand set at the same morning moment. Preserve the shelter construction, weathered counter, field, horizon, produce selection, right-side arrangement, light direction, colour, and photographic treatment. Recompose for portrait rather than mechanically cropping: retain a clear left/lower counter area for the live red apple and quiet upper-left space for separate HTML. The onion-and-potato crate, carrot bunches, squash, egg basket, and linen must remain physically supported with matching contact shadows and scale. No apples, people, text, signage, logos, floating objects, new structures, changed weather, or watermark.
```

Selected source masters are retained outside delivery at `assets/source/generated/market-opening/`. Their SHA-256 hashes and the public AVIF derivative hashes are recorded in `assets/manifest.json`. The first-paint posters are deterministic captures of the implemented shutter, supported live CC0 apple, counter, rails, and lighting—not separately generated art.
