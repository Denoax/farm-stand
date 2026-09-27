export type MarketOpeningShot = 'light' | 'lift' | 'apple-exit' | 'table-exit' | 'settled' | 'reintroduced'

export interface MarketOpeningState {
  progress: number
  shot: MarketOpeningShot
  shutterLift: number
  cameraPullback: number
  appleExit: number
  tableExit: number
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
      : normalized < 0.64
        ? 'apple-exit'
        : normalized < 0.75
          ? 'table-exit'
          : normalized < 0.895
            ? 'settled'
            : 'reintroduced'

  return {
    progress: normalized,
    shot,
    shutterLift: interval(normalized, 0.06, 0.47),
    cameraPullback: interval(normalized, 0.08, 0.47),
    appleExit: interval(normalized, 0.5, 0.63),
    tableExit: interval(normalized, 0.64, 0.74),
    contentReturn: interval(normalized, 0.895, 1),
  }
}
