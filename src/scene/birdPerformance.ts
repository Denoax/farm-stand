export type BirdHopPhase = 'waiting' | 'anticipation' | 'airborne' | 'landing' | 'recovery' | 'perched'
export type BirdIdleKind = 'look-left' | 'look-right' | 'weight-shift'
export type BirdReactionKind = 'head-tilt' | 'look-turn' | 'full-turn'

export interface BirdEntrancePose {
  progress: number
  x: number
  z: number
  lift: number
  hopIndex: number
  phase: BirdHopPhase
  planted: boolean
}

export interface BirdPerformancePose {
  lift: number
  rootX: number
  rootZ: number
  bodyYaw: number
  bodyRoll: number
  headYaw: number
  headRoll: number
  tailPitch: number
  turnDegrees: number
  planted: boolean
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const smooth = (value: number) => {
  const bounded = clamp01(value)
  return bounded * bounded * (3 - 2 * bounded)
}

export const BIRD_REACTION_DURATIONS: Record<BirdReactionKind, number> = {
  'head-tilt': 980,
  'look-turn': 1380,
  'full-turn': 1840,
}

export const BIRD_IDLE_DURATIONS: Record<BirdIdleKind, number> = {
  'look-left': 920,
  'look-right': 1040,
  'weight-shift': 1120,
}

export function evaluateBirdEntrance(openingProgress: number, portrait: boolean, frameScaleX: number): BirdEntrancePose {
  const progress = clamp01((openingProgress - .43) / .43)
  const scale = portrait ? 1 : frameScaleX
  const positions = portrait
    ? [2.18, 1.52, .42, -.57]
    : [3.52 * scale, 2.76 * scale, 2.15 * scale, 1.75 * scale]
  // Stay fully behind the right post for the first two hops. Only move
  // forward on the counter after the animated envelope has cleared its inner
  // edge, then settle into the roomier turning lane.
  const rearDepth = portrait ? .375 : .40
  // Centre the final perch within the shutter/fascia depth corridor. This
  // leaves room for the skinned tail and wings through every full-turn pose,
  // including the wider portrait silhouette.
  const depths = [rearDepth, rearDepth, rearDepth, .70]
  if (progress <= 0) return { progress, x: positions[0], z: depths[0], lift: 0, hopIndex: 0, phase: 'waiting', planted: true }
  if (progress >= 1) return { progress, x: positions[3], z: depths[3], lift: 0, hopIndex: 2, phase: 'perched', planted: true }

  const hopPosition = progress * 3
  const hopIndex = Math.min(2, Math.floor(hopPosition))
  const local = hopPosition - hopIndex
  const travel = local < .16 ? 0 : local > .78 ? 1 : smooth((local - .16) / .62)
  // On the final hop, clear the post laterally before advancing toward the
  // front of the counter. Coupling both axes from the first frame lets the
  // skinned wing envelope skim the post even when the root path looks clear.
  const depthTravel = hopIndex === 2 && travel < .45 ? 0 : hopIndex === 2 ? smooth((travel - .45) / .55) : travel
  const airborne = local > .16 && local < .78
  const arcProgress = clamp01((local - .16) / .62)
  const lift = airborne ? Math.sin(arcProgress * Math.PI) * (.18 - hopIndex * .018) : 0
  const phase: BirdHopPhase = local < .16
    ? 'anticipation'
    : local < .68
      ? 'airborne'
      : local < .82
        ? 'landing'
        : 'recovery'
  return {
    progress,
    x: positions[hopIndex] + (positions[hopIndex + 1] - positions[hopIndex]) * travel,
    z: depths[hopIndex] + (depths[hopIndex + 1] - depths[hopIndex]) * depthTravel,
    lift,
    hopIndex,
    phase,
    planted: !airborne,
  }
}

const neutralPose = (): BirdPerformancePose => ({
  lift: 0,
  rootX: 0,
  rootZ: 0,
  bodyYaw: 0,
  bodyRoll: 0,
  headYaw: 0,
  headRoll: 0,
  tailPitch: 0,
  turnDegrees: 0,
  planted: true,
})

export function evaluateBirdIdle(kind: BirdIdleKind, progressValue: number): BirdPerformancePose {
  const progress = clamp01(progressValue)
  const pose = neutralPose()
  const thereAndBack = Math.sin(progress * Math.PI)
  if (kind === 'look-left') {
    pose.headYaw = .32 * thereAndBack
    pose.headRoll = .11 * thereAndBack
    pose.tailPitch = -.05 * thereAndBack
  } else if (kind === 'look-right') {
    pose.headYaw = -.28 * thereAndBack
    pose.headRoll = -.09 * thereAndBack
    pose.bodyYaw = -.055 * thereAndBack
  } else {
    pose.rootX = .025 * thereAndBack
    pose.bodyRoll = -.045 * thereAndBack
    pose.headYaw = .1 * thereAndBack
    pose.tailPitch = .08 * thereAndBack
  }
  return pose
}

export function evaluateBirdReaction(kind: BirdReactionKind, progressValue: number): BirdPerformancePose {
  const progress = clamp01(progressValue)
  const pose = neutralPose()
  if (kind === 'head-tilt') {
    const gesture = Math.sin(progress * Math.PI)
    pose.lift = Math.sin(Math.min(1, progress / .72) * Math.PI) * .025
    pose.headYaw = .3 * gesture
    pose.headRoll = .2 * gesture
    pose.bodyRoll = -.045 * gesture
    pose.planted = pose.lift < .002
    return pose
  }
  if (kind === 'look-turn') {
    const gesture = Math.sin(progress * Math.PI)
    const hop = progress > .18 && progress < .72 ? Math.sin((progress - .18) / .54 * Math.PI) : 0
    pose.lift = hop * .055
    pose.bodyYaw = -.68 * gesture
    pose.headYaw = .24 * gesture
    pose.rootX = -.035 * hop
    pose.tailPitch = .08 * gesture
    pose.planted = hop <= .001
    return pose
  }

  // Four short hop-steps provide real intermediate orientations. Yaw only
  // advances while the feet are lifted, then holds through each landing.
  // Finish the fourth step before the gesture timer ends, leaving a brief
  // planted 360-degree pose that makes the completed return readable.
  const motionProgress = Math.min(1, progress / .9)
  const stepPosition = Math.min(3.999999, motionProgress * 4)
  const step = Math.floor(stepPosition)
  const local = stepPosition - step
  const travel = local < .14 ? 0 : local > .7 ? 1 : smooth((local - .14) / .56)
  const turnFraction = motionProgress >= 1 ? 1 : (step + travel) / 4
  const hop = local > .14 && local < .76 ? Math.sin(clamp01((local - .14) / .62) * Math.PI) : 0
  const yaw = turnFraction * Math.PI * 2
  pose.lift = hop * .075
  pose.rootX = hop * Math.sin(yaw) * .035
  pose.rootZ = hop * Math.cos(yaw) * .025
  pose.bodyYaw = yaw
  pose.bodyRoll = hop * Math.sin(yaw) * .035
  pose.headYaw = -.08 * Math.sin(yaw)
  pose.tailPitch = hop * .08
  pose.turnDegrees = turnFraction * 360
  pose.planted = hop <= .001
  return pose
}
