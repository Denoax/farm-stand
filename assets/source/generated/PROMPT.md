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
