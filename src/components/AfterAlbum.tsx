import type { SyntheticEvent } from 'react'
import type { CommerceSound } from '../audio/useSoundscape'
import { Logo } from './Logo'
import { TryUpdate } from './TryUpdate'
import './AfterAlbum.css'

interface AfterAlbumProps {
  onInterfaceSound: (kind: CommerceSound) => boolean
}

const playDisclosureSound = (
  event: SyntheticEvent<HTMLDetailsElement>,
  onInterfaceSound: AfterAlbumProps['onInterfaceSound'],
) => onInterfaceSound(event.currentTarget.open ? 'details-open' : 'details-close')

export function ServiceSection({ onInterfaceSound }: AfterAlbumProps) {
  return (
    <section className="after-section service" id="website" aria-labelledby="service-heading">
      <div className="service__copy">
        <p className="eyebrow">Your website</p>
        <h2 id="service-heading">Now picture your place.</h2>
        <p className="service__lead">Your products, your opening times, your story. A website shaped around what people need to know about your business.</p>
        <div className="service__proof" aria-label="What this demonstration shows">
          <a href="#shop"><strong>Show what you sell.</strong><span>Clear products, prices and useful details.</span></a>
          <a href="#visit"><strong>Make a visit easier.</strong><span>Keep hours and collection information easy to find.</span></a>
          <a href="#farm-life"><strong>Give people a feel for the place.</strong><span>Photography, small films and a bit of personality.</span></a>
        </div>
        <div className="service__disclosures">
          <details onToggle={(event) => playDisclosureSound(event, onInterfaceSound)}>
            <summary>How a project would work</summary>
            <p>Start with your business and the questions customers ask. Organize the material, design and build the pages, then review the important journeys before launch.</p>
          </details>
          <details onToggle={(event) => playDisclosureSound(event, onInterfaceSound)}>
            <summary>What would be agreed for a real website?</summary>
            <p>The content, scope, price and ongoing support would be agreed first. Payments, booking, stock systems, editing and message delivery are separate choices, not connected services in this demonstration.</p>
          </details>
        </div>
      </div>
      <TryUpdate onInterfaceSound={onInterfaceSound} />
      <a className="button button--ink service__action" href="#contact">Write a website note</a>
    </section>
  )
}

export function SiteFooter({ onInterfaceSound }: AfterAlbumProps) {
  return (
    <footer className="site-footer">
      <div className="site-footer__primary">
        <a className="footer-brand" href="#top" aria-label="Back to the farm stand">
          <Logo />
          <span>Back to the stand ↑</span>
        </a>
        <nav aria-label="Footer navigation">
          <a href="#shop">Market</a>
          <a href="#farm-life">Around the farm</a>
          <a href="#website">Your website</a>
          <a href="#contact">Website note</a>
        </nav>
        <p>Farm Stand website demonstration.</p>
      </div>
      <div className="site-footer__disclosures">
        <details onToggle={(event) => playDisclosureSound(event, onInterfaceSound)}>
          <summary>About this demonstration</summary>
          <p>This is a fictional farm website demonstration. Products, prices, visiting details and collection periods are samples. The project-note fields stay in this page; no order, payment, booking or message is transmitted.</p>
        </details>
        <details onToggle={(event) => playDisclosureSound(event, onInterfaceSound)}>
          <summary>Sources &amp; credits</summary>
          <div className="site-footer__credits">
            <p>Produce and wood models: <a href="https://polyhaven.com/">Poly Haven</a>, <a href="https://polyhaven.com/license">CC0</a>. Product photographs: credited Pexels contributors.</p>
            <p>Orchard photograph: <a href="https://www.pexels.com/photo/trees-in-orchard-17765489/">Mark Stebnicki / Pexels</a>. Farm films: <a href="https://www.pexels.com/video/29229103/">Anurag Gusain</a>, <a href="https://www.pexels.com/video/herd-of-cows-in-a-pastureland-3769204/">Taryn Elliott</a> and <a href="https://www.pexels.com/video/12116085/">Matthias Groeneveld</a> / <a href="https://www.pexels.com/license/">Pexels</a>; clips were resized, trimmed and delivered without source audio.</p>
            <p>Notebook pencil studies: user-supplied <code>SKETCH-PREVIEW.png</code>, reused at the user’s request. The three exact drawing regions were cropped and made transparent without tracing or redrawing; no artist or independent licence is asserted.</p>
            <p>Leaf transitions: <a href="https://www.youtube.com/watch?v=RRyXHZKOYGc">Kajal Karmakar 01</a> and <a href="https://www.youtube.com/watch?v=dAZGvwAzupY">02</a>, user-supplied originals modified into silent alpha WebM derivatives. Transition 03 is not used.</p>
            <p>Bird Orange: user-supplied asset with user-provided clearance; no named public licence is claimed. The camera derivative preserves the supplied rigged model and texture with documented visibility corrections.</p>
            <p>Music: <a href="https://incompetech.com/music/royalty-free/index.html?Search=Search&amp;isrc=USUAN2300003">“Morning” by Kevin MacLeod</a>, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>; transcoded and level-reduced.</p>
            <p>CC0 sound recordings: <a href="https://freesound.org/people/Sadiquecat/sounds/801774/">Sadiquecat</a>, <a href="https://freesound.org/people/LiezelDippenaar/sounds/707545/">LiezelDippenaar</a>, <a href="https://freesound.org/people/musicradiocreative/sounds/197103/">musicradiocreative</a>, <a href="https://freesound.org/people/JarredGibb/sounds/233129/">JarredGibb</a>, <a href="https://freesound.org/people/TheKingOfGeeks360/sounds/787563/">TheKingOfGeeks360</a>, <a href="https://freesound.org/people/TRP/sounds/575223/">TRP</a>, <a href="https://freesound.org/people/se2001/sounds/510314/">se2001</a>, <a href="https://freesound.org/people/clgood/sounds/688618/">clgood</a>, <a href="https://freesound.org/people/OwlStorm/sounds/151220/">OwlStorm</a>, <a href="https://freesound.org/people/MrPugles/sounds/621965/">MrPugles</a> and <a href="https://freesound.org/people/BenjaminNelan/sounds/353125/">BenjaminNelan</a> / Freesound. Public previews were trimmed, filtered, faded, level-adjusted and encoded; the wood-roll recording is adapted as the apple cue and is not an apple field recording.</p>
          </div>
        </details>
      </div>
    </footer>
  )
}
