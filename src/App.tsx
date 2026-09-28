import { lazy, Suspense, useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { ContactPreview } from './components/ContactPreview'
import { ShopSection } from './components/ShopSection'
import { FarmLife } from './components/FarmLife'
import { VisitSection } from './components/VisitSection'
import { TryUpdate } from './components/TryUpdate'
import { Logo } from './components/Logo'
import { LeafHandoff, type LeafPhase } from './components/LeafHandoff'
import { SoundControls } from './components/SoundControls'
import { basketReducer, basketStorageKey, legacyBasketStorageKey, parseBasketSnapshot, serializeBasket } from './state/basket'
import type { ProductId } from './content/catalogue'
import { evaluateMarketOpening } from './scene/marketOpeningShot'
import { useOpeningScrollGate } from './hooks/useOpeningScrollGate'
import { useSoundscape, type AnimalSound } from './audio/useSoundscape'

const FarmScene = lazy(() => import('./components/FarmScene').then((module) => ({ default: module.FarmScene })))
const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

type SceneState = 'loading' | 'ready' | 'fallback'
type OpeningState = 'waiting' | 'playing' | 'open' | 'fallback'
type OpeningContentState = 'initial' | 'opening' | 'settled' | 'reintroduced' | 'complete'
type LeafState = 'idle' | 'armed' | LeafPhase | 'complete' | 'bypassed'

const openingStorageKey = 'farm-stand-market-opening-v2'
const openingDuration = 6500
const contentReturnStart = 0.895
const openingSettleStart = 0.75
const openingWatchdog = 9000

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
  const [leafState, setLeafState] = useState<LeafState>(() => shouldBypassOpening() ? 'bypassed' : 'idle')
  const leafStateRef = useRef(leafState)
  const openingStateRef = useRef(openingState)
  const sceneStateRef = useRef(sceneState)
  const coverCommittedRef = useRef(false)
  const openingPlayedRef = useRef(false)
  const elapsedRef = useRef(openingState === 'open' ? openingDuration : 0)
  const { active: introHoldActive, activeRef: introHoldRef, begin: beginIntroHold, release: releaseIntroHold } = useOpeningScrollGate(openingWatchdog)
  const soundscape = useSoundscape()
  const marketReady = leafState === 'complete' || leafState === 'bypassed'
  openingStateRef.current = openingState
  leafStateRef.current = leafState
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
  const settleOpening = useCallback((state: Extract<OpeningState, 'open' | 'fallback'> = 'open') => {
    releaseIntroHold()
    elapsedRef.current = openingDuration
    progressRef.current = 1
    openingStateRef.current = state
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
    soundscape.syncOpening(shot, evaluateMarketOpening(progress).shutterLift)
    if (openingStateRef.current === 'playing') {
      setOpeningContentState((current) => {
        const next = contentStateAtProgress(progress)
        return current === next ? current : next
      })
      if (progress >= 0.9999) settleOpening()
    }
  }, [settleOpening, soundscape.syncOpening])
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
    if (sceneState === 'fallback') {
      settleOpening('fallback')
      leafStateRef.current = 'bypassed'
      setLeafState('bypassed')
    }
  }, [sceneState, settleOpening])

  useEffect(() => {
    const unlock = () => { void soundscape.unlock() }
    const unlockFromKey = (event: KeyboardEvent) => {
      if (!event.altKey && !event.ctrlKey && !event.metaKey) unlock()
    }
    window.addEventListener('pointerdown', unlock, { capture: true, passive: true })
    window.addEventListener('keydown', unlockFromKey, { capture: true })
    return () => {
      window.removeEventListener('pointerdown', unlock, { capture: true })
      window.removeEventListener('keydown', unlockFromKey, { capture: true })
    }
  }, [soundscape.unlock])

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
      if (window.scrollY > 1) return settleOpening()
      const focused = document.activeElement
      if (focused instanceof Element && focused.closest('.hero-copy, .entrance-links')) return settleOpening()
      openingPlayedRef.current = true
      openingStateRef.current = 'playing'
      beginIntroHold(() => settleOpening())
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
      if (event.key === 'Escape' && openingStateRef.current === 'playing') {
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
    const onVisibility = () => { if (document.hidden && openingStateRef.current === 'playing') settleOpening() }
    const onTouchCancel = () => { if (openingStateRef.current === 'playing') settleOpening() }
    const onPageHide = () => { if (openingStateRef.current === 'playing') settleOpening() }
    const settleRestoredPosition = () => {
      if (window.scrollY > 1 && openingStateRef.current === 'waiting') settleOpening()
    }
    const onFocusIn = (event: FocusEvent) => {
      if (openingStateRef.current !== 'playing') return
      const target = event.target instanceof Element ? event.target : null
      if (target && !target.closest('.hero-sticky')) settleOpening()
    }
    const onActivation = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('a[href^="#"], button') : null
      if (!target) return
      if (target.matches('[data-opening-preserve]')) return
      if (openingStateRef.current === 'playing') settleOpening()
    }

    if (openingStateRef.current === 'open') present()
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchcancel', onTouchCancel)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('pageshow', settleRestoredPosition)
    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('click', onActivation, true)
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('visibilitychange', onVisibility)
    reducedMotion.addEventListener('change', onPreference)
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio < .02 && openingStateRef.current === 'playing') settleOpening()
    }, { threshold: .02 })
    observer.observe(stage)
    let restorationFrame = requestAnimationFrame(() => { restorationFrame = requestAnimationFrame(settleRestoredPosition) })
    return () => {
      cancelAnimationFrame(restorationFrame)
      observer.disconnect()
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchcancel', onTouchCancel)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('pageshow', settleRestoredPosition)
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('click', onActivation, true)
      document.removeEventListener('focusin', onFocusIn)
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
      if (previousTime !== null) elapsedRef.current += time - previousTime
      previousTime = time
      const progress = progressAtTime(elapsedRef.current)
      progressRef.current = progress
      const stage = stageRef.current
      if (stage) {
        stage.dataset.requestedProgress = progress.toFixed(4)
        stage.style.setProperty('--stage-progress', progress.toFixed(4))
      }
      window.dispatchEvent(new Event('farmstageprogress'))
      // The scroll gate is released by FarmScene's onPresented callback, not
      // by this requested timeline. If WebGL never presents the completed
      // state, the bounded watchdog releases and settles the experience.
      if (elapsedRef.current < openingDuration) frame = requestAnimationFrame(tick)
    }
    document.addEventListener('visibilitychange', resetClock)
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', resetClock)
    }
  }, [openingState, settleOpening])

  useEffect(() => {
    if (openingState !== 'open' || !openingPlayedRef.current || leafState !== 'idle') return
    setLeafState('armed')
  }, [leafState, openingState])

  const bypassLeaf = useCallback(() => {
    if (leafStateRef.current === 'complete' || leafStateRef.current === 'bypassed') return
    leafStateRef.current = 'bypassed'
    setLeafState('bypassed')
  }, [])

  const startLeaf = useCallback(() => {
    if (leafStateRef.current !== 'armed') return
    leafStateRef.current = 'entering'
    coverCommittedRef.current = false
    soundscape.playLeaves()
    setLeafState('entering')
  }, [soundscape.playLeaves])

  useEffect(() => {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
    let touchY: number | null = null
    const onWheel = (event: WheelEvent) => { if (event.deltaY > 0 && leafStateRef.current === 'armed') startLeaf() }
    const onTouchStart = (event: TouchEvent) => { touchY = event.touches[0]?.clientY ?? null }
    const onTouchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY
      if (leafStateRef.current === 'armed' && touchY !== null && y !== undefined && touchY - y > 14) startLeaf()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && ['entering', 'covered', 'clearing'].includes(leafStateRef.current)) {
        bypassLeaf()
        return
      }
      if (!['ArrowDown', 'PageDown', ' ', 'End'].includes(event.key)) return
      const target = event.target instanceof Element ? event.target : null
      if (leafStateRef.current === 'armed' && !target?.closest('a, button, input, textarea, select, [contenteditable="true"]')) {
        event.preventDefault()
        startLeaf()
      }
    }
    const onClick = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null
      if (!link) return
      const href = link.getAttribute('href')
      const current = leafStateRef.current
      if (href === '#shop' && current === 'armed') {
        event.preventDefault()
        startLeaf()
      } else if (['entering', 'covered', 'clearing'].includes(current)) {
        if (href === '#shop') event.preventDefault()
        else bypassLeaf()
      } else if (current === 'idle' || current === 'armed') {
        // Direct and keyboard navigation must not wait for an animation that
        // has not been armed by a completed opening.
        bypassLeaf()
      }
    }
    const onPreference = () => {
      if (reducedMotion.matches) bypassLeaf()
    }
    const onVisibility = () => { if (document.hidden) bypassLeaf() }
    const onPageHide = () => bypassLeaf()
    addEventListener('wheel', onWheel, { passive: true })
    addEventListener('touchstart', onTouchStart, { passive: true })
    addEventListener('touchmove', onTouchMove, { passive: true })
    addEventListener('keydown', onKeyDown)
    addEventListener('pagehide', onPageHide)
    document.addEventListener('click', onClick, true)
    document.addEventListener('visibilitychange', onVisibility)
    reducedMotion.addEventListener('change', onPreference)
    return () => {
      removeEventListener('wheel', onWheel)
      removeEventListener('touchstart', onTouchStart)
      removeEventListener('touchmove', onTouchMove)
      removeEventListener('keydown', onKeyDown)
      removeEventListener('pagehide', onPageHide)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('visibilitychange', onVisibility)
      reducedMotion.removeEventListener('change', onPreference)
    }
  }, [bypassLeaf, startLeaf])

  useEffect(() => {
    if (!['entering', 'covered', 'clearing'].includes(leafState)) return
    const watchdog = window.setTimeout(bypassLeaf, 3600)
    return () => window.clearTimeout(watchdog)
  }, [bypassLeaf, leafState])

  const onLeafEntered = useCallback(() => {
    if (leafStateRef.current !== 'entering') return
    leafStateRef.current = 'covered'
    setLeafState('covered')
  }, [])

  const onLeafCoverPresented = useCallback(() => {
    if (leafStateRef.current !== 'covered' || coverCommittedRef.current) return
    coverCommittedRef.current = true
    const target = document.getElementById('shop')
    if (!target) return bypassLeaf()
    history.pushState(null, '', '#shop')
    const root = document.documentElement
    const previousScrollBehavior = root.style.scrollBehavior
    root.style.scrollBehavior = 'auto'
    target.scrollIntoView({ block: 'start' })
    root.style.scrollBehavior = previousScrollBehavior
    window.setTimeout(() => {
      if (leafStateRef.current !== 'covered') return
      leafStateRef.current = 'clearing'
      setLeafState('clearing')
    }, 1000)
  }, [bypassLeaf])

  const onLeafCleared = useCallback(() => {
    if (leafStateRef.current !== 'clearing') return
    leafStateRef.current = 'complete'
    setLeafState('complete')
  }, [])

  useEffect(() => {
    let lastPointerMove = 0
    const dwellTimers = new Map<Element, number>()
    const kindFor = (element: Element) => element.getAttribute('data-animal-sound') as AnimalSound | null
    const onPointerMove = (event: PointerEvent) => { if (event.pointerType === 'mouse') lastPointerMove = performance.now() }
    const onPointerEnter = (event: Event) => {
      const target = event.currentTarget as Element
      const kind = kindFor(target)
      if (!kind || performance.now() - lastPointerMove > 450) return
      dwellTimers.set(target, window.setTimeout(() => { soundscape.playAnimal(kind); dwellTimers.delete(target) }, 180))
    }
    const onPointerLeave = (event: Event) => {
      const target = event.currentTarget as Element
      const timer = dwellTimers.get(target)
      if (timer !== undefined) window.clearTimeout(timer)
      dwellTimers.delete(target)
    }
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('[data-animal-sound]') : null
      const kind = target ? kindFor(target) : null
      if (kind) soundscape.playAnimal(kind)
    }
    const animalLinks = [...document.querySelectorAll('[data-animal-sound]')]
    animalLinks.forEach((link) => {
      link.addEventListener('pointerenter', onPointerEnter)
      link.addEventListener('pointerleave', onPointerLeave)
    })
    addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('click', onClick)
    return () => {
      animalLinks.forEach((link) => {
        link.removeEventListener('pointerenter', onPointerEnter)
        link.removeEventListener('pointerleave', onPointerLeave)
      })
      removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('click', onClick)
      dwellTimers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [soundscape.playAnimal])

  return (
    <div
      data-opening-state={openingState}
      data-opening-content={openingContentState}
      data-scroll-hold={introHoldActive ? 'active' : 'released'}
      data-scroll-hold-policy="presented-complete"
      data-scroll-hold-watchdog-ms={openingWatchdog}
      data-leaf-state={leafState}
      data-sound-ready={soundscape.snapshot.audioReady ? 'true' : 'false'}
    >
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
        <SoundControls
          snapshot={soundscape.snapshot}
          onToggle={soundscape.toggleMusic}
        />
      </header>

      <main id="main" inert={['entering', 'covered', 'clearing'].includes(leafState) ? true : undefined}>
        <section
          className={`hero-stage hero-stage--${sceneState}`}
          id="top"
          ref={stageRef}
          aria-labelledby="hero-heading"
          data-opening-state={openingState}
          data-opening-content={openingContentState}
          data-scroll-hold={introHoldActive ? 'active' : 'released'}
          data-scroll-hold-policy="presented-complete"
          data-scroll-hold-watchdog-ms={openingWatchdog}
        >
          <div className="hero-sticky">
            <picture className="market-opening__plate" aria-hidden="true">
              <source media="(max-width: 760px)" srcSet={publicAsset('media/real-farm/mark-stebnicki-orchard-portrait.avif')} />
              <img src={publicAsset('media/real-farm/mark-stebnicki-orchard-desktop.avif')} alt="" width="2400" height="1600" fetchPriority="high" onError={() => setSceneState('fallback')} />
            </picture>
            <div className="scene-visual" aria-label="Morning light crosses a real orchard as a timber market shutter lifts and a supported apple rolls behind the left post">
              <picture className="fallback-poster" aria-hidden="true">
                <source media="(max-width: 760px)" srcSet={publicAsset('media/market-opening-poster-portrait.avif')} />
                <img src={publicAsset('media/market-opening-poster-desktop.avif')} alt="" />
              </picture>
              <picture className="settled-poster" aria-hidden="true">
                <source media="(max-width: 760px)" srcSet={publicAsset('media/market-opening-settled-portrait.avif')} />
                <img src={publicAsset('media/market-opening-settled-desktop.avif')} alt="" />
              </picture>
              <Suspense fallback={null}>
                <FarmScene progressRef={progressRef} onStateChange={onSceneState} onPresented={onPresented} />
              </Suspense>
              <div className="scene-vignette" aria-hidden="true" />
              <p className="scene-status" aria-live="polite">
                {sceneState === 'loading' ? 'Preparing the farm stand…' : sceneState === 'fallback' ? 'Static farm stand view' : openingState === 'playing' ? 'The market is opening…' : ''}
              </p>
            </div>
            <div className="hero-copy" aria-hidden={openingContentState === 'opening' || openingContentState === 'settled'} inert={openingContentState === 'opening' || openingContentState === 'settled' ? true : undefined}>
              <h1 id="hero-heading">This is what your farm could look like online.</h1>
              <p className="hero-support">Show what’s available. Help customers find you. Make enquiries straightforward.</p>
              <div className="hero-actions">
                <a className="button button--sun" href="#shop">Explore the demo <span aria-hidden="true">↓</span></a>
                <a className="text-link" href="#contact">Discuss my website <span aria-hidden="true">↗</span></a>
              </div>
            </div>
            <nav className="entrance-links" aria-label="Go straight to the market or farm-life scenes" aria-hidden={openingContentState === 'opening' || openingContentState === 'settled'} inert={openingContentState === 'opening' || openingContentState === 'settled' ? true : undefined}>
              <a href="#shop"><img src={publicAsset('media/catalogue-expanded/apple.avif')} alt="" width="960" height="640" /><span>Shop</span></a>
              <a href="#hens" data-animal-sound="hens"><img src={publicAsset('media/farm-life-motion/hens-poster.avif')} alt="" width="1280" height="720" /><span>Hens</span></a>
              <a href="#cattle" data-animal-sound="cattle"><img src={publicAsset('media/farm-life-motion/cattle-poster.avif')} alt="" width="1280" height="720" /><span>Cattle</span></a>
              <a href="#sheep" data-animal-sound="sheep"><img src={publicAsset('media/farm-life-motion/sheep-poster.avif')} alt="" width="1280" height="720" /><span>Sheep</span></a>
            </nav>
            <div className="market-opening__progress" aria-hidden="true">
              <span>Morning light</span><i /><span>Open stand</span>
            </div>
            {openingState === 'waiting' && <div className="scroll-cue" aria-hidden="true"><span /> Scroll to open the stand</div>}
          </div>
          <span className="demo-anchor" id="demo" aria-hidden="true" />
        </section>

        <ShopSection basket={basket} dispatch={dispatchBasket} focusRequest={shopFocusRequest} marketReady={marketReady} onCommerceSound={soundscape.playCommerce} />
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

      {(['entering', 'covered', 'clearing'] as LeafPhase[]).includes(leafState as LeafPhase) && (
        <LeafHandoff phase={leafState as LeafPhase} onEntered={onLeafEntered} onCoverPresented={onLeafCoverPresented} onCleared={onLeafCleared} />
      )}

      <footer>
        <a className="footer-brand" href="#top" aria-label="Return to the farm stand"><Logo /> <span>Return to the farm stand ↑</span></a>
        <p>Farm stand website example · no orders, payments, bookings, or submissions</p>
        <p>Produce models: Poly Haven, CC0 · product photography: credited Pexels contributors</p>
        <p>Farm photograph: <a href="https://www.pexels.com/photo/trees-in-orchard-17765489/">Mark Stebnicki / Pexels</a> · leaf texture: <a href="https://ambientcg.com/view?id=LeafSet006">ambientCG, CC0</a> · <a href="https://incompetech.com/music/royalty-free/index.html?Search=Search&amp;isrc=USUAN2300003">“Morning” by Kevin MacLeod</a>, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a></p>
      </footer>
    </div>
  )
}
