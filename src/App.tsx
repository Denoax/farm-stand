import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { business, type ProductId } from './content/config'
import { ContactPreview } from './components/ContactPreview'
import { ShopDemo } from './components/ShopDemo'

const FarmScene = lazy(() => import('./components/FarmScene').then((module) => ({ default: module.FarmScene })))
const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

type SceneState = 'loading' | 'ready' | 'fallback'

export function App() {
  const stageRef = useRef<HTMLElement>(null)
  const progressRef = useRef(0)
  const [selectedProduct, setSelectedProduct] = useState<ProductId>('apple')
  const [sceneState, setSceneState] = useState<SceneState>('loading')
  const onSceneState = useCallback((state: SceneState) => setSceneState(state), [])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let raf = 0

    const update = () => {
      raf = 0
      if (reducedMotion.matches) {
        progressRef.current = 1
        stage.style.setProperty('--stage-progress', '1')
        return
      }
      const bounds = stage.getBoundingClientRect()
      const scrollable = Math.max(stage.offsetHeight - window.innerHeight, 1)
      const progress = Math.min(1, Math.max(0, -bounds.top / scrollable))
      progressRef.current = progress
      stage.style.setProperty('--stage-progress', progress.toFixed(4))
      stage.dataset.demoActive = progress > 0.72 ? 'true' : 'false'
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
          <a href="#demo">Try the demo</a>
          <a className="nav-cta" href="#contact">Discuss my website</a>
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
                <a className="button button--sun" href="#demo">Explore the demo <span aria-hidden="true">↓</span></a>
                <a className="text-link" href="#contact">Discuss my website <span aria-hidden="true">↗</span></a>
              </div>
              <p className="hero-disclosure">A fictional farm-shop experience demonstrating a real website service. No produce is sold here.</p>
            </div>

            <ShopDemo selectedProduct={selectedProduct} onSelect={setSelectedProduct} />
            <div className="scroll-cue" aria-hidden="true"><span /> Scroll to open the stand</div>
          </div>
          <span className="demo-anchor" id="demo" aria-hidden="true" />
        </section>

        <section className="service" id="service" aria-labelledby="service-heading">
          <div className="service-heading">
            <p className="eyebrow">From today’s crop to a useful website</p>
            <h2 id="service-heading">The stand is the story. The clear next step is the service.</h2>
          </div>
          <div className="service-story">
            <p className="service-lead">A good farm website can keep practical information close to the character of the place—without making visitors work for either.</p>
            <dl>
              <div>
                <dt>Show what’s current</dt>
                <dd>Present produce or services in a form people can scan and understand.</dd>
              </div>
              <div>
                <dt>Make visiting clearer</dt>
                <dd>Give opening, collection, and location information an obvious home when real details are available.</dd>
              </div>
              <div>
                <dt>Invite the right enquiry</dt>
                <dd>Shape a short, honest path from interest to a useful conversation.</dd>
              </div>
            </dl>
          </div>
          <p className="service-footnote">This local build demonstrates the public-facing experience. It does not claim a management system, ordering backend, or ongoing service arrangement.</p>
        </section>

        <ContactPreview />
      </main>

      <footer>
        <a href="#top">Return to the farm stand ↑</a>
        <p>Working project label · local preview · no orders or submissions</p>
        <p>Produce models: Poly Haven, CC0 · background: project-generated original</p>
      </footer>
    </>
  )
}
