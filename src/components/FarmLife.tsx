import { useCallback, useEffect, useRef, useState } from 'react'
import { farmLifeProfiles, type FarmLifeId } from '../content/farmLife'
import './FarmLife.css'

interface FarmLifeProps {
  onViewProduct: (productId: 'eggs') => void
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

function AlbumMarginSketch({ kind }: { kind: FarmLifeId }) {
  if (kind === 'cattle') return null
  return kind === 'hens' ? (
    <svg className="farm-album__sketch farm-album__sketch--hens" viewBox="0 0 180 112" aria-hidden="true">
      <path d="M12 86c28 4 44-3 62-18 20-17 35-19 55-12" />
      <g className="farm-album__footprints">
        <path d="m23 78-7-8m7 8 1-11m-1 11 9-5" />
        <path d="m53 71-7-8m7 8 1-11m-1 11 9-5" />
        <path d="m83 59-7-8m7 8 1-11m-1 11 9-5" />
      </g>
      <path d="M130 91c4-20 4-23 6-35m1 35c5-15 13-27 22-35m-19 35c12-11 18-14 28-18m-34 18c-9-15-14-20-21-25" />
    </svg>
  ) : (
    <svg className="farm-album__sketch farm-album__sketch--sheep" viewBox="0 0 170 132" aria-hidden="true">
      <path d="M84 125c-1-25 1-54 5-84m-3 47c-24-8-43-23-54-43m55 23c21-12 35-27 43-46" />
      <path d="M25 47c-11-8-14-22-5-29 10-8 23-1 25 10 2 12-8 24-20 19Zm106-22c5-12 20-17 28-8 7 9 0 23-12 26-12 3-21-7-16-18Z" />
      <path d="M56 116c2-12 1-21-2-29m7 30c5-12 11-19 18-25m37 25c-4-13-3-23 0-32m5 33c5-12 11-20 20-26" />
    </svg>
  )
}

function FarmAlbumEntry({
  profile,
  active,
  blocked,
  motionEnabled,
  directArrival,
  onActivate,
  onEnableMotion,
  onViewProduct,
}: {
  profile: (typeof farmLifeProfiles)[number]
  active: boolean
  blocked: boolean
  motionEnabled: boolean
  directArrival: boolean
  onActivate: (id: FarmLifeId) => void
  onEnableMotion: () => void
  onViewProduct: (productId: 'eggs') => void
}) {
  const articleRef = useRef<HTMLElement>(null)
  const filmRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<FrameCallbackVideo>(null)
  const frameCallbackRef = useRef<number | undefined>(undefined)
  const fallbackFrameRef = useRef<number | undefined>(undefined)
  const playRequestRef = useRef(0)
  const activeRef = useRef(active)
  const blockedRef = useRef(blocked)
  const motionEnabledRef = useRef(motionEnabled)
  const lastMediaTimeRef = useRef(0)
  const skipSettleRef = useRef(initialTarget() === profile.id || directArrival)
  const [shouldLoad, setShouldLoad] = useState(() => initialTarget() === profile.id || initialTarget() === 'farm-life' && profile.id === 'hens')
  const [posterReady, setPosterReady] = useState(false)
  const [posterFailed, setPosterFailed] = useState(false)
  const [framePresented, setFramePresented] = useState(false)
  const [mediaFailed, setMediaFailed] = useState(false)
  const [playBlocked, setPlayBlocked] = useState(false)
  const [retryUsed, setRetryUsed] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [loopCount, setLoopCount] = useState(0)
  const [paperState, setPaperState] = useState<'waiting' | 'settling' | 'settled'>(() => skipSettleRef.current ? 'settled' : 'waiting')

  activeRef.current = active
  blockedRef.current = blocked
  motionEnabledRef.current = motionEnabled

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
    if (skipSettleRef.current) {
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
  }, [paperState, posterFailed, posterReady])

  const markFramePresented = useCallback(() => {
    setFramePresented(true)
    setMediaFailed(false)
    setPlayBlocked(false)
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
    const canPlay = active && motionEnabled && !blocked && !document.hidden && !mediaFailed && paperState === 'settled' && (posterReady || posterFailed)
    const request = ++playRequestRef.current
    if (!canPlay) {
      video.pause()
      return
    }
    void video.play().then(() => {
      if (request !== playRequestRef.current || !activeRef.current || blockedRef.current || !motionEnabledRef.current || document.hidden) video.pause()
    }).catch(() => {
      if (request === playRequestRef.current) {
        setPlaying(false)
        setPlayBlocked(true)
      }
    })
  }, [active, blocked, mediaFailed, motionEnabled, paperState, posterFailed, posterReady, shouldLoad])

  const requestPlay = () => {
    setMediaFailed(false)
    setPlayBlocked(false)
    setShouldLoad(true)
    onEnableMotion()
    onActivate(profile.id)
  }

