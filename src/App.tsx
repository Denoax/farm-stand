import { lazy, Suspense, useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { business } from './content/config'
import { ContactPreview } from './components/ContactPreview'
import { ShopSection } from './components/ShopSection'
import { FarmLife } from './components/FarmLife'
import { VisitSection } from './components/VisitSection'
import { TryUpdate } from './components/TryUpdate'
import { basketReducer, basketStorageKey, parseBasketSnapshot } from './state/basket'
import type { ProductId } from './content/catalogue'

const FarmScene = lazy(() => import('./components/FarmScene').then((module) => ({ default: module.FarmScene })))
const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

type SceneState = 'loading' | 'ready' | 'fallback'

export function App() {
  const stageRef = useRef<HTMLElement>(null)
  const progressRef = useRef(0)
  const [sceneState, setSceneState] = useState<SceneState>('loading')
  const [motionPaused, setMotionPaused] = useState(false)
  const [basket, dispatchBasket] = useReducer(basketReducer, {}, () => {
    try {
      return parseBasketSnapshot(sessionStorage.getItem(basketStorageKey))
    } catch {
      return {}
    }
  })
  const [shopFocusRequest, setShopFocusRequest] = useState<{ productId: ProductId; sequence: number }>()
  const onSceneState = useCallback((state: SceneState) => {
    setSceneState((current) => current === 'fallback' ? current : state)
  }, [])
  const onPresented = useCallback((progress: number, shot: string) => {
    const stage = stageRef.current
    if (!stage) return
    const value = progress.toFixed(4)
    stage.style.setProperty('--stage-progress', value)
    stage.dataset.presentedProgress = value
    stage.dataset.shot = shot
    document.documentElement.style.setProperty('--stage-progress', value)
  }, [])
  const viewShopProduct = useCallback((productId: ProductId) => {
    window.history.replaceState(null, '', `#product-${productId}`)
    setShopFocusRequest((current) => ({ productId, sequence: (current?.sequence ?? 0) + 1 }))
  }, [])

  useEffect(() => {
    try {
      sessionStorage.setItem(basketStorageKey, JSON.stringify(basket))
    } catch {
      // Storage can be unavailable in privacy-restricted contexts; the in-memory demo remains usable.
    }
  }, [basket])

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
    let raf = 0
    let previousHeroActive: boolean | null = null

    const setInteractive = (selector: string, active: boolean) => {
      const element = stage.querySelector<HTMLElement>(selector)
      if (!element) return
      if (active) element.removeAttribute('inert')
      else element.setAttribute('inert', '')
      element.setAttribute('aria-hidden', active ? 'false' : 'true')
    }

    const update = () => {
      raf = 0
      if (reducedMotion.matches) {
        progressRef.current = 1
        stage.dataset.requestedProgress = '1.0000'
        setInteractive('.hero-copy', true)
        previousHeroActive = true
      } else {
        const bounds = stage.getBoundingClientRect()
        const scrollable = Math.max(stage.offsetHeight - window.innerHeight, 1)
        const progress = Math.min(1, Math.max(0, -bounds.top / scrollable))
        const heroActive = progress < 0.22
        progressRef.current = progress
        stage.dataset.requestedProgress = progress.toFixed(4)
        if (heroActive !== previousHeroActive) setInteractive('.hero-copy', heroActive)
        previousHeroActive = heroActive
      }
      window.dispatchEvent(new Event('farmstageprogress'))
    }
    const scheduleUpdate = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    reducedMotion.addEventListener('change', scheduleUpdate)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      reducedMotion.removeEventListener('change', scheduleUpdate)
    }
  }, [])

  return (
    <div data-motion-paused={motionPaused ? 'true' : 'false'}>
      <a className="skip-link" href="#main">Skip to the main content</a>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Farm stand demonstration, home">
          <span className="wordmark-mark" aria-hidden="true">FS</span>
          <span>Farm stand <small>website demonstration</small></span>
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
                <FarmScene progressRef={progressRef} motionPaused={motionPaused} onStateChange={onSceneState} onPresented={onPresented} />
              </Suspense>
              <div className="scene-vignette" aria-hidden="true" />
              <p className="scene-status" aria-live="polite">
                {sceneState === 'loading' ? 'Preparing the farm stand…' : sceneState === 'fallback' ? 'Static farm stand view' : ''}
              </p>
            </div>
            <div className="hero-copy">
              <p className="eyebrow eyebrow--hero">{business.service_descriptor}</p>
              <h1 id="hero-heading">This is what your farm could look like online.</h1>
              <p className="hero-support">Show what’s available. Help customers find you. Make enquiries straightforward.</p>
              <div className="hero-actions">
                <a className="button button--sun" href="#shop">Explore the demo <span aria-hidden="true">↓</span></a>
                <a className="text-link" href="#contact">Discuss my website <span aria-hidden="true">↗</span></a>
              </div>
              <p className="hero-disclosure">A fictional farm-shop experience demonstrating a real website service. No produce is sold here.</p>
            </div>
            <div className="market-opening__progress" aria-hidden="true">
              <span>Morning light</span><i /><span>Open stand</span>
            </div>
            <button
              className="market-opening__motion"
              type="button"
              aria-pressed={motionPaused}
              onClick={() => setMotionPaused((paused) => !paused)}
            >
              {motionPaused ? 'Resume opening' : 'Pause opening'}
            </button>
            <div className="scroll-cue" aria-hidden="true"><span /> Scroll to open the stand</div>
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
        <a href="#top">Return to the farm stand ↑</a>
        <p>Farm stand website example · no orders, payments, bookings, or submissions</p>
        <p>Produce models: Poly Haven, CC0 · photography: credited Pexels contributors · background: project-generated original</p>
      </footer>
    </div>
  )
}
