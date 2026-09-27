import { useCallback, useEffect, useRef, useState } from 'react'
import { farmLifeProfiles, type FarmLifeId } from '../content/farmLife'

interface FarmLifeProps {
  onViewProduct: (productId: 'eggs') => void
}

function FarmProfileScene({ profile, index, active, onActivate, onViewProduct }: {
  profile: (typeof farmLifeProfiles)[number]
  index: number
  active: boolean
  onActivate: (id: FarmLifeId) => void
  onViewProduct: (productId: 'eggs') => void
}) {
  const sceneRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [mediaFailed, setMediaFailed] = useState(false)
  const [mediaReady, setMediaReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [ended, setEnded] = useState(false)
  const [manualPlay, setManualPlay] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(() => {
    const target = decodeURIComponent(window.location.hash.slice(1))
    return target === profile.id || (target === 'farm-life' && index === 0)
  })

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    let frame = 0
    const update = () => {
      frame = 0
      const bounds = scene.getBoundingClientRect()
      const range = Math.max(scene.offsetHeight - innerHeight, 1)
      scene.style.setProperty('--profile-progress', Math.min(1, Math.max(0, -bounds.top / range)).toFixed(4))
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    addEventListener('scroll', schedule, { passive: true })
    addEventListener('resize', schedule)
    return () => { cancelAnimationFrame(frame); removeEventListener('scroll', schedule); removeEventListener('resize', schedule) }
  }, [])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || !('IntersectionObserver' in window)) { setShouldLoad(true); return }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setShouldLoad(true)
      observer.disconnect()
    }, { rootMargin: '900px 0px' })
    observer.observe(scene)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!active || document.hidden || (!manualPlay && reducedMotion) || ended || mediaFailed) {
      video.pause()
      return
    }
    void video.play().catch(() => setPlaying(false))
  }, [active, ended, manualPlay, mediaFailed, shouldLoad])

  const requestPlay = () => {
    const video = videoRef.current
    if (!video) return
    if (ended) { video.currentTime = 0; setEnded(false) }
    setManualPlay(true)
    onActivate(profile.id)
    requestAnimationFrame(() => { void video.play().catch(() => setPlaying(false)) })
  }

  return (
    <article className={`farm-profile farm-profile--${profile.id} farm-profile--${profile.variant}`} id={profile.id} ref={sceneRef} data-media-ready={mediaReady ? 'true' : 'false'} data-video-active={active ? 'true' : 'false'}>
      <div className="farm-profile__sticky">
        <figure className="farm-profile__figure">
          <div className="farm-profile__placeholder" aria-hidden="true" />
          <video ref={videoRef} className="farm-profile__image farm-profile__image--wide" src={shouldLoad && !mediaFailed ? profile.video : undefined} poster={profile.poster} muted playsInline preload="metadata" aria-label={profile.alt} style={{ objectPosition: profile.imagePosition }} onLoadedData={() => setMediaReady(true)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setEnded(true) }} onError={() => { setMediaFailed(true); setPlaying(false) }} />
          {mediaFailed && <span className="media-fallback" role="img" aria-label={`${profile.label} video unavailable. ${profile.alt}`}>{profile.label} video unavailable</span>}
          {!mediaFailed && (!playing || ended) && <button className="farm-profile__play" type="button" onClick={requestPlay}>{ended ? 'Replay scene' : 'Play scene'}</button>}
          <div className="farm-profile__foreground" aria-hidden="true"><i /><i /></div>
          <figcaption>{profile.credit}</figcaption>
        </figure>
        <div className="farm-profile__copy">
          <p className="farm-profile__number">0{index + 1} / 03</p>
          <p className="eyebrow eyebrow--light">Around the farm · licensed illustrative video</p>
          <h2>{profile.heading}</h2>
          <p>{profile.description}</p>
          <a className="text-link" href={profile.link} onClick={profile.id === 'hens' ? (event) => { event.preventDefault(); onViewProduct('eggs') } : undefined}>{profile.linkLabel} <span aria-hidden="true">{profile.id === 'hens' ? '↓' : '↗'}</span></a>
        </div>
      </div>
    </article>
  )
}

export function FarmLife({ onViewProduct }: FarmLifeProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const visibilityRef = useRef(new Map<FarmLifeId, number>())
  const [activeId, setActiveId] = useState<FarmLifeId>()
  const activate = useCallback((id: FarmLifeId) => setActiveId(id), [])

  useEffect(() => {
    const section = sectionRef.current
    if (!section || !('IntersectionObserver' in window)) return
    const chooseActive = () => {
      if (document.hidden) { setActiveId(undefined); return }
      const active = [...visibilityRef.current.entries()].filter(([, ratio]) => ratio > 0).sort((a, b) => b[1] - a[1])[0]
      setActiveId(active?.[0])
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) visibilityRef.current.set(entry.target.id as FarmLifeId, entry.isIntersecting ? entry.intersectionRatio : 0)
      chooseActive()
    }, { threshold: [0, .15, .3, .5, .7] })
    section.querySelectorAll<HTMLElement>('.farm-profile').forEach((scene) => observer.observe(scene))
    document.addEventListener('visibilitychange', chooseActive)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', chooseActive) }
  }, [])

  return (
    <section className="farm-life" id="farm-life" aria-labelledby="farm-life-heading" ref={sectionRef}>
      <div className="farm-life__chapter-nav">
        <div><p className="eyebrow eyebrow--light">Around the farm</p><h2 id="farm-life-heading">Farm life, one scene at a time.</h2></div>
        <nav aria-label="Farm-life scenes">{farmLifeProfiles.map((profile) => <a key={profile.id} href={`#${profile.id}`}>{profile.label}</a>)}</nav>
        <p className="visually-hidden">Licensed illustrative videos; they do not show a client or this fictional property.</p>
      </div>
      {farmLifeProfiles.map((profile, index) => <FarmProfileScene key={profile.id} profile={profile} index={index} active={activeId === profile.id} onActivate={activate} onViewProduct={onViewProduct} />)}
    </section>
  )
}
