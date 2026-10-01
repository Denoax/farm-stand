import { useCallback, useEffect, useRef, useState } from 'react'
import { farmLifeProfiles, type FarmLifeId } from '../content/farmLife'
import './FarmLife.css'

interface FarmLifeProps {
  onViewProduct: (productId: 'eggs') => void
  onHearAnimal: (animal: FarmLifeId) => void
  handoffActive: boolean
  handoffTarget?: string
}

type FrameCallbackVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: VideoFrameRequestCallback) => number
  cancelVideoFrameCallback?: (handle: number) => void
}

function initialTarget() {
  try {
    return decodeURIComponent(window.location.hash.slice(1))
  } catch {
    return ''
  }
}

function FarmAlbumEntry({
  profile,
  active,
  blocked,
  reducedMotion,
  directArrival,
  onActivate,
  onViewProduct,
  onHearAnimal,
}: {
  profile: (typeof farmLifeProfiles)[number]
  active: boolean
  blocked: boolean
  reducedMotion: boolean
  directArrival: boolean
  onActivate: (id: FarmLifeId) => void
  onViewProduct: (productId: 'eggs') => void
  onHearAnimal: (animal: FarmLifeId) => void
}) {
  const articleRef = useRef<HTMLElement>(null)
  const filmRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<FrameCallbackVideo>(null)
  const frameCallbackRef = useRef<number | undefined>(undefined)
  const fallbackFrameRef = useRef<number | undefined>(undefined)
  const playRequestRef = useRef(0)
  const activeRef = useRef(active)
  const blockedRef = useRef(blocked)
  const userPausedRef = useRef(false)
  const endedRef = useRef(false)
  const skipSettleRef = useRef(initialTarget() === profile.id || directArrival)
  const [shouldLoad, setShouldLoad] = useState(() => initialTarget() === profile.id || initialTarget() === 'farm-life' && profile.id === 'hens')
  const [posterReady, setPosterReady] = useState(false)
  const [posterFailed, setPosterFailed] = useState(false)
  const [framePresented, setFramePresented] = useState(false)
  const [mediaFailed, setMediaFailed] = useState(false)
  const [retryUsed, setRetryUsed] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [ended, setEnded] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const [manualPlayback, setManualPlayback] = useState(false)
  const [paperState, setPaperState] = useState<'waiting' | 'settling' | 'settled'>(() => skipSettleRef.current || reducedMotion ? 'settled' : 'waiting')

  activeRef.current = active
  blockedRef.current = blocked
  userPausedRef.current = userPaused
  endedRef.current = ended

  useEffect(() => {
    if (!directArrival) return
    skipSettleRef.current = true
    setShouldLoad(true)
    setPaperState('settled')
  }, [directArrival])

  useEffect(() => {
    const handleDirectHash = () => {
      if (initialTarget() !== profile.id) return
      skipSettleRef.current = true
      setShouldLoad(true)
      setPaperState('settled')
    }
    addEventListener('hashchange', handleDirectHash)
    return () => removeEventListener('hashchange', handleDirectHash)
  }, [profile.id])

  useEffect(() => {
    const article = articleRef.current
    if (!article || shouldLoad) return
    if (!('IntersectionObserver' in window)) {
      setShouldLoad(true)
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setShouldLoad(true)
      observer.disconnect()
    }, { rootMargin: '700px 0px' })
    observer.observe(article)
    return () => observer.disconnect()
  }, [shouldLoad])

  useEffect(() => {
    const film = filmRef.current
    if (!film || paperState !== 'waiting') return
    if (reducedMotion || skipSettleRef.current) {
      setPaperState('settled')
      return
    }
    if (!posterReady && !posterFailed) return
    if (!('IntersectionObserver' in window)) {
      setPaperState('settled')
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      const visiblyUseful = entry.intersectionRect.height >= Math.min(180, innerHeight * .28)
      if (!entry.isIntersecting || !visiblyUseful) return
      setPaperState(skipSettleRef.current ? 'settled' : 'settling')
      observer.disconnect()
    }, { threshold: [0, .2, .35, .5] })
    observer.observe(film)
    return () => observer.disconnect()
  }, [paperState, posterFailed, posterReady, reducedMotion])

  const markFramePresented = useCallback(() => {
    setFramePresented(true)
    setMediaFailed(false)
  }, [])

  const registerPresentedFrame = useCallback(() => {
    const video = videoRef.current
    if (!video || framePresented) return
    if (frameCallbackRef.current !== undefined) video.cancelVideoFrameCallback?.(frameCallbackRef.current)
    if (video.requestVideoFrameCallback) {
      frameCallbackRef.current = video.requestVideoFrameCallback(() => markFramePresented())
      return
    }
    fallbackFrameRef.current = requestAnimationFrame(() => {
      fallbackFrameRef.current = requestAnimationFrame(markFramePresented)
    })
  }, [framePresented, markFramePresented])

  useEffect(() => () => {
    const video = videoRef.current
    if (frameCallbackRef.current !== undefined) video?.cancelVideoFrameCallback?.(frameCallbackRef.current)
    if (fallbackFrameRef.current !== undefined) cancelAnimationFrame(fallbackFrameRef.current)
    playRequestRef.current += 1
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const canPlay = active && !blocked && !document.hidden && !mediaFailed && !ended && !userPaused && paperState === 'settled' && (posterReady || posterFailed) && (!reducedMotion || manualPlayback)
    const request = ++playRequestRef.current
    if (!canPlay) {
      video.pause()
      return
    }
    void video.play().then(() => {
      if (request !== playRequestRef.current || !activeRef.current || blockedRef.current || userPausedRef.current || endedRef.current || document.hidden) video.pause()
    }).catch(() => {
      if (request === playRequestRef.current) setPlaying(false)
    })
  }, [active, blocked, ended, manualPlayback, mediaFailed, paperState, posterFailed, posterReady, reducedMotion, shouldLoad, userPaused])

  const requestPlay = () => {
    const video = videoRef.current
    if (!video) return
    if (ended) video.currentTime = 0
    setEnded(false)
    setMediaFailed(false)
    setUserPaused(false)
    setManualPlayback(true)
    setShouldLoad(true)
    onActivate(profile.id)
  }

  const pause = () => {
    setUserPaused(true)
    setManualPlayback(false)
    videoRef.current?.pause()
  }

  const retry = () => {
    const video = videoRef.current
    if (!video || retryUsed) return
    setRetryUsed(true)
    setMediaFailed(false)
    setFramePresented(false)
    setEnded(false)
    setUserPaused(false)
    setManualPlayback(true)
    onActivate(profile.id)
    video.load()
  }

  const togglePlayback = () => {
    if (playing && !ended) pause()
    else requestPlay()
  }

  const controlLabel = ended ? 'Replay film' : playing ? 'Pause film' : 'Play film'
  const filmId = `${profile.id}-film`
  const headingId = `${profile.id}-heading`

  return (
    <article
      className={`farm-album__entry farm-album__entry--${profile.id}`}
      id={profile.id}
      ref={articleRef}
      tabIndex={-1}
      aria-labelledby={headingId}
      data-media-state={mediaFailed ? 'error' : ended ? 'ended' : playing ? 'playing' : framePresented ? 'ready' : 'poster'}
      data-user-paused={userPaused ? 'true' : 'false'}
      data-source-attached={shouldLoad ? 'true' : 'false'}
      data-paper-state={paperState}
    >
      <h3 id={headingId}>{profile.heading}</h3>
      <div className="farm-album__print" onAnimationEnd={() => setPaperState('settled')}>
        <figure>
          <div className="farm-album__film" data-film-id={profile.id} ref={filmRef} id={filmId}>
            {!posterFailed && <img src={profile.poster} alt={profile.alt} width="1280" height="720" loading={shouldLoad ? 'eager' : 'lazy'} decoding="async" onLoad={() => setPosterReady(true)} onError={() => { setPosterFailed(true); setPosterReady(false) }} />}
            {posterFailed && !framePresented && <span className="farm-album__neutral-poster" role="img" aria-label={`${profile.label} film poster unavailable. ${profile.alt}`}><span>{profile.label}</span></span>}
            <video
              ref={videoRef}
              src={shouldLoad ? profile.video : undefined}
              poster={profile.poster}
              muted
              playsInline
              preload="metadata"
              aria-hidden="true"
              data-frame-presented={framePresented ? 'true' : 'false'}
              onLoadedData={registerPresentedFrame}
              onPlaying={() => { setPlaying(true); registerPresentedFrame() }}
              onPause={() => setPlaying(false)}
              onEnded={() => { setPlaying(false); setEnded(true); setManualPlayback(false) }}
              onError={() => { setMediaFailed(true); setPlaying(false) }}
            />
          </div>
          <figcaption>
            <p>{profile.description}</p>
            <div className="farm-album__controls" aria-label={`${profile.label} film controls`}>
              {!mediaFailed && <button type="button" aria-controls={filmId} aria-label={`${profile.label}: ${controlLabel}`} onClick={togglePlayback}>{controlLabel}</button>}
              {mediaFailed && !retryUsed && <button type="button" aria-controls={filmId} onClick={retry}>Retry film</button>}
              {mediaFailed && retryUsed && <span role="status">Film unavailable. Poster retained.</span>}
              <button type="button" onClick={() => onHearAnimal(profile.id)}>{profile.soundLabel}</button>
              <a href={profile.link} onClick={profile.id === 'hens' ? (event) => { event.preventDefault(); onViewProduct('eggs') } : undefined}>{profile.linkLabel}</a>
            </div>
          </figcaption>
        </figure>
      </div>
      <p className="farm-album__note">{profile.note}</p>
    </article>
  )
}

