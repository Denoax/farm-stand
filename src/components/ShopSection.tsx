import { useEffect, useMemo, useRef, useState, type Dispatch } from 'react'
import { categories, formatSampleCad, productById, products, type CategoryId, type Product, type ProductId } from '../content/catalogue'
import { basketCount, basketQuantityBounds, basketSubtotal, type BasketAction, type BasketState } from '../state/basket'
import { DeferredImage } from './DeferredImage'

interface ShopSectionProps {
  basket: BasketState
  dispatch: Dispatch<BasketAction>
  focusRequest?: { productId: ProductId; sequence: number }
}

function QuantityEditor({ product, quantity, dispatch }: { product: Product; quantity: number; dispatch: Dispatch<BasketAction> }) {
  const [draft, setDraft] = useState(String(quantity))
  const [error, setError] = useState('')

  useEffect(() => setDraft(String(quantity)), [quantity])

  const commit = () => {
    const next = Number(draft)
    if (!Number.isInteger(next) || next < basketQuantityBounds.min || next > basketQuantityBounds.max) {
      setError(`Use a whole number from ${basketQuantityBounds.min} to ${basketQuantityBounds.max}.`)
      setDraft(String(quantity))
      return
    }
    dispatch({ type: 'set', productId: product.id, quantity: next })
    setError('')
  }

  return (
    <div className="basket-quantity">
      <label htmlFor={`basket-${product.id}`}>Quantity</label>
      <input
        id={`basket-${product.id}`}
        inputMode="numeric"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commit()
          }
        }}
        aria-describedby={error ? `basket-${product.id}-error` : undefined}
      />
      {error && <span className="field-error" id={`basket-${product.id}-error`} role="alert">{error}</span>}
    </div>
  )
}

function ProductPicture({ product, eager = false }: { product: Product; eager?: boolean }) {
  return (
    <div className="product-picture">
      <DeferredImage
        src={product.image}
        alt={product.alt}
        width={960}
        height={640}
        eager={eager}
        style={{ objectPosition: product.imagePosition }}
        fallbackLabel={`${product.name} image unavailable`}
      />
    </div>
  )
}

function BasketDialog({ basket, dispatch, open, onClose, returnFocus }: ShopSectionProps & { open: boolean; onClose: () => void; returnFocus: React.RefObject<HTMLButtonElement | null> }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [collectionOpen, setCollectionOpen] = useState(false)
  const [collectionPreview, setCollectionPreview] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const lines = Object.entries(basket)
    .map(([id, quantity]) => ({ product: productById.get(id as ProductId), quantity: quantity ?? 0 }))
    .filter((line): line is { product: Product; quantity: number } => Boolean(line.product && line.quantity))

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const close = () => dialogRef.current?.close()

  return (
    <dialog
      className="basket-dialog"
      ref={dialogRef}
      aria-labelledby="basket-heading"
      onClose={() => {
        setCollectionOpen(false)
        setCollectionPreview(false)
        setConfirmReset(false)
        onClose()
        returnFocus.current?.focus()
      }}
    >
      <div className="dialog-bar">
        <div>
          <p className="eyebrow">Demonstration basket</p>
          <h2 id="basket-heading">Review the example collection.</h2>
        </div>
        <button className="icon-button" type="button" onClick={close} aria-label="Close basket">×</button>
      </div>
      <p className="demo-boundary">Demonstration basket — no order or payment will be submitted.</p>

      {lines.length === 0 ? (
        <div className="basket-empty">
          <p>Your demonstration basket is empty.</p>
          <button className="text-button" type="button" onClick={close}>Continue browsing</button>
        </div>
      ) : (
        <>
          <ul className="basket-lines">
            {lines.map(({ product, quantity }) => (
              <li key={product.id}>
                <img src={product.image} alt="" width="120" height="90" loading="lazy" style={{ objectPosition: product.imagePosition }} />
                <div className="basket-line-copy">
                  <strong>{product.name}</strong>
                  <span>{product.unit}</span>
                  <span>{formatSampleCad(product.samplePriceMinor)} sample price × {quantity}</span>
                </div>
                <QuantityEditor product={product} quantity={quantity} dispatch={dispatch} />
                <strong className="line-total">{formatSampleCad(product.samplePriceMinor * quantity)}</strong>
                <button className="text-button text-button--danger" type="button" onClick={() => dispatch({ type: 'remove', productId: product.id })}>Remove</button>
              </li>
            ))}
          </ul>
          <div className="basket-total">
            <span>Illustrative subtotal · CAD</span>
            <strong>{formatSampleCad(basketSubtotal(basket))}</strong>
          </div>

          {!collectionOpen ? (
            <button className="button button--sun" type="button" onClick={() => setCollectionOpen(true)}>Preview collection options</button>
          ) : (
            <div className="collection-preview" data-testid="collection-preview">
              <p className="eyebrow">Example collection choices</p>
              <fieldset>
                <legend>Choose an illustrative period</legend>
                <label><input type="radio" name="collection" defaultChecked /> Weekday stand · example 3–6 pm</label>
                <label><input type="radio" name="collection" /> Saturday pickup · example 9 am–1 pm</label>
              </fieldset>
              <button className="button button--ink" type="button" onClick={() => setCollectionPreview(true)}>Review this example</button>
              {collectionPreview && <p className="collection-result" role="status"><strong>Preview only.</strong> Nothing was sent, and no stock or collection time was reserved.</p>}
            </div>
          )}

          <div className="reset-basket">
            {!confirmReset ? (
              <button className="text-button text-button--danger" type="button" onClick={() => setConfirmReset(true)}>Clear demonstration basket</button>
            ) : (
              <div role="group" aria-label="Confirm clearing the basket">
                <span>Remove every item?</span>
                <button type="button" onClick={() => { dispatch({ type: 'reset' }); setConfirmReset(false) }}>Yes, clear it</button>
                <button type="button" onClick={() => setConfirmReset(false)}>Keep items</button>
              </div>
            )}
          </div>
        </>
      )}
    </dialog>
  )
}

