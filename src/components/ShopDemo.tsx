import { heroDemo, type HeroProductId } from '../content/config'

interface ShopDemoProps {
  selectedProduct: HeroProductId
  onSelect: (product: HeroProductId) => void
}

export function ShopDemo({ selectedProduct, onSelect }: ShopDemoProps) {
  return (
    <div className="stand-transition" aria-label="Farm stand transition">
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
}
