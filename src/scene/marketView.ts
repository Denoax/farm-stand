export interface MarketView {
  portrait: boolean
  frameScaleX: number
  fov: number
  camera: { x: number; y: number; z: number }
  target: { x: number; y: number; z: number }
  orchard: { xPercent: number; yPercent: number; scale: number }
}

const mix = (from: number, to: number, amount: number) => from + (to - from) * amount
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))

/** Shared projection/crop decisions for the live threshold and orchard plate.
 * Values are explicit per aspect family so portrait is composed, not squeezed. */
export function marketView(width: number, height: number, pullback: number): MarketView {
  const aspect = width / Math.max(height, 1)
  const portrait = width < 700
  if (portrait) {
    return {
      portrait,
      frameScaleX: 0.48,
      fov: 32,
      camera: { x: 0.05, y: 0.28, z: mix(8.92, 9.32, pullback) },
      target: { x: 0.02, y: -0.08, z: 0.5 },
      orchard: { xPercent: 50, yPercent: 50, scale: 1 },
    }
  }
  return {
    portrait,
    frameScaleX: clamp(aspect / 1.48, 1, 1.22),
    fov: 32,
    camera: { x: mix(0.16, 0, pullback), y: mix(0.14, 0.24, pullback), z: mix(7.55, 8.08, pullback) },
    target: { x: 0, y: -0.08, z: 0.5 },
    orchard: { xPercent: 50, yPercent: 52, scale: 1 },
  }
}
