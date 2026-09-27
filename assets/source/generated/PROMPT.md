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

## Permanent-frame registered rear plates

Built-in OpenAI image generation tool, 27 September 2026. The production renderer first captured registration guides at 1536×1024 and 640×960. Those guides, the accepted previous set, and the following exact prompts were supplied to image editing. Guide marks were constraints only and are absent from the selected masters.

Desktop construction prompt:

```text
Use case: precise-object-edit
Asset type: photorealistic desktop background plate rendered behind live Three.js geometry in a responsive website hero
Input images: Image 1 is the accepted farm-world edit target and lighting/style reference. Image 2 is the actual 1536x1024 render guide from the production camera; its live timber and colored guide markings are constraints only and must not appear in the output.
Primary request: Rebuild only the rear world seen through the guide aperture so it registers behind the permanent live fruit-stand frame and counter. Preserve the warm morning farm, horizon, viewpoint, photographic treatment, and plausible produce character of Image 1. Remove every foreground roof, top beam, side post, brace, rail, sill, countertop, counter fascia, and duplicate doorway owned by the live geometry in Image 2.
Scene/backdrop: one modest rural produce display behind the live opening, with supported shallow crates and real-looking onions, potatoes, carrots, squash and eggs. Include a physically connected stationary boarded inner-wall face in the center-right guide region, large and quiet enough for four separate HTML photographic prints. Keep the left guide region calm and legible for real HTML copy.
Composition/framing: exact 3:2 production viewpoint and horizon from the references. The yellow horizontal guide is the live counter contact plane; do not create a second foreground counter edge or table. Anything below it will be occluded by live geometry. Keep useful rear detail above that plane. The cyan region is a wall-location constraint, not a colored object. The red outline marks live-owned edges; keep those regions free of competing structural silhouettes.
Lighting/mood: coherent warm daylight from upper left, believable contact shadows and restrained editorial depth.
Materials/textures: natural untreated weathered straw-grey and tan timber on the rear wall only; longitudinal grain, modest wear, no black stain, orange varnish, rot, repeating stamped texture, or fantasy polish.
Constraints: background plate only; no live frame recreation; no foreground counter; no second roof; no duplicated posts or beams; no interface, text, labels, signs, photos, nails, logo, people, animals, apples, watermark, guide outlines, guide tint, or floating produce. Preserve clean structural relationships and physically supported objects.
```

Desktop cleanup prompt applied to the selected construction candidate:

```text
Use case: precise-object-edit
Asset type: production desktop rear background plate
Input images: Image 1 is the edit target. Image 2 is the production registration guide; its live frame and colored markings must not appear in the output.
Primary request: Make one targeted correction to Image 1: remove all four framed photographs, their frames, mats, pictures, hanging hardware, and the metal flower bucket from the right boarded wall. Reconstruct that entire area as one uninterrupted, empty, weathered natural timber wall face with believable continuous planks and the same sunlight. It must be clear attachment space for four separate real HTML photo links.
Preserve exactly: the 1536x1024 camera, horizon, farm rows, tree, sky, morning light, right wall position and perspective, produce selection, supported crate/shelf arrangement, crop, colour, depth and every other part of Image 1.
Constraints: no photographs, frames, pictures, prints, paper, nails, pins, signs, text, logo, watermark, interface, people, animals, apples, guide marks, or added foreground frame/counter. Do not replace the blank wall with scenery. Do not move or enlarge the wall.
```

Portrait companion prompt:

```text
Use case: compositing
Asset type: deliberate 2:3 portrait production background plate rendered behind live Three.js geometry
Input images: Image 1 is the selected clean desktop rear-world plate and defines the exact farm, light, produce, blank right timber wall, and photographic treatment. Image 2 is the prior accepted portrait composition and camera reference. Image 3 is the actual portrait production render guide; its live frame and colored markings are constraints only and must not appear in the output.
Primary request: Create the portrait companion of Image 1 in the same physical stand and same morning. Recompose for portrait while registering behind the live frame/counter in Image 3. Keep the warm farm horizon and tree, a calm upper-left area for real HTML copy, supported onions/potatoes/carrots/squash/eggs lower in the aperture, and one empty continuous weathered timber wall face in the center-right/lower-right cyan guide region for four separate HTML photo links.
Composition/framing: exact 2:3 production viewport. The yellow line is the live counter contact plane; do not add a second foreground counter or table edge. The red outline is owned by live timber; do not generate roof, top beam, side posts, rails, sill, counter fascia, or duplicate doorway there. Keep essential structure and produce readable without mechanically cropping the desktop.
Lighting/mood: same coherent warm daylight from upper left, natural editorial photography, credible support and contact shadows.
Materials/textures: blank rear wall only in untreated weathered straw-grey/tan timber, visible longitudinal grain, modest wear, no dark stain or orange varnish.
Constraints: no photographs, frames, prints, pictures, nails, pins, interface, text, signs, logo, people, animals, apples, watermark, guide marks, guide tint, floating produce, foreground frame, foreground counter, second roof, duplicated posts or beams.
```

Portrait wall-registration correction:

```text
Use case: precise-object-edit
Asset type: 2:3 portrait production rear background plate
Input images: Image 1 is the edit target. Image 2 is the registration guide only; no guide pixels belong in the result.
Primary request: Make one structural registration correction: extend the same empty weathered timber wall in Image 1 leftward so its straight left edge is at approximately 44 percent of the image width instead of about 55 percent. The wall must remain one physically plausible stationary rear wall with the same vertical boards, perspective, scale, warm sunlight and uninterrupted blank attachment surface. Let the wall replace the newly covered slice of sky/field; keep its lower junction naturally behind the existing supported produce.
Preserve exactly: 1024x1536 portrait camera, horizon, farm, tree, produce, crates, lighting, colour, depth, blank wall character and every other part of Image 1.
Constraints: wall remains blank; no photographs, frames, pictures, paper, nails, pins, signs, text, logo, watermark, interface, people, animals, apples, guide marks, foreground frame, foreground counter, roof, post, beam, or duplicate doorway. Do not move or enlarge the produce.
```

Selected generated outputs:

- desktop: `/home/mani/.codex/generated_images/01a0e031-acc6-7680-9499-27e8c8943f95/exec-76c72e20-3c31-4cf0-9381-d6d1888ad1fb.png`
- portrait: `/home/mani/.codex/generated_images/01a0e031-acc6-7680-9499-27e8c8943f95/exec-d6ecc41f-82d8-4ff5-985c-f3f159a0b38f.png`

Retained ignored masters are `assets/source/generated/permanent-frame/backdrop-desktop-master.png` (`5e82f8a8b71911cfdff2605c3cbbe816e55e61095f012ef7b4ac07af3909a9bc`) and `backdrop-portrait-master.png` (`2d39d01d9cfdd3230675e98fb5bf2f277c43c37df5d0a381d7296da4ed85b353`). The delivery AVIFs are encoded derivatives, not further generated variants.