export function ShopSection({ basket, dispatch, focusRequest }: ShopSectionProps) {
  const [filter, setFilter] = useState<'all' | CategoryId>('all')
  const [detailProduct, setDetailProduct] = useState<Product | null>(null)
  const [basketOpen, setBasketOpen] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [basketFeedback, setBasketFeedback] = useState<{ product: Product; message: string; added: boolean } | null>(null)
  const detailDialogRef = useRef<HTMLDialogElement>(null)
  const detailTriggerRef = useRef<HTMLButtonElement | null>(null)
  const basketTriggerRef = useRef<HTMLButtonElement>(null)
  const visibleProducts = useMemo(() => filter === 'all' ? products : products.filter((product) => product.category === filter), [filter])
  const count = basketCount(basket)

  useEffect(() => {
    const dialog = detailDialogRef.current
    if (!dialog || !detailProduct) return
    dialog.showModal()
  }, [detailProduct])

  useEffect(() => {
    if (!focusRequest) return
    const product = productById.get(focusRequest.productId)
    if (!product) return
    setFilter(product.category)
    let secondFrame = 0
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        const card = document.getElementById(`product-${product.id}`)
        card?.scrollIntoView({ block: 'start' })
        card?.focus({ preventScroll: true })
      })
    })
    return () => {
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
    }
  }, [focusRequest])

  const add = (product: Product) => {
    if ((basket[product.id] ?? 0) >= basketQuantityBounds.max) {
      const message = `is already at the demonstration maximum of ${basketQuantityBounds.max}.`
      setAnnouncement(`${product.name} ${message}`)
      setBasketFeedback({ product, message, added: false })
      return
    }
    dispatch({ type: 'add', productId: product.id })
    setAnnouncement(`${product.name} added to the demonstration basket.`)
    setBasketFeedback({ product, message: 'added to the demonstration basket.', added: true })
  }

  return (
    <section className="catalogue" id="shop" aria-labelledby="shop-heading">
      <div className="section-intro catalogue-intro">
        <div>
          <p className="eyebrow">Demonstration shop</p>
          <h2 id="shop-heading">Shop the stand.</h2>
        </div>
        <div className="catalogue-summary">
          <p>Browse seven example products and build a collection preview. Prices and availability are illustrative; nothing can be ordered here.</p>
          <button ref={basketTriggerRef} className="basket-button" type="button" onClick={() => setBasketOpen(true)}>
            Basket <span aria-label={`${count} items`}>{count}</span>
          </button>
        </div>
      </div>

      <div className="catalogue-toolbar" aria-label="Filter demonstration products">
        {categories.map((category) => (
          <button key={category.id} type="button" aria-pressed={filter === category.id} onClick={() => setFilter(category.id)}>{category.label}</button>
        ))}
      </div>

      <div className="product-grid">
        {visibleProducts.map((product) => (
          <article className="product-card" id={`product-${product.id}`} key={product.id} data-available={product.available} tabIndex={-1}>
            <ProductPicture product={product} />
            <div className="product-card__body">
              <div className="product-card__heading">
                <div>
                  <p className="product-unit">{product.unit}</p>
                  <h3>{product.name}</h3>
                </div>
                <strong>{formatSampleCad(product.samplePriceMinor)} <small>CAD sample</small></strong>
              </div>
              <p>{product.shortDescription}</p>
              <span className="availability" data-available={product.available}>{product.availability}</span>
              {product.boxContents && <p className="box-contents"><strong>Shown in this box:</strong> {product.boxContents.join(', ')}.</p>}
              <div className="product-actions">
                <button
                  className="text-button"
                  type="button"
                  onClick={(event) => {
                    detailTriggerRef.current = event.currentTarget
                    setDetailProduct(product)
                  }}
                >View details</button>
                <button className="button button--ink" type="button" disabled={!product.available} onClick={() => add(product)}>
                  {product.available ? 'Add to basket' : 'Unavailable example'}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <p className="visually-hidden" aria-live="polite">{announcement}</p>

      {basketFeedback && !basketOpen && (
        <div className="basket-feedback" aria-label="Basket update">
          <p><strong>{basketFeedback.product.name}</strong> {basketFeedback.message}</p>
          <div>
            <button className="text-button" type="button" onClick={() => { setBasketOpen(true); setBasketFeedback(null) }}>View basket</button>
            <button className="icon-button" type="button" aria-label="Dismiss basket update" onClick={() => setBasketFeedback(null)}>×</button>
          </div>
        </div>
      )}

      <dialog
        className="product-dialog"
        ref={detailDialogRef}
        aria-labelledby={detailProduct ? `detail-${detailProduct.id}` : undefined}
        onClose={() => {
          setDetailProduct(null)
          detailTriggerRef.current?.focus()
        }}
      >
        {detailProduct && (
          <>
            <button className="icon-button dialog-close" type="button" onClick={() => detailDialogRef.current?.close()} aria-label="Close product details">×</button>
            <ProductPicture product={detailProduct} eager />
            <div className="product-dialog__copy">
              <p className="eyebrow">{detailProduct.unit}</p>
              <h2 id={`detail-${detailProduct.id}`}>{detailProduct.name}</h2>
              <p>{detailProduct.detail}</p>
              <p><strong>{detailProduct.availability}</strong></p>
              {detailProduct.boxContents && <p><strong>Shown in this box:</strong> {detailProduct.boxContents.join(', ')}.</p>}
              {basketFeedback?.product.id === detailProduct.id && (
                <p className="product-add-note" role="status">
                  {basketFeedback.added ? 'Added to the demonstration basket. Nothing has been ordered.' : `Already at the demonstration maximum of ${basketQuantityBounds.max}.`}
                </p>
              )}
              <div className="product-dialog__footer">
                <span>{formatSampleCad(detailProduct.samplePriceMinor)} CAD · illustrative sample price</span>
                <div className="product-dialog__actions">
                  {basketFeedback?.product.id === detailProduct.id && (
                    <button className="text-button" type="button" onClick={() => { detailDialogRef.current?.close(); setBasketOpen(true); setBasketFeedback(null) }}>Review basket</button>
                  )}
                  <button className="button button--sun" type="button" disabled={!detailProduct.available} onClick={() => add(detailProduct)}>
                    {detailProduct.available ? 'Add to basket' : 'Unavailable in this demonstration'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </dialog>

      <BasketDialog basket={basket} dispatch={dispatch} open={basketOpen} onClose={() => setBasketOpen(false)} returnFocus={basketTriggerRef} />
    </section>
  )
}
