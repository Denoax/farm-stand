import { lazy, Suspense, useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { business } from './content/config'
import { ContactPreview } from './components/ContactPreview'
import { ShopSection } from './components/ShopSection'
import { FarmLife } from './components/FarmLife'
import { VisitSection } from './components/VisitSection'
import { TryUpdate } from './components/TryUpdate'
import { Logo } from './components/Logo'
import { basketReducer, basketStorageKey, legacyBasketStorageKey, parseBasketSnapshot, serializeBasket } from './state/basket'
import type { ProductId } from './content/catalogue'

const FarmScene = lazy(() => import('./components/FarmScene').then((module) => ({ default: module.FarmScene })))
const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

type SceneState = 'loading' | 'ready' | 'fallback'
type OpeningState = 'waiting' | 'playing' | 'paused' | 'open' | 'fallback'
type OpeningContentState = 'initial' | 'opening' | 'settled' | 'reintroduced' | 'complete'

const openingStorageKey = 'farm-stand-market-opening-v2'
const openingDuration = 6500
const contentReturnStart = 0.895
const openingSettleStart = 0.75
const introHoldDuration = 900

function progressAtTime(milliseconds: number) {
  return Math.min(openingDuration, Math.max(0, milliseconds)) / openingDuration
}

function contentStateAtProgress(progress: number): OpeningContentState {
  if (progress >= contentReturnStart) return 'reintroduced'
  if (progress >= openingSettleStart) return 'settled'
  return 'opening'
}

function shouldBypassOpening() {
  try {
    return Boolean(location.hash && location.hash !== '#top') || sessionStorage.getItem(openingStorageKey) === 'complete' || matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return Boolean(location.hash && location.hash !== '#top')
  }
}

export function App() {
  const stageRef = useRef<HTMLElement>(null)
  const progressRef = useRef(0)
  const [sceneState, setSceneState] = useState<SceneState>('loading')
  const [openingState, setOpeningState] = useState<OpeningState>(() => shouldBypassOpening() ? 'open' : 'waiting')
  const [openingContentState, setOpeningContentState] = useState<OpeningContentState>(() => shouldBypassOpening() ? 'complete' : 'initial')
  const [introHoldActive, setIntroHoldActive] = useState(false)
  const openingStateRef = useRef(openingState)
  const sceneStateRef = useRef(sceneState)
  const introHoldRef = useRef(false)
  const introHoldTimerRef = useRef<number | undefined>(undefined)
  const elapsedRef = useRef(openingState === 'open' ? openingDuration : 0)
  openingStateRef.current = openingState
  sceneStateRef.current = sceneState
  progressRef.current = openingState === 'open' || openingState === 'fallback' ? 1 : progressRef.current
  const [basket, dispatchBasket] = useReducer(basketReducer, {}, () => {
    try {
      return parseBasketSnapshot(sessionStorage.getItem(basketStorageKey) ?? sessionStorage.getItem(legacyBasketStorageKey))
    } catch {
      return {}
    }
  })
  const [shopFocusRequest, setShopFocusRequest] = useState<{ productId: ProductId; sequence: number }>()
  const releaseIntroHold = useCallback((updateState = true) => {
    if (introHoldTimerRef.current !== undefined) window.clearTimeout(introHoldTimerRef.current)
    introHoldTimerRef.current = undefined
    introHoldRef.current = false
    if (updateState) setIntroHoldActive(false)
  }, [])
  const beginIntroHold = useCallback(() => {
    if (introHoldRef.current) return
    introHoldRef.current = true
    setIntroHoldActive(true)
    introHoldTimerRef.current = window.setTimeout(() => releaseIntroHold(), introHoldDuration)
  }, [releaseIntroHold])
  const settleOpening = useCallback((state: Extract<OpeningState, 'open' | 'fallback'> = 'open') => {
    releaseIntroHold()
    elapsedRef.current = openingDuration
    progressRef.current = 1
    setOpeningState(state)
    setOpeningContentState('complete')
    const stage = stageRef.current
    if (stage) stage.dataset.requestedProgress = '1.0000'
    document.documentElement.style.setProperty('--stage-progress', '1.0000')
    window.dispatchEvent(new Event('farmstageprogress'))
    try { sessionStorage.setItem(openingStorageKey, 'complete') } catch { /* The visual still settles open when storage is unavailable. */ }
  }, [releaseIntroHold])
  const onSceneState = useCallback((state: SceneState) => setSceneState((current) => current === 'fallback' ? current : state), [])
  const onPresented = useCallback((progress: number, shot: string) => {
    const stage = stageRef.current
    if (!stage) return
    const value = progress.toFixed(4)
    stage.style.setProperty('--stage-progress', value)
    stage.dataset.presentedProgress = value
    stage.dataset.shot = shot
    document.documentElement.style.setProperty('--stage-progress', value)
    if (openingStateRef.current === 'playing' || openingStateRef.current === 'paused') {
      setOpeningContentState((current) => {
        const next = contentStateAtProgress(progress)
        return current === next ? current : next
      })
    }
  }, [])
  const viewShopProduct = useCallback((productId: ProductId) => {
    window.history.replaceState(null, '', `#product-${productId}`)
    setShopFocusRequest((current) => ({ productId, sequence: (current?.sequence ?? 0) + 1 }))
  }, [])

  useEffect(() => {
    try {
      sessionStorage.setItem(basketStorageKey, serializeBasket(basket))
      sessionStorage.removeItem(legacyBasketStorageKey)
    } catch {
      // Storage can be unavailable in privacy-restricted contexts; the in-memory demo remains usable.
    }
  }, [basket])

  useEffect(() => {
    if (sceneState === 'fallback') settleOpening('fallback')
  }, [sceneState, settleOpening])

  useEffect(() => {
    if (openingState !== 'open' && openingState !== 'fallback') return
    try { sessionStorage.setItem(openingStorageKey, 'complete') } catch { /* Session persistence is an enhancement, not a usability requirement. */ }
  }, [openingState])

  useEffect(() => {
    const targetId = decodeURIComponent(window.location.hash.slice(1))
    if (!targetId) return
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(targetId)
      if (!target) return
      const root = document.documentElement
      const previousScrollBehavior = root.style.scrollBehavior
      root.style.scrollBehavior = 'auto'
      target.scrollIntoView({ block: 'start' })
      root.style.scrollBehavior = previousScrollBehavior
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let wheelDistance = 0
    let touchY: number | null = null

    const present = () => {
      const progress = progressAtTime(elapsedRef.current)
      progressRef.current = progress
      stage.dataset.requestedProgress = progress.toFixed(4)
      stage.style.setProperty('--stage-progress', progress.toFixed(4))
      document.documentElement.style.setProperty('--stage-progress', progress.toFixed(4))
      window.dispatchEvent(new Event('farmstageprogress'))
    }
    const play = () => {
      if (openingStateRef.current === 'open' || openingStateRef.current === 'fallback' || reducedMotion.matches) return settleOpening()
      if (sceneStateRef.current !== 'ready') return
      const focused = document.activeElement
      if (focused instanceof Element && focused.closest('.hero-copy, .entrance-links')) return settleOpening()
      beginIntroHold()
      setOpeningContentState('opening')
      setOpeningState('playing')
    }
    const onWheel = (event: WheelEvent) => {
      if (introHoldRef.current) {
        event.preventDefault()
        return
      }
      if (openingStateRef.current !== 'waiting' || event.deltaY <= 0) return
      wheelDistance += event.deltaY
      if (wheelDistance >= 18 && sceneStateRef.current === 'ready') {
        event.preventDefault()
        play()
      }
    }
    const onTouchStart = (event: TouchEvent) => { touchY = event.touches[0]?.clientY ?? null }
    const onTouchMove = (event: TouchEvent) => {
      const nextY = event.touches[0]?.clientY
      if (introHoldRef.current) {
        event.preventDefault()
        return
      }
      if (openingStateRef.current === 'waiting' && sceneStateRef.current === 'ready' && touchY !== null && nextY !== undefined && touchY - nextY >= 18) {
        event.preventDefault()
        play()
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && (openingStateRef.current === 'playing' || openingStateRef.current === 'paused')) {
        settleOpening()
        return
      }
      const navigationKey = ['ArrowDown', 'PageDown', ' ', 'End'].includes(event.key)
      if (!navigationKey || event.altKey || event.ctrlKey || event.metaKey) return
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest('a, button, input, textarea, select, [contenteditable="true"], [role="button"]')) return
      if (introHoldRef.current) {
        event.preventDefault()
        return
      }
      if (openingStateRef.current === 'waiting' && sceneStateRef.current === 'ready') {
        event.preventDefault()
        play()
      }
    }
    const onPreference = () => { if (reducedMotion.matches) settleOpening() }
    const onVisibility = () => { if (document.hidden) releaseIntroHold() }
    const onTouchCancel = () => releaseIntroHold()
    const onActivation = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('a[href^="#"], button') : null
      if (!target) return
      releaseIntroHold()
      if (target.matches('a[href^="#"]') && (openingStateRef.current === 'playing' || openingStateRef.current === 'paused')) settleOpening()
    }

    if (openingStateRef.current === 'open') present()
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchcancel', onTouchCancel)
    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('click', onActivation, true)
    document.addEventListener('visibilitychange', onVisibility)
    reducedMotion.addEventListener('change', onPreference)
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio < .02 && (openingStateRef.current === 'playing' || openingStateRef.current === 'paused')) settleOpening()
    }, { threshold: .02 })
    observer.observe(stage)
    return () => {
      observer.disconnect()
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchcancel', onTouchCancel)
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('click', onActivation, true)
      document.removeEventListener('visibilitychange', onVisibility)
      reducedMotion.removeEventListener('change', onPreference)
      releaseIntroHold(false)
    }
  }, [beginIntroHold, releaseIntroHold, settleOpening])

  useEffect(() => {
    if (openingState !== 'playing') return
    let frame = 0
    let previousTime: number | null = null
    const resetClock = () => { previousTime = null }
    const tick = (time: number) => {
      if (openingStateRef.current !== 'playing') return
      if (document.hidden) {
        previousTime = null
        frame = requestAnimationFrame(tick)
        return
      }
      if (previousTime !== null) elapsedRef.current += Math.min(time - previousTime, 80)
      previousTime = time
      const progress = progressAtTime(elapsedRef.current)
      progressRef.current = progress
      const stage = stageRef.current
      if (stage) {
        stage.dataset.requestedProgress = progress.toFixed(4)
        stage.style.setProperty('--stage-progress', progress.toFixed(4))
      }
      window.dispatchEvent(new Event('farmstageprogress'))
      if (elapsedRef.current >= openingDuration) settleOpening()
      else frame = requestAnimationFrame(tick)
    }
    document.addEventListener('visibilitychange', resetClock)
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', resetClock)
    }
  }, [openingState, settleOpening])

  return (
    <div data-opening-state={openingState} data-opening-content={openingContentState} data-scroll-hold={introHoldActive ? 'active' : 'released'} data-motion-paused={openingState === 'paused' ? 'true' : 'false'}>
      <a className="skip-link" href="#main">Skip to the main content</a>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Farm stand website demonstration, home">
          <Logo />
        </a>
        <nav aria-label="Main navigation">
          <a href="#shop">Shop</a>
          <a href="#farm-life">Around the farm</a>
          <a href="#website">Your website</a>
          <a className="nav-cta" href="#contact">Discuss a website</a>
        </nav>
      </header>

      <main id="main">
        <section
          className={`hero-stage hero-stage--${sceneState}`}
          id="top"
          ref={stageRef}
          aria-labelledby="hero-heading"
          data-opening-state={openingState}
          data-opening-content={openingContentState}
          data-scroll-hold={introHoldActive ? 'active' : 'released'}
        >
          <div className="hero-sticky">
            <picture className="market-opening__plate" aria-hidden="true">
              <source media="(max-width: 760px)" srcSet={publicAsset('media/market-opening-open-portrait.avif')} />
              <img src={publicAsset('media/market-opening-open-desktop.avif')} alt="" width="1536" height="1024" fetchPriority="high" onError={() => setSceneState('fallback')} />
            </picture>
            <div className="scene-visual" aria-label="Morning light reaches a supported apple as a timber market shutter lifts to reveal the open farm stand">
              <picture className="fallback-poster" aria-hidden="true">
                <source media="(max-width: 760px)" srcSet={publicAsset('media/market-opening-poster-portrait.avif')} />
                <img src={publicAsset('media/market-opening-poster-desktop.avif')} alt="" />
              </picture>
              <Suspense fallback={null}>
                <FarmScene progressRef={progressRef} motionPaused={openingState === 'paused'} onStateChange={onSceneState} onPresented={onPresented} />
              </Suspense>
              <div className="scene-vignette" aria-hidden="true" />
              <p className="scene-status" aria-live="polite">
                {sceneState === 'loading' ? 'Preparing the farm stand…' : sceneState === 'fallback' ? 'Static farm stand view' : openingState === 'playing' ? 'The market is opening…' : openingState === 'paused' ? 'Opening paused' : ''}
              </p>
            </div>
            <div className="hero-copy" aria-hidden={openingContentState === 'opening' || openingContentState === 'settled'} inert={openingContentState === 'opening' || openingContentState === 'settled' ? true : undefined}>
              <p className="eyebrow eyebrow--hero">{business.service_descriptor}</p>
              <h1 id="hero-heading">This is what your farm could look like online.</h1>
              <p className="hero-support">Show what’s available. Help customers find you. Make enquiries straightforward.</p>
              <div className="hero-actions">
                <a className="button button--sun" href="#shop">Explore the demo <span aria-hidden="true">↓</span></a>
                <a className="text-link" href="#contact">Discuss my website <span aria-hidden="true">↗</span></a>
              </div>
              <p className="hero-disclosure">A fictional farm-shop experience demonstrating a real website service. No produce is sold here.</p>
            </div>
            <nav className="entrance-links" aria-label="Go straight to the market or farm-life scenes" aria-hidden={openingContentState === 'opening' || openingContentState === 'settled'} inert={openingContentState === 'opening' || openingContentState === 'settled' ? true : undefined}>
              <a href="#shop"><img src={publicAsset('media/catalogue-expanded/apple.avif')} alt="" width="960" height="640" /><span>Shop</span></a>
              <a href="#hens"><img src={publicAsset('media/farm-life-motion/hens-poster.avif')} alt="" width="1280" height="720" /><span>Hens</span></a>
              <a href="#cattle"><img src={publicAsset('media/farm-life-motion/cattle-poster.avif')} alt="" width="1280" height="720" /><span>Cattle</span></a>
              <a href="#sheep"><img src={publicAsset('media/farm-life-motion/sheep-poster.avif')} alt="" width="1280" height="720" /><span>Sheep</span></a>
            </nav>
            <div className="market-opening__progress" aria-hidden="true">
              <span>Morning light</span><i /><span>Open stand</span>
            </div>
            <div className="market-opening__controls">
              {(openingState === 'playing' || openingState === 'paused') && <button className="market-opening__motion" type="button" aria-pressed={openingState === 'paused'} onClick={() => { releaseIntroHold(); setOpeningState((state) => state === 'playing' ? 'paused' : 'playing') }}>{openingState === 'paused' ? 'Resume opening' : 'Pause opening'}</button>}
            </div>
            {openingState === 'waiting' && <div className="scroll-cue" aria-hidden="true"><span /> Scroll to open the stand</div>}
          </div>
          <span className="demo-anchor" id="demo" aria-hidden="true" />
        </section>

        <ShopSection basket={basket} dispatch={dispatchBasket} focusRequest={shopFocusRequest} />
        <FarmLife onViewProduct={viewShopProduct} />
        <VisitSection />

        <section className="service" id="website" aria-labelledby="service-heading">
          <div className="service-heading">
            <p className="eyebrow">Your website</p>
            <h2 id="service-heading">A website built around how your business works.</h2>
            <p className="service-lead">Bring products, visiting details, and enquiries together in a site that feels true to the business.</p>
          </div>
          <div className="service-story">
            <p className="eyebrow">A plain-language process</p>
            <ol className="process-list">
              <li><span>01</span><div><strong>Understand the business</strong><p>Start with what customers need to know and what the owner needs the website to make easier.</p></div></li>
              <li><span>02</span><div><strong>Organize the content</strong><p>Shape products, services, visiting details, and enquiries into a structure people can scan.</p></div></li>
              <li><span>03</span><div><strong>Design and build</strong><p>Create the visual system and responsive pages around the real material available.</p></div></li>
              <li><span>04</span><div><strong>Review and launch</strong><p>Check the important journeys, refine the result, and connect the approved web address and contact details.</p></div></li>
            </ol>
          </div>
          <div className="service-boundary">
            <p><strong>Shown in this example:</strong> a clear shop, collection information, farm-life stories, and a contact preview.</p>
            <p><strong>Set up for a real business only when needed:</strong> inventory, payments, booking, content editing, message delivery, analytics, or ongoing support.</p>
          </div>
          <TryUpdate />
        </section>

        <ContactPreview />
      </main>

      <footer>
        <a className="footer-brand" href="#top" aria-label="Return to the farm stand"><Logo /> <span>Return to the farm stand ↑</span></a>
        <p>Farm stand website example · no orders, payments, bookings, or submissions</p>
        <p>Produce models: Poly Haven, CC0 · photography: credited Pexels contributors · background: project-generated original</p>
      </footer>
    </div>
  )
}
