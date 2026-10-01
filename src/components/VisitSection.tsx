import type { CommerceSound } from '../audio/useSoundscape'

interface VisitSectionProps {
  onInterfaceSound: (kind: CommerceSound) => boolean
}

export function VisitSection({ onInterfaceSound }: VisitSectionProps) {
  return (
    <section className="after-section visit" id="visit" aria-labelledby="visit-heading">
      <div className="folded-note">
        <p className="eyebrow">Sample visiting details</p>
        <h2 id="visit-heading">Before you set off.</h2>
        <div className="visit-details">
          <div>
            <h3>At the stand</h3>
            <p>Thursday · 3–6 pm<br />Saturday · 9 am–1 pm</p>
          </div>
          <div>
            <h3>Collection</h3>
            <p>Build a basket, then choose a sample collection period.</p>
            <a href="#shop">Back to the market</a>
          </div>
          <div>
            <h3>Getting here</h3>
            <p>This is a demonstration farm, so there is no visitor address.</p>
          </div>
        </div>
        <p className="sample-boundary">These are sample times, not live opening hours.</p>
        <details onToggle={(event) => onInterfaceSound(event.currentTarget.open ? 'details-open' : 'details-close')}>
          <summary>What a real visiting page would include</summary>
          <p>Directions, parking, step-free access and any gate or arrival instructions—using details confirmed by the business.</p>
        </details>
      </div>
    </section>
  )
}
