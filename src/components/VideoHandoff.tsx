import { useEffect, useRef, type CSSProperties } from 'react'

export type HandoffPhase = 'preparing' | 'covering' | 'covered' | 'revealing'
export type HandoffKind = 'shop' | 'animals'

export interface HandoffClip {
  kind: HandoffKind
  src: string
  holdSrc: string
  coverStart: number
  coverEnd: number
  scale: number
  playbackRate: number
}

interface VideoHandoffProps {
  runId: number
  targetId: string
  clip: HandoffClip
  phase: HandoffPhase
  onReady: () => void
  onCovered: () => void
  onRevealing: () => void
  onEnded: () => void
  onFailed: () => void
  onMediaTime: (kind: HandoffKind, mediaTime: number) => void
  onSoundStop: () => void
}

export function VideoHandoff({ runId, targetId, clip, phase, onReady, onCovered, onRevealing, onEnded, onFailed, onMediaTime, onSoundStop }: VideoHandoffProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const readyRef = useRef(false)
  const videoReadyRef = useRef(false)
  const holdReadyRef = useRef(false)
  const coveredRef = useRef(false)
  const revealingRef = useRef(false)
  const startedRunRef = useRef<number | undefined>(undefined)
  const callbacksRef = useRef({ onReady, onCovered, onRevealing, onEnded, onFailed, onMediaTime, onSoundStop })
  const countersRef = useRef({ loads: 0, seeks: 0, plays: 0 })
  callbacksRef.current = { onReady, onCovered, onRevealing, onEnded, onFailed, onMediaTime, onSoundStop }

  const trace = (event: string, mediaTime = videoRef.current?.currentTime ?? 0) => {
    const wrapper = wrapperRef.current
    if (wrapper) {
      wrapper.dataset.loadCount = String(countersRef.current.loads)
      wrapper.dataset.seekCount = String(countersRef.current.seeks)
      wrapper.dataset.playCount = String(countersRef.current.plays)
    }
    window.dispatchEvent(new CustomEvent('farmstandhandofftrace', {
      detail: {
        runId,
        event,
        phase,
        kind: clip.kind,
        destination: targetId,
        videoId: `${clip.kind}-${runId}`,
        mediaTime,
        ...countersRef.current,
      },
    }))
  }

  const notifyReady = () => {
    if (readyRef.current || !videoReadyRef.current || !holdReadyRef.current) return
    readyRef.current = true
    trace('ready')
    callbacksRef.current.onReady()
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    readyRef.current = false
    videoReadyRef.current = false
    coveredRef.current = false
    revealingRef.current = false
    if (wrapperRef.current) wrapperRef.current.dataset.coverHold = 'hidden'
    countersRef.current.loads += 1
    video.load()
    trace('load')
  // A run owns one video element and one explicit load. Callback identity is
  // deliberately absent: parent renders cannot reinitialize media state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip.src, runId])

  useEffect(() => {
    if (phase !== 'covering' || startedRunRef.current === runId) return
    const video = videoRef.current
    if (!video) return
    startedRunRef.current = runId
    coveredRef.current = false
    revealingRef.current = false
    video.playbackRate = clip.playbackRate
    countersRef.current.seeks += 1
    video.currentTime = 0
    countersRef.current.plays += 1
    trace('play')
    void video.play().catch(() => callbacksRef.current.onFailed())
  }, [clip.playbackRate, phase, runId])

  useEffect(() => {
    // Once reveal begins the destination is already committed and the leaf
    // voice has been stopped. Do not resume media-time callbacks from the
    // revealing phase or they can create a second, stale rustle bed.
    if (phase !== 'covering' && phase !== 'covered') return
    const video = videoRef.current
    if (!video) return
    let frameHandle = 0
    let animationFrame = 0

    const inspect = (mediaTime: number) => {
      if (wrapperRef.current) wrapperRef.current.dataset.mediaTime = mediaTime.toFixed(4)
      callbacksRef.current.onMediaTime(clip.kind, mediaTime)
      if (!coveredRef.current && mediaTime >= clip.coverStart && mediaTime <= clip.coverEnd) {
        coveredRef.current = true
        if (wrapperRef.current) wrapperRef.current.dataset.coverTime = mediaTime.toFixed(4)
        if (wrapperRef.current) wrapperRef.current.dataset.coverHold = 'visible'
        trace('covered', mediaTime)
        callbacksRef.current.onCovered()
      }
      if (coveredRef.current && !revealingRef.current && mediaTime > clip.coverEnd) {
        revealingRef.current = true
        if (wrapperRef.current) wrapperRef.current.dataset.coverHold = 'hidden'
        trace('revealing', mediaTime)
        callbacksRef.current.onRevealing()
      }
      if (!coveredRef.current && mediaTime > clip.coverEnd) callbacksRef.current.onFailed()
    }

    const callbackVideo = video as HTMLVideoElement & {
      requestVideoFrameCallback?: (callback: VideoFrameRequestCallback) => number
      cancelVideoFrameCallback?: (handle: number) => void
    }
    if (callbackVideo.requestVideoFrameCallback) {
      const callback = (_now: DOMHighResTimeStamp, metadata: VideoFrameCallbackMetadata) => {
        inspect(metadata.mediaTime)
        if (!video.ended) frameHandle = callbackVideo.requestVideoFrameCallback!(callback)
      }
      frameHandle = callbackVideo.requestVideoFrameCallback(callback)
      return () => callbackVideo.cancelVideoFrameCallback?.(frameHandle)
    }

    const tick = () => {
      inspect(video.currentTime)
      if (!video.ended) animationFrame = requestAnimationFrame(tick)
    }
    animationFrame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animationFrame)
  }, [clip.coverEnd, clip.coverStart, clip.kind, phase, runId])

  useEffect(() => {
    if (phase !== 'revealing') return
    callbacksRef.current.onSoundStop()
    // Some throttled/headless browsers defer the muted video's final decoded
    // frames and `ended` event after the destination is already committed.
    // Preserve the visible reopening when it advances normally, but never let
    // that tail retain the input gate indefinitely.
    const revealFallback = window.setTimeout(() => callbacksRef.current.onEnded(), 1800)
    return () => window.clearTimeout(revealFallback)
  }, [phase, runId])

  useEffect(() => () => callbacksRef.current.onSoundStop(), [runId])

  const style = { '--handoff-scale': clip.scale } as CSSProperties

  return (
    <div ref={wrapperRef} className="video-handoff" data-handoff-kind={clip.kind} data-handoff-phase={phase} data-run-id={runId} data-video-id={`${clip.kind}-${runId}`} data-playback-rate={clip.playbackRate} style={style} aria-hidden="true">
      <img
        className="video-handoff__hold"
        src={clip.holdSrc}
        alt=""
        onLoad={() => { holdReadyRef.current = true; notifyReady() }}
        onError={() => callbacksRef.current.onFailed()}
      />
      <video
        ref={videoRef}
        src={clip.src}
        muted
        playsInline
        preload="auto"
        onCanPlay={() => {
          videoReadyRef.current = true
          notifyReady()
        }}
        onEnded={() => { if (wrapperRef.current) wrapperRef.current.dataset.coverHold = 'hidden'; trace('ended'); callbacksRef.current.onSoundStop(); callbacksRef.current.onEnded() }}
        onError={() => { if (wrapperRef.current) wrapperRef.current.dataset.coverHold = 'hidden'; trace('error'); callbacksRef.current.onSoundStop(); callbacksRef.current.onFailed() }}
      />
    </div>
  )
}
