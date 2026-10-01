import { lazy, Suspense, useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { ContactPreview } from './components/ContactPreview'
import { ShopSection } from './components/ShopSection'
import { FarmLife } from './components/FarmLife'
import { VisitSection } from './components/VisitSection'
import { Logo } from './components/Logo'
import { ServiceSection, SiteFooter } from './components/AfterAlbum'
import { VideoHandoff, type HandoffClip, type HandoffKind, type HandoffPhase } from './components/VideoHandoff'
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
type ShopHandoffState = 'idle' | 'armed' | 'complete' | 'bypassed'
interface HandoffRequest { kind: HandoffKind; targetId: string }
type ScrollHintState = 'hidden' | 'closed' | 'market'

const openingStorageKey = 'farm-stand-market-opening-v2'
const openingDuration = 6500
// The final photograph starts 210 ms after the 580 ms return animation.
// Begin the return with enough time to reach the exact complete style before
// the fixed 6.5 second opening settles; changing state must not cancel it.
const contentReturnStart = 0.875
const openingSettleStart = 0.75
const openingWatchdog = 9000
const handoffWatchdog = 7500
const scrollHintDelay = 3000
const HANDOFF_CLIPS: Record<HandoffKind, HandoffClip> = {
  shop: {
    kind: 'shop',
    src: publicAsset('media/transitions/leaves-shop-01-alpha.webm'),
    holdSrc: publicAsset('media/transitions/leaves-shop-cover.webp'),
    coverStart: 3.03,
    coverEnd: 3.8,
    scale: 1,
    playbackRate: 1.35,
  },
  animals: {
    kind: 'animals',
    src: publicAsset('media/transitions/leaves-animals-02-alpha.webm'),
    holdSrc: publicAsset('media/transitions/leaves-animals-cover.webp'),
    coverStart: 1.9,
    // The native opaque interval is only three decoded frames. Keep its
    // decoded 1.933 s source frame above the keyed clip a little longer so
    // destination commit cannot be missed at 1.35x playback.
    coverEnd: 2.6,
    // The native clip never covers the complete frame. This explicit crop is
    // the smallest inspected scale with four consecutive opaque frames.
    scale: 1.9,
    playbackRate: 1.35,
  },
}

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
  const bypassesOpening = shouldBypassOpening()
  const [shopHandoffState, setShopHandoffState] = useState<ShopHandoffState>(() => bypassesOpening ? 'bypassed' : 'idle')
  const [handoffPhase, setHandoffPhase] = useState<HandoffPhase | 'idle'>('idle')
  const [handoffRequest, setHandoffRequest] = useState<HandoffRequest>()
  const [handoffRun, setHandoffRun] = useState(0)
  const [marketReady, setMarketReady] = useState(bypassesOpening)
  const [scrollHint, setScrollHint] = useState<ScrollHintState>('hidden')
  const shopHandoffStateRef = useRef(shopHandoffState)
  const handoffPhaseRef = useRef(handoffPhase)
  const handoffRequestRef = useRef(handoffRequest)
  const pendingHandoffRef = useRef<HandoffRequest | undefined>(undefined)
  const pendingFocusRef = useRef<string | undefined>(undefined)
  const openingStateRef = useRef(openingState)
  const sceneStateRef = useRef(sceneState)
  const coverCommittedRef = useRef(false)
  const openingPlayedRef = useRef(false)
  const shownHintsRef = useRef(new Set<Exclude<ScrollHintState, 'hidden'>>())
  const [idleSequence, setIdleSequence] = useState(0)
  const elapsedRef = useRef(openingState === 'open' ? openingDuration : 0)
  const scrollGate = useOpeningScrollGate(openingWatchdog)
  const [headerCompact, setHeaderCompact] = useState(() => window.scrollY > 104)
  const introHoldActive = scrollGate.owner === 'opening'
  const introHoldRef = scrollGate.activeRef
  const soundscape = useSoundscape()
  openingStateRef.current = openingState
  shopHandoffStateRef.current = shopHandoffState
  handoffPhaseRef.current = handoffPhase
  handoffRequestRef.current = handoffRequest
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

  const syncHeaderState = useCallback(() => {
    const logicalY = scrollGate.getLogicalScrollY()
    setHeaderCompact((current) => logicalY > 104 ? true : logicalY < 36 ? false : current)
  }, [scrollGate.getLogicalScrollY])

  useEffect(() => {
    let frame = 0
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(syncHeaderState)
    }
    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [scrollGate.owner, syncHeaderState])
  const settleOpening = useCallback((state: Extract<OpeningState, 'open' | 'fallback'> = 'open') => {
    scrollGate.release('opening')
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
  }, [scrollGate.release])
  const onSceneState = useCallback((state: SceneState) => setSceneState((current) => current === 'fallback' ? current : state), [])
  const onPresented = useCallback((progress: number, shot: string) => {
    const stage = stageRef.current
    if (!stage) return
    const value = progress.toFixed(4)
    stage.style.setProperty('--stage-progress', value)
    stage.dataset.presentedProgress = value
    stage.dataset.shot = shot
    document.documentElement.style.setProperty('--stage-progress', value)
    const presented = evaluateMarketOpening(progress)
    soundscape.syncOpening(shot, presented.shutterLift, presented.appleRoll)
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
      shopHandoffStateRef.current = 'bypassed'
      setShopHandoffState('bypassed')
      setMarketReady(true)
    }
  }, [sceneState, settleOpening])

  useEffect(() => {
    const unlock = (event: Event) => {
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest('.music-toggle')) return
      void soundscape.handleEligibleInteraction()
    }
    const unlockFromKey = (event: KeyboardEvent) => {
      if (!event.altKey && !event.ctrlKey && !event.metaKey) unlock(event)
    }
    window.addEventListener('pointerdown', unlock, { capture: true, passive: true })
    window.addEventListener('keydown', unlockFromKey, { capture: true })
    return () => {
      window.removeEventListener('pointerdown', unlock, { capture: true })
      window.removeEventListener('keydown', unlockFromKey, { capture: true })
    }
  }, [soundscape.handleEligibleInteraction])

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
      scrollGate.begin('opening', () => settleOpening())
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
      scrollGate.release('opening', false)
    }
  }, [scrollGate.begin, scrollGate.release, settleOpening])

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
    if (openingState !== 'open' || !openingPlayedRef.current || shopHandoffState !== 'idle') return
    shopHandoffStateRef.current = 'armed'
    setShopHandoffState('armed')
  }, [openingState, shopHandoffState])

  const moveToTarget = useCallback((targetId: string, withGate: boolean) => {
    const target = document.getElementById(targetId)
    if (!target) return false
    const currentY = withGate ? Number.parseFloat(document.body.style.top || '0') * -1 : window.scrollY
    const targetY = target.getBoundingClientRect().top + currentY
    if (withGate) scrollGate.moveTo('handoff', 0, targetY)
    else target.scrollIntoView({ block: 'start' })
    requestAnimationFrame(syncHeaderState)
    return true
  }, [scrollGate.moveTo, syncHeaderState])

  const finishHandoff = useCallback((failed = false) => {
    const request = handoffRequestRef.current
    if (!request) return
    soundscape.stopLeafTransition()
    const wasLocked = scrollGate.activeRef.current === 'handoff'
    if (!coverCommittedRef.current) {
      history.pushState(null, '', `#${request.targetId}`)
      moveToTarget(request.targetId, wasLocked)
    }
    scrollGate.release('handoff')
    if (coverCommittedRef.current) {
      const root = document.documentElement
      const previousScrollBehavior = root.style.scrollBehavior
      root.style.scrollBehavior = 'auto'
      document.getElementById(request.targetId)?.scrollIntoView({ block: 'start' })
      root.style.scrollBehavior = previousScrollBehavior
    }
    if (request.kind === 'shop') {
      shopHandoffStateRef.current = failed ? 'bypassed' : 'complete'
      setShopHandoffState(failed ? 'bypassed' : 'complete')
      setMarketReady(true)
    }
    window.dispatchEvent(new CustomEvent('farmstandhandofftrace', {
      detail: {
        runId: handoffRun,
        event: 'terminated',
        phase: handoffPhaseRef.current,
        kind: request.kind,
        destination: request.targetId,
        committed: coverCommittedRef.current,
        unlocked: true,
        reason: failed ? 'bypass' : 'ended',
      },
    }))
    handoffPhaseRef.current = 'idle'
    handoffRequestRef.current = undefined
    setHandoffPhase('idle')
    setHandoffRequest(undefined)
    pendingFocusRef.current = request.targetId
    const pending = pendingHandoffRef.current
    pendingHandoffRef.current = undefined
    if (pending && pending.targetId !== request.targetId) {
      window.setTimeout(() => {
        handoffRequestRef.current = pending
        handoffPhaseRef.current = 'preparing'
        coverCommittedRef.current = false
        setHandoffRequest(pending)
        setHandoffPhase('preparing')
        setHandoffRun((run) => run + 1)
      }, 0)
    }
  }, [handoffRun, moveToTarget, scrollGate.activeRef, scrollGate.release, soundscape.stopLeafTransition])

  const startHandoff = useCallback((request: HandoffRequest) => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      history.pushState(null, '', `#${request.targetId}`)
      moveToTarget(request.targetId, false)
      if (request.kind === 'shop') {
        shopHandoffStateRef.current = 'bypassed'
        setShopHandoffState('bypassed')
        setMarketReady(true)
      }
      return
    }
    if (handoffRequestRef.current) {
      if (!coverCommittedRef.current && handoffRequestRef.current.kind === request.kind) {
        handoffRequestRef.current = request
        setHandoffRequest(request)
      } else {
        // One active overlay only; the latest post-commit destination replaces
        // any earlier pending request and starts after the current clip clears.
        pendingHandoffRef.current = request
      }
      return
    }
    handoffRequestRef.current = request
    handoffPhaseRef.current = 'preparing'
    coverCommittedRef.current = false
    setHandoffRequest(request)
    setHandoffPhase('preparing')
    setHandoffRun((run) => run + 1)
  }, [moveToTarget])

  const startPreparedHandoff = useCallback(() => {
    if (handoffPhaseRef.current !== 'preparing') return
    if (!scrollGate.begin('handoff', () => finishHandoff(true), handoffWatchdog)) return finishHandoff(true)
    handoffPhaseRef.current = 'covering'
    setHandoffPhase('covering')
  }, [finishHandoff, scrollGate.begin])

  const commitCoveredHandoff = useCallback(() => {
    const request = handoffRequestRef.current
    if (!request || coverCommittedRef.current || scrollGate.activeRef.current !== 'handoff') return
    coverCommittedRef.current = true
    window.dispatchEvent(new CustomEvent('farmstandhandofftrace', {
      detail: { runId: handoffRun, event: 'commit', phase: 'covered', kind: request.kind, destination: request.targetId, committed: true, unlocked: false },
    }))
    history.pushState(null, '', `#${request.targetId}`)
    if (!moveToTarget(request.targetId, true)) return finishHandoff(true)
    handoffPhaseRef.current = 'covered'
    setHandoffPhase('covered')
  }, [finishHandoff, handoffRun, moveToTarget, scrollGate.activeRef])

  const finishSuccessfulHandoff = useCallback(() => finishHandoff(false), [finishHandoff])
  const failHandoffOpen = useCallback(() => finishHandoff(true), [finishHandoff])

  const revealHandoff = useCallback(() => {
    if (!coverCommittedRef.current) return finishHandoff(true)
    handoffPhaseRef.current = 'revealing'
    setHandoffPhase('revealing')
  }, [finishHandoff])

  useEffect(() => {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
    let touchY: number | null = null
    const active = () => handoffPhaseRef.current !== 'idle'
    const startShop = () => startHandoff({ kind: 'shop', targetId: 'shop' })
    const onWheel = (event: WheelEvent) => {
      if (active()) { event.preventDefault(); return }
      if (event.deltaY > 0 && shopHandoffStateRef.current === 'armed') { event.preventDefault(); startShop() }
    }
    const onTouchStart = (event: TouchEvent) => { touchY = event.touches[0]?.clientY ?? null }
    const onTouchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY
      if (active()) { event.preventDefault(); return }
      if (shopHandoffStateRef.current === 'armed' && touchY !== null && y !== undefined && touchY - y > 14) {
        event.preventDefault()
        startShop()
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && active()) { finishHandoff(true); return }
      if (!['ArrowDown', 'PageDown', ' ', 'End'].includes(event.key)) return
      const target = event.target instanceof Element ? event.target : null
      if (shopHandoffStateRef.current === 'armed' && !target?.closest('a, button, input, textarea, select, [contenteditable="true"]')) {
        event.preventDefault()
        startShop()
      }
    }
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href^="#"]') : null
      if (!link) return
      const targetId = decodeURIComponent((link.getAttribute('href') ?? '').slice(1))
      const animalLink = link.closest('.entrance-links') && link.hasAttribute('data-animal-sound')
      if (animalLink && ['hens', 'cattle', 'sheep'].includes(targetId)) {
        event.preventDefault()
        startHandoff({ kind: 'animals', targetId })
        return
      }
      if (targetId === 'shop' && shopHandoffStateRef.current === 'armed') {
        event.preventDefault()
        startShop()
      } else if (active()) {
        event.preventDefault()
        const current = handoffRequestRef.current
        if (current && targetId !== current.targetId) {
          // Persistent navigation remains an escape path, not an excuse to
          // play an animal clip for an unrelated destination.
          handoffRequestRef.current = { ...current, targetId }
          finishHandoff(true)
        }
      } else if (shopHandoffStateRef.current === 'idle' || shopHandoffStateRef.current === 'armed') {
        shopHandoffStateRef.current = 'bypassed'
        setShopHandoffState('bypassed')
        setMarketReady(true)
      }
    }
    const failOpen = () => { if (active()) finishHandoff(true) }
    const onPreference = () => { if (reducedMotion.matches) failOpen() }
    const onVisibility = () => { if (document.hidden) failOpen() }
    addEventListener('wheel', onWheel, { passive: false })
    addEventListener('touchstart', onTouchStart, { passive: true })
    addEventListener('touchmove', onTouchMove, { passive: false })
    addEventListener('keydown', onKeyDown)
    addEventListener('pagehide', failOpen)
    document.addEventListener('click', onClick, true)
    document.addEventListener('visibilitychange', onVisibility)
    reducedMotion.addEventListener('change', onPreference)
    return () => {
      removeEventListener('wheel', onWheel)
      removeEventListener('touchstart', onTouchStart)
      removeEventListener('touchmove', onTouchMove)
      removeEventListener('keydown', onKeyDown)
      removeEventListener('pagehide', failOpen)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('visibilitychange', onVisibility)
      reducedMotion.removeEventListener('change', onPreference)
    }
  }, [finishHandoff, startHandoff])

  useEffect(() => {
    if (handoffPhase !== 'idle' || !pendingFocusRef.current) return
    const targetId = pendingFocusRef.current
    pendingFocusRef.current = undefined
    const frame = requestAnimationFrame(() => document.getElementById(targetId)?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(frame)
  }, [handoffPhase])

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

  useEffect(() => {
    const state: Exclude<ScrollHintState, 'hidden'> | null =
      openingState === 'waiting' && sceneState === 'ready' && shopHandoffState === 'idle' ? 'closed'
        : openingState === 'open' && openingContentState === 'complete' && shopHandoffState === 'armed' ? 'market'
          : null
    const blocked = scrollGate.owner !== null || document.hidden || Boolean(document.querySelector('dialog[open], .mini-basket'))
    if (!state || blocked || shownHintsRef.current.has(state)) {
      setScrollHint('hidden')
      return
    }
    const timeout = window.setTimeout(() => {
      if (document.hidden || document.querySelector('dialog[open], .mini-basket')) return
      shownHintsRef.current.add(state)
      setScrollHint(state)
    }, scrollHintDelay)
    return () => window.clearTimeout(timeout)
  }, [idleSequence, openingContentState, openingState, sceneState, scrollGate.owner, shopHandoffState])

  useEffect(() => {
    let resetTimer: number | undefined
    const activity = () => {
      setScrollHint('hidden')
      if (resetTimer !== undefined) window.clearTimeout(resetTimer)
      resetTimer = window.setTimeout(() => setIdleSequence((value) => value + 1), 120)
    }
    const keyActivity = (event: KeyboardEvent) => {
      if (!event.altKey && !event.ctrlKey && !event.metaKey) activity()
    }
    addEventListener('pointerdown', activity, { passive: true })
    addEventListener('wheel', activity, { passive: true })
    addEventListener('touchmove', activity, { passive: true })
    addEventListener('keydown', keyActivity)
    addEventListener('scroll', activity, { passive: true })
    return () => {
      if (resetTimer !== undefined) window.clearTimeout(resetTimer)
      removeEventListener('pointerdown', activity)
      removeEventListener('wheel', activity)
      removeEventListener('touchmove', activity)
      removeEventListener('keydown', keyActivity)
      removeEventListener('scroll', activity)
    }
  }, [])

  return (
    <div
      data-opening-state={openingState}
      data-opening-content={openingContentState}
      data-scroll-hold={scrollGate.active ? 'active' : 'released'}
      data-scroll-gate-owner={scrollGate.owner ?? 'none'}
      data-scroll-hold-policy="presented-complete"
      data-scroll-hold-watchdog-ms={openingWatchdog}
      data-handoff-state={handoffRequest ? handoffPhase : shopHandoffState}
      data-handoff-kind={handoffRequest?.kind ?? 'none'}
      data-transition-asset={handoffRequest ? HANDOFF_CLIPS[handoffRequest.kind].src : 'none'}
      data-sound-ready={soundscape.snapshot.audioReady ? 'true' : 'false'}
    >
      <a className="skip-link" href="#main">Skip to the main content</a>
      <header className="site-header" data-compact={headerCompact ? 'true' : 'false'}>
        <div className="header-brand">
          <a className="wordmark" href="#top" aria-label="Farm stand website demonstration, home">
            <Logo />
          </a>
          <SoundControls snapshot={soundscape.snapshot} onToggle={soundscape.toggleMusic} />
        </div>
        <nav aria-label="Main navigation">
          <a href="#shop">Shop</a>
          <a href="#farm-life">Around the farm</a>
          <a href="#website">Your website</a>
          <a className="nav-cta" href="#contact">Discuss a website</a>
        </nav>
      </header>

      <main id="main" inert={['covering', 'covered', 'revealing'].includes(handoffPhase) ? true : undefined}>
        <section
          className={`hero-stage hero-stage--${sceneState}`}
          id="top"
          ref={stageRef}
          aria-labelledby="hero-heading"
          data-opening-state={openingState}
          data-opening-content={openingContentState}
          data-scroll-hold={scrollGate.active ? 'active' : 'released'}
          data-scroll-gate-owner={scrollGate.owner ?? 'none'}
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
                <FarmScene progressRef={progressRef} onStateChange={onSceneState} onPresented={onPresented} onBirdActivate={soundscape.playBird} />
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
            {scrollHint !== 'hidden' && <div className="scroll-cue" data-scroll-hint={scrollHint} aria-hidden="true"><span /> {scrollHint === 'closed' ? 'Scroll to open the stand' : 'Scroll into the market'}</div>}
          </div>
          <span className="demo-anchor" id="demo" aria-hidden="true" />
        </section>

        <ShopSection basket={basket} dispatch={dispatchBasket} focusRequest={shopFocusRequest} marketReady={marketReady} onCommerceSound={soundscape.playCommerce} />
        <FarmLife
          onViewProduct={viewShopProduct}
          onHearAnimal={soundscape.playAnimal}
          handoffActive={handoffPhase !== 'idle'}
          handoffTarget={handoffRequest?.targetId}
        />
        <VisitSection onInterfaceSound={soundscape.playCommerce} />
        <ServiceSection onInterfaceSound={soundscape.playCommerce} />

        <ContactPreview onInterfaceSound={soundscape.playCommerce} />
      </main>

      {handoffRequest && handoffPhase !== 'idle' && (
        <VideoHandoff
          key={handoffRun}
          runId={handoffRun}
          targetId={handoffRequest.targetId}
          clip={HANDOFF_CLIPS[handoffRequest.kind]}
          phase={handoffPhase}
          onReady={startPreparedHandoff}
          onCovered={commitCoveredHandoff}
          onRevealing={revealHandoff}
          onEnded={finishSuccessfulHandoff}
          onFailed={failHandoffOpen}
          onMediaTime={soundscape.syncLeafTransition}
          onSoundStop={soundscape.stopLeafTransition}
        />
      )}

      <SiteFooter onInterfaceSound={soundscape.playCommerce} />
    </div>
  )
}