  const retry = () => {
    const video = videoRef.current
    if (!video || retryUsed) return
    setRetryUsed(true)
    setMediaFailed(false)
    setPlayBlocked(false)
    setFramePresented(false)
    onEnableMotion()
    onActivate(profile.id)
    video.load()
  }

  const filmId = `${profile.id}-film`
  const headingId = `${profile.id}-heading`

  return (
    <article
      className={`farm-album__entry farm-album__entry--${profile.id}`}
      id={profile.id}
      ref={articleRef}
      tabIndex={-1}
      aria-labelledby={headingId}
      data-media-state={mediaFailed ? 'error' : playBlocked ? 'blocked' : playing ? 'playing' : framePresented ? 'ready' : 'poster'}
      data-source-attached={shouldLoad ? 'true' : 'false'}
      data-paper-state={paperState}
      data-loop-count={loopCount}
      data-active-owner={active ? 'true' : 'false'}
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
              loop
              preload="metadata"
              aria-hidden="true"
              data-frame-presented={framePresented ? 'true' : 'false'}
              onLoadedData={registerPresentedFrame}
              onPlaying={() => { setPlaying(true); setPlayBlocked(false); registerPresentedFrame() }}
              onPause={() => setPlaying(false)}
              onTimeUpdate={(event) => {
                const time = event.currentTarget.currentTime
                if (time + .5 < lastMediaTimeRef.current) setLoopCount((count) => count + 1)
                lastMediaTimeRef.current = time
              }}
              onError={() => { setMediaFailed(true); setPlaying(false) }}
            />
          </div>
          <figcaption>
            <p>{profile.description}</p>
            <div className="farm-album__links">
              {playBlocked && !mediaFailed && <button type="button" aria-controls={filmId} onClick={requestPlay}>Play {profile.label.toLowerCase()} film</button>}
              {mediaFailed && !retryUsed && <button type="button" aria-controls={filmId} onClick={retry}>Retry film</button>}
              {mediaFailed && retryUsed && <span role="status">Film unavailable. Poster retained.</span>}
              <a href={profile.link} onClick={profile.id === 'hens' ? (event) => { event.preventDefault(); onViewProduct('eggs') } : undefined}>{profile.linkLabel}</a>
            </div>
          </figcaption>
        </figure>
      </div>
      <p className="farm-album__note">{profile.note}</p>
      <AlbumMarginSketch kind={profile.id} />
    </article>
  )
}

export function FarmLife({ onViewProduct, handoffActive, handoffTarget }: FarmLifeProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const visibleAreaRef = useRef(new Map<FarmLifeId, number>())
  const dwellTimerRef = useRef<number | undefined>(undefined)
  const [activeId, setActiveId] = useState<FarmLifeId | undefined>(() => {
    const target = initialTarget()
    return farmLifeProfiles.some(({ id }) => id === target) ? target as FarmLifeId : undefined
  })
  const [overlayBlocked, setOverlayBlocked] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [motionEnabled, setMotionEnabled] = useState(() => !matchMedia('(prefers-reduced-motion: reduce)').matches)
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
    const update = () => {
      setReducedMotion(media.matches)
      if (media.matches) setMotionEnabled(false)
    }
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

  const enableMotion = () => {
    const next = farmLifeProfiles
      .map(({ id }) => {
        const rect = sectionRef.current?.querySelector<HTMLElement>(`[data-film-id="${id}"]`)?.getBoundingClientRect()
        if (!rect) return { id, area: 0 }
        const width = Math.max(0, Math.min(rect.right, innerWidth) - Math.max(rect.left, 0))
        const height = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0))
        return { id, area: width * height }
      })
      .sort((a, b) => b.area - a.area)[0]
    if (next?.area) setActiveId(next.id)
    setMotionEnabled(true)
  }

  const toggleLabel = motionEnabled ? 'Pause animal films' : 'Play animal films'

  return (
    <section className="farm-album" id="farm-life" aria-labelledby="farm-life-heading" ref={sectionRef} data-motion-enabled={motionEnabled ? 'true' : 'false'} data-reduced-motion={reducedMotion ? 'true' : 'false'}>
      <div className="farm-album__inner">
        <header className="farm-album__intro">
          <div><h2 id="farm-life-heading">Around the farm.</h2><p>Meet the neighbours.</p></div>
          <button className="farm-album__motion" type="button" aria-label={toggleLabel} title={toggleLabel} aria-pressed={!motionEnabled} onClick={() => motionEnabled ? setMotionEnabled(false) : enableMotion()}>
            {motionEnabled ? <span aria-hidden="true"><i /><i /></span> : <span className="farm-album__play" aria-hidden="true" />}
          </button>
        </header>
        {farmLifeProfiles.map((profile) => (
          <FarmAlbumEntry
            key={profile.id}
            profile={profile}
            active={activeId === profile.id}
            blocked={blocked}
            motionEnabled={motionEnabled}
            directArrival={handoffTarget === profile.id}
            onActivate={setActiveId}
            onEnableMotion={enableMotion}
            onViewProduct={onViewProduct}
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
