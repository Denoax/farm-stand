import { lazy, Suspense, useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { business, type HeroProductId } from './content/config'
import { ContactPreview } from './components/ContactPreview'
import { ShopDemo } from './components/ShopDemo'
import { ShopSection } from './components/ShopSection'
import { FarmLife } from './components/FarmLife'
import { VisitSection } from './components/VisitSection'
import { basketReducer } from './state/basket'

const FarmScene = lazy(() => import('./components/FarmScene').then((module) => ({ default: module.FarmScene })))
const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

type SceneState = 'loading' | 'ready' | 'fallback'

export function App() {
  const stageRef = useRef<HTMLElement>(null)
  const progressRef = useRef(0)
  const [selectedProduct, setSelectedProduct] = useState<HeroProductId>('apple')
  const [sceneState, setSceneState] = useState<SceneState>('loading')
  const [basket, dispatchBasket] = useReducer(basketReducer, {})
  const onSceneState = useCallback((state: SceneState) => setSceneState(state), [])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let raf = 0
    let previousDemoActive: boolean | null = null
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
        stage.style.setProperty('--stage-progress', '1')
        stage.dataset.demoActive = 'true'
        setInteractive('.hero-copy', true)
        setInteractive('.stand-transition', true)
        previousDemoActive = true
        previousHeroActive = true
      } else {
        const bounds = stage.getBoundingClientRect()
        const scrollable = Math.max(stage.offsetHeight - window.innerHeight, 1)
        const progress = Math.min(1, Math.max(0, -bounds.top / scrollable))
        const demoActive = progress > 0.66
        const heroActive = progress < 0.46
        progressRef.current = progress
        stage.style.setProperty('--stage-progress', progress.toFixed(4))
        stage.dataset.demoActive = demoActive ? 'true' : 'false'
        if (demoActive !== previousDemoActive) setInteractive('.stand-transition', demoActive)
        if (heroActive !== previousHeroActive) setInteractive('.hero-copy', heroActive)
        previousDemoActive = demoActive
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
    <>
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
            <div className="scene-visual" aria-label="Sunlit farm stand with an apple and a yellow onion on a shallow wooden crate">
              <picture className="fallback-poster" aria-hidden="true">
                <source media="(max-width: 760px)" srcSet={publicAsset('media/farm-stand-poster-portrait.avif')} />
                <img src={publicAsset('media/farm-stand-poster-desktop.avif')} alt="" />
              </picture>
              <Suspense fallback={null}>
                <FarmScene progressRef={progressRef} selectedProduct={selectedProduct} onStateChange={onSceneState} />
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

            <ShopDemo selectedProduct={selectedProduct} onSelect={setSelectedProduct} />
            <div className="scroll-cue" aria-hidden="true"><span /> Scroll to open the stand</div>
          </div>
          <span className="demo-anchor" id="demo" aria-hidden="true" />
        </section>

        <ShopSection basket={basket} dispatch={dispatchBasket} />
        <FarmLife />
        <VisitSection />

        <section className="service" id="website" aria-labelledby="service-heading">
          <div className="service-heading">
            <p className="eyebrow">Your website</p>
            <h2 id="service-heading">A website built around how your business works.</h2>
            <p className="service-lead">This demonstration brings distinctive presentation, scannable products, practical information, and a clear enquiry path into one coherent experience.</p>
          </div>
          <div className="service-story">
            <p className="eyebrow">A plain-language process</p>
            <ol className="process-list">
              <li><span>01</span><div><strong>Understand the business</strong><p>Start with what customers need to know and what the owner needs the website to make easier.</p></div></li>
              <li><span>02</span><div><strong>Organize the content</strong><p>Shape products, services, visiting details, and enquiries into a structure people can scan.</p></div></li>
              <li><span>03</span><div><strong>Design and build</strong><p>Create the visual system and responsive frontend around the real material available.</p></div></li>
              <li><span>04</span><div><strong>Review and launch</strong><p>Test the important journeys, refine the result, and configure approved hosting and contact details.</p></div></li>
            </ol>
          </div>
          <div className="service-boundary">
            <p><strong>Demonstrated here:</strong> responsive frontend design, product presentation, basket interactions, useful information architecture, fallbacks, and an enquiry-preview interface.</p>
            <p><strong>Configured separately if approved:</strong> inventory, payments, booking, a CMS, message delivery, analytics, or ongoing support.</p>
          </div>
        </section>

        <ContactPreview />
      </main>

      <footer>
        <a href="#top">Return to the farm stand ↑</a>
        <p>Working project label · public demonstration · no orders, payments, bookings, or submissions</p>
        <p>Produce models: Poly Haven, CC0 · photography: credited Pexels contributors · background: project-generated original</p>
      </footer>
    </>
  )
}