export function FarmLife({ onViewProduct, onHearAnimal, handoffActive, handoffTarget }: FarmLifeProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const visibleAreaRef = useRef(new Map<FarmLifeId, number>())
  const dwellTimerRef = useRef<number | undefined>(undefined)
  const [activeId, setActiveId] = useState<FarmLifeId>()
  const [overlayBlocked, setOverlayBlocked] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const blocked = handoffActive || overlayBlocked

  const chooseOwner = useCallback(() => {
    if (document.hidden || blocked) {
      if (dwellTimerRef.current !== undefined) window.clearTimeout(dwellTimerRef.current)
      setActiveId(undefined)
      return
    }
    const next = [...visibleAreaRef.current.entries()].filter(([, area]) => area > 0).sort((a, b) => b[1] - a[1])[0]?.[0]
    if (next === activeId) return
    if (dwellTimerRef.current !== undefined) window.clearTimeout(dwellTimerRef.current)
    if (!next) {
      setActiveId(undefined)
      return
    }
    dwellTimerRef.current = window.setTimeout(() => setActiveId(next), 200)
  }, [activeId, blocked])

  useEffect(() => {
    const section = sectionRef.current
    if (!section || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.filmId as FarmLifeId
        const usefulHeight = Math.min(entry.boundingClientRect.height, innerHeight * .72)
        const eligible = entry.isIntersecting && entry.intersectionRect.height >= Math.min(150, usefulHeight * .32)
        visibleAreaRef.current.set(id, eligible ? entry.intersectionRect.width * entry.intersectionRect.height : 0)
      }
      chooseOwner()
    }, { threshold: [0, .15, .3, .5, .7] })
    section.querySelectorAll<HTMLElement>('[data-film-id]').forEach((film) => observer.observe(film))
    return () => observer.disconnect()
  }, [chooseOwner])

  useEffect(() => {
    const refresh = () => setOverlayBlocked(Boolean(document.querySelector('dialog[open], .mini-basket')))
    refresh()
    const observer = new MutationObserver(refresh)
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const onVisibility = () => chooseOwner()
    document.addEventListener('visibilitychange', onVisibility)
    chooseOwner()
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      if (dwellTimerRef.current !== undefined) window.clearTimeout(dwellTimerRef.current)
    }
  }, [chooseOwner])

  return (
    <section className="farm-album" id="farm-life" aria-labelledby="farm-life-heading" ref={sectionRef}>
      <div className="farm-album__inner">
        <header className="farm-album__intro">
          <div><h2 id="farm-life-heading">Around the farm.</h2><p>Meet the neighbours.</p></div>
          <nav aria-label="Farm-life scenes">{farmLifeProfiles.map((profile) => <a key={profile.id} href={`#${profile.id}`}>{profile.label}</a>)}</nav>
        </header>
        {farmLifeProfiles.map((profile) => (
          <FarmAlbumEntry
            key={profile.id}
            profile={profile}
            active={activeId === profile.id}
            blocked={blocked}
            reducedMotion={reducedMotion}
            directArrival={handoffTarget === profile.id}
            onActivate={setActiveId}
            onViewProduct={onViewProduct}
            onHearAnimal={onHearAnimal}
          />
        ))}
        <div className="farm-album__credits" role="note">
          <p>Illustrative farm films. These are not recordings of this demonstration property.</p>
          <p>{farmLifeProfiles.map((profile, index) => <span key={profile.id}>{index ? ' · ' : ''}<a href={profile.sourceUrl}>{profile.creator} / Pexels</a></span>)}</p>
        </div>
      </div>
    </section>
  )
}
