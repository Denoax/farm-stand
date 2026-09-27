export type MarketOpeningShot = 'light' | 'lift' | 'apple-roll' | 'settled' | 'reintroduced'

export interface MarketOpeningState {
  progress: number
  shot: MarketOpeningShot
  shutterLift: number
  cameraPullback: number
  appleRoll: number
  contentReturn: number
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const smoothstep = (value: number) => {
  const clamped = clamp01(value)
  return clamped * clamped * (3 - 2 * clamped)
}
const interval = (progress: number, start: number, end: number) => smoothstep((progress - start) / (end - start))

export function evaluateMarketOpening(progress: number): MarketOpeningState {
  const normalized = clamp01(progress)
  const shot: MarketOpeningShot = normalized < 0.08
    ? 'light'
    : normalized < 0.5
      ? 'lift'
      : normalized < 0.68
        ? 'apple-roll'
        : normalized < 0.895
          ? 'settled'
          : 'reintroduced'

  return {
    progress: normalized,
    shot,
    shutterLift: interval(normalized, 0.06, 0.47),
    cameraPullback: interval(normalized, 0.08, 0.47),
    appleRoll: interval(normalized, 0.5, 0.68),
    contentReturn: interval(normalized, 0.895, 1),
  }
}
