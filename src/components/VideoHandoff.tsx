import { useEffect, useRef, type CSSProperties } from 'react'

export type HandoffPhase = 'preparing' | 'covering' | 'covered' | 'revealing'
export type HandoffKind = 'shop' | 'animals'

export interface HandoffClip {
  kind: HandoffKind
  src: string
  coverStart: number
  coverEnd: number
  scale: number
}

interface VideoHandoffProps {
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

export function VideoHandoff({ clip, phase, onReady, onCovered, onRevealing, onEnded, onFailed, onMediaTime, onSoundStop }: VideoHandoffProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const readyRef = useRef(false)
  const coveredRef = useRef(false)
  const revealingRef = useRef(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    readyRef.current = false
    coveredRef.current = false
    revealingRef.current = false
    video.load()
  }, [clip.src])

  useEffect(() => {
    if (phase !== 'covering') return
    const video = videoRef.current
    if (!video) return
    coveredRef.current = false
    revealingRef.current = false
    video.currentTime = 0
    void video.play().catch(onFailed)
  }, [onFailed, phase])

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
      onMediaTime(clip.kind, mediaTime)
      if (!coveredRef.current && mediaTime >= clip.coverStart && mediaTime <= clip.coverEnd) {
        coveredRef.current = true
        if (wrapperRef.current) wrapperRef.current.dataset.coverTime = mediaTime.toFixed(4)
        onCovered()
      }
      if (coveredRef.current && !revealingRef.current && mediaTime > clip.coverEnd) {
        revealingRef.current = true
        onRevealing()
      }
      if (!coveredRef.current && mediaTime > clip.coverEnd) onFailed()
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
  }, [clip.coverEnd, clip.coverStart, clip.kind, onCovered, onFailed, onMediaTime, onRevealing, phase])

  useEffect(() => {
    if (phase === 'revealing') onSoundStop()
  }, [onSoundStop, phase])

  useEffect(() => onSoundStop, [onSoundStop])

  const style = { '--handoff-scale': clip.scale } as CSSProperties

  return (
    <div ref={wrapperRef} className="video-handoff" data-handoff-kind={clip.kind} data-handoff-phase={phase} style={style} aria-hidden="true">
      <video
        ref={videoRef}
        src={clip.src}
        muted
        playsInline
        preload="auto"
        onCanPlay={() => {
          if (readyRef.current) return
          readyRef.current = true
          onReady()
        }}
        onEnded={() => { onSoundStop(); onEnded() }}
        onError={() => { onSoundStop(); onFailed() }}
      />
    </div>
  )
}
