import { useEffect, useRef, useState } from 'react'
import { animate, createScope } from 'animejs'
import { demo, type ProductId } from '../content/config'

interface ShopDemoProps {
  selectedProduct: ProductId
  onSelect: (product: ProductId) => void
}

export function ShopDemo({ selectedProduct, onSelect }: ShopDemoProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [quantity, setQuantity] = useState(1)
  const [previewOpen, setPreviewOpen] = useState(false)
  const selected = demo.items.find((item) => item.id === selectedProduct) ?? demo.items[0]

  useEffect(() => {
    if (!previewOpen || !rootRef.current) return
    const scope = createScope({ root: rootRef }).add(() => {
      animate('.pickup-result', {
        opacity: [0, 1],
        y: [10, 0],
        duration: 260,
        ease: 'out(2)',
      })
    })
    return () => scope.revert()
  }, [previewOpen, selectedProduct, quantity])

  return (
    <div className="shop-panel" ref={rootRef} aria-label="Farm shop demonstration">
      <p className="eyebrow eyebrow--light">{demo.disclosure}</p>
      <h2>Make today’s selection easy to find.</h2>
      <p className="shop-intro">Try the kind of clear, useful choice a customer could make on a real farm website.</p>

      <fieldset className="product-selector">
        <legend>Choose an example product</legend>
        {demo.items.map((item) => (
          <label className="product-choice" data-selected={selectedProduct === item.id} key={item.id}>
            <input
              type="radio"
              name="product"
              value={item.id}
              checked={selectedProduct === item.id}
              onChange={() => {
                onSelect(item.id)
                setPreviewOpen(false)
              }}
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

      <div className="pickup-controls">
        <label htmlFor="quantity">Example quantity</label>
        <div className="quantity-row">
          <input
            id="quantity"
            type="number"
            inputMode="numeric"
            min={demo.quantity_bounds.min}
            max={demo.quantity_bounds.max}
            step={demo.quantity_bounds.step}
            value={quantity}
            onChange={(event) => {
              const next = Number(event.target.value)
              setQuantity(Math.min(demo.quantity_bounds.max, Math.max(demo.quantity_bounds.min, next || 1)))
              setPreviewOpen(false)
            }}
          />
          <span>{selected.unit_label}{quantity === 1 ? '' : 's'}</span>
        </div>
        <button className="button button--sun" type="button" onClick={() => setPreviewOpen(true)}>
          {demo.pickup_preview.title}
        </button>
      </div>

      <div className="pickup-result" hidden={!previewOpen} aria-live="polite" data-testid="pickup-result">
        <p className="result-kicker">{demo.pickup_preview.collection_option_label}</p>
        <strong>{quantity} × {selected.unit_label}{quantity === 1 ? '' : 's'} of {selected.name.toLowerCase()}</strong>
        <p>{demo.pickup_preview.confirmation}</p>
      </div>
    </div>
  )
}
