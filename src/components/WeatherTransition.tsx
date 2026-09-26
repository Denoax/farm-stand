import { useEffect, useRef, useState } from 'react'

interface WeatherTransitionProps {
  motionPaused: boolean
  onToggleMotion: () => void
}

const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

export function WeatherTransition({ motionPaused, onToggleMotion }: WeatherTransitionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoFailed, setVideoFailed] = useState(false)

  useEffect(() => {
    const section = sectionRef.current
    const video = videoRef.current
    if (!section) return

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let visible = false

    const syncPlayback = () => {
      if (!visible || document.hidden || motionPaused || reducedMotion.matches || videoFailed) {
        video?.pause()
        return
      }
      void video?.play().catch(() => undefined)
    }

    const update = () => {
      frame = 0
      const bounds = section.getBoundingClientRect()
      const range = Math.max(section.offsetHeight - innerHeight, 1)
      const progress = Math.min(1, Math.max(0, -bounds.top / range))
      section.style.setProperty('--weather-progress', progress.toFixed(4))
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      section.dataset.visible = visible ? 'true' : 'false'
      syncPlayback()
    }, { rootMargin: '80px 0px' })

    update()
    observer.observe(section)
    addEventListener('scroll', schedule, { passive: true })
    addEventListener('resize', schedule)
    document.addEventListener('visibilitychange', syncPlayback)
    reducedMotion.addEventListener('change', syncPlayback)
    syncPlayback()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      video?.pause()
      removeEventListener('scroll', schedule)
      removeEventListener('resize', schedule)
      document.removeEventListener('visibilitychange', syncPlayback)
      reducedMotion.removeEventListener('change', syncPlayback)
    }
  }, [motionPaused, videoFailed])

  return (
    <section className="weather-story" aria-label="A short rain shower clears into the farm-life scene" ref={sectionRef} data-media-state={videoFailed ? 'fallback' : 'video'}>
      <div className="weather-story__sticky">
        {!videoFailed && (
          <video
            ref={videoRef}
            className="weather-story__video"
            muted
            loop
            playsInline
            preload="metadata"
            poster={publicAsset('media/weather-rain-poster.avif')}
            onError={() => setVideoFailed(true)}
            aria-hidden="true"
          >
            <source src={publicAsset('media/weather-rain.mp4')} type="video/mp4" />
          </video>
        )}
        <div className="weather-story__poster" aria-hidden="true" />
        <div className="weather-story__clear" aria-hidden="true">
          <img src={publicAsset('media/farm-life/hens-v24.avif')} alt="" width="1920" height="1280" loading="lazy" decoding="async" />
        </div>
        <div className="weather-story__water" aria-hidden="true"><i /><i /><i /></div>
        <div className="weather-story__label" aria-hidden="true">
          <span>Rain over the field</span>
        </div>
        <div className="weather-story__controls">
          <a className="text-link" href="#farm-life">Meet the hens ↓</a>
          <button type="button" onClick={onToggleMotion}>{motionPaused ? 'Use full motion' : 'Pause motion'}</button>
        </div>
      </div>
    </section>
  )
}
