import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { heroDemo, type HeroProductId } from '../content/config'

interface ShopDemoProps {
  selectedProduct: HeroProductId
  onSelect: (product: HeroProductId) => void
  active: boolean
}

export function ShopDemo({ selectedProduct, onSelect, active }: ShopDemoProps) {
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(preference.matches)
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])

  const panel = (
    <div className="stand-transition" aria-label="Farm stand transition" aria-hidden={!active} inert={active ? undefined : true} data-active={active ? 'true' : 'false'}>
      <p className="eyebrow eyebrow--light">{heroDemo.disclosure}</p>
      <h2>The stand becomes a useful shop.</h2>
      <p className="stand-transition__intro">Keep the same produce in view, then move into a catalogue that customers can actually browse.</p>

      <fieldset className="hero-product-selector">
        <legend>Choose the hero product</legend>
        {heroDemo.items.map((item) => (
          <label className="product-choice" data-selected={selectedProduct === item.id} key={item.id}>
            <input
              type="radio"
              name="product"
              value={item.id}
              checked={selectedProduct === item.id}
              onChange={() => onSelect(item.id as HeroProductId)}
            />
            <span className={`product-swatch product-swatch--${item.id}`} aria-hidden="true" />
            <span>
              <strong>{item.name}</strong>
              <small>{item.availability_label}</small>
            </span>
            <span className="choice-mark" aria-hidden="true">↗</span>
          </label>
        ))}
      </fieldset>
      <a className="button button--sun" href="#shop">Browse the demonstration shop <span aria-hidden="true">↓</span></a>
    </div>
  )

  return reducedMotion ? panel : createPortal(panel, document.body)
}
