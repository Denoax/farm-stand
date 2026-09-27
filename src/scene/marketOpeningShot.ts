export type MarketOpeningShot = 'light' | 'lift' | 'threshold' | 'passage' | 'open' | 'rest'

export interface MarketOpeningState {
  progress: number
  shot: MarketOpeningShot
  shutterLift: number
  passage: number
  passageExit: number
  cameraPullback: number
  appleReveal: number
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const smoothstep = (value: number) => {
  const clamped = clamp01(value)
  return clamped * clamped * (3 - 2 * clamped)
}
const interval = (progress: number, start: number, end: number) => smoothstep((progress - start) / (end - start))

export function evaluateMarketOpening(progress: number): MarketOpeningState {
  const normalized = clamp01(progress)
  const shot: MarketOpeningShot = normalized < 0.12
    ? 'light'
    : normalized < 0.28
      ? 'lift'
      : normalized < 0.48
        ? 'threshold'
        : normalized < 0.66
          ? 'passage'
          : normalized < 0.84
            ? 'open'
            : 'rest'

  return {
    progress: normalized,
    shot,
    shutterLift: interval(normalized, 0.1, 0.49),
    passage: interval(normalized, 0.48, 0.565),
    passageExit: interval(normalized, 0.565, 0.66),
    cameraPullback: interval(normalized, 0.12, 0.48),
    appleReveal: interval(normalized, 0.66, 0.76),
  }
}
