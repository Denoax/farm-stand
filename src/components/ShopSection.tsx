import { useEffect, useMemo, useRef, useState, type Dispatch } from 'react'
import { categories, departmentCounts, formatSampleCad, productById, products, type BrowseFilter, type ProduceGroup, type Product, type ProductId } from '../content/catalogue'
import { basketCount, basketLineId, basketLines, basketQuantityBounds, basketSubtotal, type BasketAction, type BasketState } from '../state/basket'
import { DeferredImage } from './DeferredImage'
import { BasketDialog } from './BasketDialog'
import type { CommerceSound } from '../audio/useSoundscape'

interface ShopSectionProps {
  basket: BasketState
  dispatch: Dispatch<BasketAction>
  focusRequest?: { productId: ProductId; sequence: number }
  marketReady: boolean
  onCommerceSound: (kind: CommerceSound) => boolean
}

function ProductPicture({ product, eager = false }: { product: Product; eager?: boolean }) {
  return (
    <div className="product-picture">
      <DeferredImage src={product.image} alt={product.alt} width={960} height={640} eager={eager} style={{ objectPosition: product.imagePosition }} fallbackLabel={`${product.name} image unavailable`} />
    </div>
  )
}

function VariantSelect({ product, value, onChange, suffix }: { product: Product; value?: string; onChange: (value: string) => void; suffix: string }) {
  if (!product.variants?.length) return null
  return (
    <label className="variant-select" htmlFor={`variant-${product.id}-${suffix}`}>
      Size
      <select id={`variant-${product.id}-${suffix}`} value={value} onChange={(event) => onChange(event.target.value)}>
        {product.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}</option>)}
      </select>
    </label>
  )
}

export function ShopSection({ basket, dispatch, focusRequest, marketReady, onCommerceSound }: ShopSectionProps) {
  const [filter, setFilter] = useState<BrowseFilter>('featured')
  const [produceGroup, setProduceGroup] = useState<'all' | ProduceGroup>('all')
  const [query, setQuery] = useState('')
  const [detailProduct, setDetailProduct] = useState<Product | null>(null)
  const [detailVariant, setDetailVariant] = useState<string>()
  const [cardVariants, setCardVariants] = useState<Record<string, string>>({ 'farm-tee': 'm' })
  const [basketOpen, setBasketOpen] = useState(false)
  const [basketPreviewOpen, setBasketPreviewOpen] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [basketFeedback, setBasketFeedback] = useState<{ product: Product; variantLabel?: string; message: string } | null>(null)
  const detailDialogRef = useRef<HTMLDialogElement>(null)
  const detailTriggerRef = useRef<HTMLButtonElement | null>(null)
  const basketTriggerRef = useRef<HTMLButtonElement>(null)
  const basketPreviewRef = useRef<HTMLDivElement>(null)
  const handledFocusRequestRef = useRef(0)

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return products.filter((product) => {
      if (filter === 'featured' && !product.featured) return false
      if (filter !== 'featured' && filter !== 'all' && product.department !== filter) return false
      if (filter === 'fruit-and-veg' && produceGroup !== 'all' && product.group !== produceGroup) return false
      if (normalizedQuery && !`${product.name} ${product.shortDescription} ${product.unit}`.toLocaleLowerCase().includes(normalizedQuery)) return false
      return true
    })
  }, [filter, produceGroup, query])
  const previewLines = basketLines(basket)

  useEffect(() => {
    if (!detailProduct) return
    const dialog = detailDialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [detailProduct])

  useEffect(() => {
    if (!basketFeedback || detailProduct) return
    const timeout = window.setTimeout(() => setBasketFeedback(null), 6000)
    return () => window.clearTimeout(timeout)
  }, [basketFeedback, detailProduct])

  useEffect(() => {
    if (marketReady) return
    setBasketPreviewOpen(false)
  }, [marketReady])

  useEffect(() => {
    if (!basketPreviewOpen) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!basketPreviewRef.current?.contains(target) && !basketTriggerRef.current?.contains(target)) {
        setBasketPreviewOpen(false)
        onCommerceSound('basket-close')
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setBasketPreviewOpen(false)
      onCommerceSound('basket-close')
      basketTriggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [basketPreviewOpen, onCommerceSound])

  useEffect(() => {
    if (!focusRequest || handledFocusRequestRef.current === focusRequest.sequence) return
    const product = productById.get(focusRequest.productId)
    if (!product) return
    if (filter !== product.department || query || produceGroup !== 'all') {
      setFilter(product.department)
      setQuery('')
      setProduceGroup('all')
      return
    }
    requestAnimationFrame(() => {
      const card = document.getElementById(`product-${product.id}`)
      card?.scrollIntoView({ block: 'start' })
      card?.focus({ preventScroll: true })
      handledFocusRequestRef.current = focusRequest.sequence
    })
  }, [filter, focusRequest, produceGroup, query])

  useEffect(() => {
    const hash = decodeURIComponent(location.hash.slice(1))
    if (!hash.startsWith('product-')) return
    const product = productById.get(hash.slice(8) as ProductId)
    if (!product) return
    setFilter(product.department)
    setQuery('')
    setProduceGroup('all')
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => {
      const card = document.getElementById(`product-${product.id}`)
      card?.scrollIntoView({ block: 'start' })
      card?.focus({ preventScroll: true })
    }))
    return () => cancelAnimationFrame(frame)
  }, [])

  const selectFilter = (next: BrowseFilter) => {
    if (next === filter && produceGroup === 'all') return
    setFilter(next)
    setProduceGroup('all')
    onCommerceSound('filter')
  }

  const selectProduceGroup = (next: 'all' | ProduceGroup) => {
    if (next === produceGroup) return
    setProduceGroup(next)
    onCommerceSound('filter')
  }

  const selectedVariant = (product: Product, preferred?: string) => preferred ?? cardVariants[product.id] ?? product.variants?.[0]?.id

  const add = (product: Product, preferredVariant?: string) => {
    const variantId = selectedVariant(product, preferredVariant)
    const lineId = basketLineId(product.id as ProductId, variantId)
    const variantLabel = product.variants?.find((variant) => variant.id === variantId)?.label
    if ((basket[lineId] ?? 0) >= basketQuantityBounds.max) {
      const message = `is already at the demonstration maximum of ${basketQuantityBounds.max}.`
      setAnnouncement(`${product.name} ${variantLabel ? `${variantLabel} ` : ''}${message}`)
      setBasketFeedback({ product, variantLabel, message })
      return
    }
    dispatch({ type: 'add', productId: product.id as ProductId, variantId })
    onCommerceSound('add')
    const message = 'added to the demonstration basket.'
    setAnnouncement(`${product.name}${variantLabel ? `, ${variantLabel}` : ''} ${message}`)
    setBasketFeedback({ product, variantLabel, message })
  }

  const openDetails = (product: Product, trigger: HTMLButtonElement) => {
    detailTriggerRef.current = trigger
    setDetailVariant(selectedVariant(product))
    setDetailProduct(product)
    setBasketPreviewOpen(false)
    onCommerceSound('details-open')
  }

  const closeDetails = () => detailDialogRef.current?.close()
  const clearBrowse = () => {
    if (filter === 'featured' && produceGroup === 'all' && !query) return
    setFilter('featured')
    setProduceGroup('all')
    setQuery('')
    onCommerceSound('filter')
  }
  const toggleBasketPreview = () => {
    setBasketFeedback(null)
    setBasketPreviewOpen(!basketPreviewOpen)
    onCommerceSound(basketPreviewOpen ? 'basket-close' : 'basket-open')
  }
  const closeBasketPreview = () => {
    if (!basketPreviewOpen) return
    setBasketPreviewOpen(false)
    onCommerceSound('basket-close')
    basketTriggerRef.current?.focus()
  }
  const openFullBasket = () => {
    setBasketPreviewOpen(false)
    setBasketOpen(true)
    setBasketFeedback(null)
    onCommerceSound('basket-open')
  }

  return (
    <section className="catalogue" id="shop" tabIndex={-1} aria-labelledby="shop-heading">
      <div className="market-notebook">
        <svg className="market-notebook__binding" aria-hidden="true" width="52" height="100%">
          <defs>
            <linearGradient id="notebook-metal" x1="0" x2="1">
              <stop offset="0" stopColor="#555b57" />
              <stop offset=".28" stopColor="#e4e5de" />
              <stop offset=".56" stopColor="#8f9691" />
              <stop offset=".78" stopColor="#f4f2e9" />
              <stop offset="1" stopColor="#5d625e" />
            </linearGradient>
            <pattern id="notebook-loop-pattern" width="52" height="88" patternUnits="userSpaceOnUse">
              <ellipse cx="39" cy="21" rx="4.6" ry="3.1" fill="#665f50" opacity=".62" />
              <ellipse cx="39" cy="39" rx="4.6" ry="3.1" fill="#665f50" opacity=".62" />
              <ellipse cx="39" cy="55" rx="4.6" ry="3.1" fill="#665f50" opacity=".62" />
              <ellipse cx="39" cy="73" rx="4.6" ry="3.1" fill="#665f50" opacity=".62" />
              <path d="M40 21C9 20 8 40 40 39M40 55C9 54 8 74 40 73" fill="none" stroke="#3e423f" strokeWidth="5.6" strokeLinecap="round" opacity=".42" transform="translate(1 1.6)" />
              <path d="M40 21C9 20 8 40 40 39M40 55C9 54 8 74 40 73" fill="none" stroke="url(#notebook-metal)" strokeWidth="3.2" strokeLinecap="round" />
              <path d="M39 20.6C13 20 12 37 39 38.6M39 54.6C13 54 12 71 39 72.6" fill="none" stroke="rgb(255 255 255 / .62)" strokeWidth=".72" strokeLinecap="round" />
            </pattern>
          </defs>
          <rect width="52" height="100%" fill="url(#notebook-loop-pattern)" />
        </svg>
        <div className="market-notebook__paper">
      <div className="section-intro catalogue-intro">
        <h2 id="shop-heading">Shop the stand.</h2>
        <div className="market-doodles" aria-hidden="true">
          <img src="./media/doodles/pencil-cow-front.png" alt="" />
          <img src="./media/doodles/pencil-cow-profile.png" alt="" />
          <img src="./media/doodles/pencil-livestock-head-study.png" alt="" />
        </div>
      </div>

      <div className="market-browser">
        <label className="market-search" htmlFor="market-search"><span>Search the market</span><input id="market-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try apples, eggs, or apron" /></label>
        <div className="catalogue-toolbar" aria-label="Browse market departments">
          {categories.map((category) => {
            const count = category.id === 'featured' ? products.filter((product) => product.featured).length : category.id === 'all' ? products.length : departmentCounts[category.id]
            return <button key={category.id} type="button" aria-pressed={filter === category.id} onClick={() => selectFilter(category.id)}><span>{category.label}</span><small>{count}</small></button>
          })}
        </div>
        {filter === 'fruit-and-veg' && <div className="produce-groups" aria-label="Filter fruit and vegetables"><button type="button" aria-pressed={produceGroup === 'all'} onClick={() => selectProduceGroup('all')}>All 28</button><button type="button" aria-pressed={produceGroup === 'fruit'} onClick={() => selectProduceGroup('fruit')}>Fruit 16</button><button type="button" aria-pressed={produceGroup === 'vegetable'} onClick={() => selectProduceGroup('vegetable')}>Vegetables 12</button></div>}
        <div className="market-results"><p role="status"><strong>{visibleProducts.length}</strong> {visibleProducts.length === 1 ? 'item' : 'items'} shown</p>{(filter !== 'featured' || produceGroup !== 'all' || query) && <button className="text-button" type="button" onClick={clearBrowse}>Clear and show market picks</button>}</div>
      </div>

      {visibleProducts.length ? <div className="product-grid">
        {visibleProducts.map((product, index) => {
          const variant = selectedVariant(product)
          return (
            <article className={`product-card${product.id === 'harvest-box' ? ' product-card--feature' : ''}`} id={`product-${product.id}`} key={product.id} data-available={product.available} tabIndex={-1}>
              <ProductPicture product={product} eager={index < 4} />
              <div className="product-card__body">
                <div className="product-card__heading"><div><p className="product-unit">{product.unit}</p><h3>{product.name}</h3></div><strong>{formatSampleCad(product.samplePriceMinor)} <small>CAD sample</small></strong></div>
                <p>{product.shortDescription}</p><span className="availability" data-available={product.available}>{product.availability}</span>
                {product.boxContents && <p className="box-contents"><strong>Shown in this box:</strong> {product.boxContents.join(', ')}.</p>}
                <VariantSelect product={product} value={variant} onChange={(value) => { setCardVariants((current) => ({ ...current, [product.id]: value })); onCommerceSound('filter') }} suffix="card" />
                <div className="product-actions"><button className="text-button" type="button" onClick={(event) => openDetails(product, event.currentTarget)}>View details</button><button className="button button--ink" type="button" disabled={!product.available} onClick={() => add(product, variant)}>{product.available ? 'Add to basket' : 'Unavailable example'}</button></div>
              </div>
            </article>
          )
        })}
      </div> : <div className="market-empty" role="status"><h3>No market items match.</h3><p>Try a shorter search or reset the browse controls.</p><button className="button button--ink" type="button" onClick={clearBrowse}>Show market picks</button></div>}
        </div>
        <span className="market-notebook__wood-tab market-notebook__wood-tab--left" aria-hidden="true" />
        <span className="market-notebook__wood-tab market-notebook__wood-tab--right" aria-hidden="true" />
      </div>

      <button
        ref={basketTriggerRef}
        className="floating-basket"
        type="button"
        hidden={!marketReady}
        aria-label={`Open basket preview, ${basketCount(basket)} items`}
        aria-expanded={basketPreviewOpen}
        aria-controls="mini-basket"
        onClick={toggleBasketPreview}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" width="23" height="23"><path d="M5.2 9.2h13.6l-1 10H6.2l-1-10Zm3.1 0 3.7-5 3.7 5M8.8 13v3.4m3.2-3.4v3.4m3.2-3.4v3.4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <strong aria-hidden="true">{basketCount(basket)}</strong>
      </button>

      {marketReady && basketPreviewOpen && (
        <div className="mini-basket" id="mini-basket" ref={basketPreviewRef} role="dialog" aria-modal="false" aria-labelledby="mini-basket-heading">
          <div className="mini-basket__header"><div><p className="eyebrow">Demonstration basket</p><h2 id="mini-basket-heading">At a glance</h2></div><button className="icon-button" type="button" aria-label="Close basket preview" onClick={closeBasketPreview}>×</button></div>
          {previewLines.length ? (
            <>
              <ul className="mini-basket__lines">
                {previewLines.slice(0, 3).map((line) => <li key={line.lineId}><span className="mini-basket__media" aria-hidden="true"><DeferredImage src={line.product.image} alt="" width={72} height={54} eager fallbackLabel={`${line.product.name} image unavailable`} /></span><span><strong>{line.product.name}</strong>{line.variantLabel && <small>{line.variantLabel}</small>}<small>{line.quantity} × {formatSampleCad(line.product.samplePriceMinor)}</small></span><b>{formatSampleCad(line.product.samplePriceMinor * line.quantity)}</b></li>)}
              </ul>
              {previewLines.length > 3 && <p className="mini-basket__more">Plus {previewLines.length - 3} more {previewLines.length - 3 === 1 ? 'line' : 'lines'}.</p>}
            </>
          ) : <p className="mini-basket__empty">Your demonstration basket is empty. Browse the market to add an item.</p>}
          <div className="mini-basket__footer"><span>Illustrative subtotal · CAD</span><strong>{formatSampleCad(basketSubtotal(basket))}</strong></div>
          <button className="button button--ink" type="button" onClick={openFullBasket}>View full basket</button>
        </div>
      )}

      <p className="visually-hidden" aria-live="polite">{announcement}</p>
      {basketFeedback && !basketOpen && !basketPreviewOpen && !detailProduct && <div className="basket-feedback" aria-label="Basket update"><p><strong>{basketFeedback.product.name}{basketFeedback.variantLabel ? ` · ${basketFeedback.variantLabel}` : ''}</strong> {basketFeedback.message}</p><div><button className="text-button" type="button" onClick={openFullBasket}>View basket</button><button className="icon-button" type="button" aria-label="Dismiss basket update" onClick={() => setBasketFeedback(null)}>×</button></div></div>}

      <dialog className="product-dialog" ref={detailDialogRef} aria-labelledby={detailProduct ? `detail-${detailProduct.id}` : undefined} onClose={() => { if (detailProduct) onCommerceSound('details-close'); setDetailProduct(null); detailTriggerRef.current?.focus() }}>
        {detailProduct && <><button className="icon-button dialog-close" type="button" onClick={closeDetails} aria-label="Close product details">×</button><ProductPicture product={detailProduct} eager /><div className="product-dialog__copy"><p className="eyebrow">{detailProduct.unit}</p><h2 id={`detail-${detailProduct.id}`}>{detailProduct.name}</h2><p>{detailProduct.detail}</p><p><strong>{detailProduct.availability}</strong></p>{detailProduct.boxContents && <p><strong>Shown in this box:</strong> {detailProduct.boxContents.join(', ')}.</p>}<VariantSelect product={detailProduct} value={detailVariant} onChange={(value) => { setDetailVariant(value); onCommerceSound('filter') }} suffix="detail" />{basketFeedback?.product.id === detailProduct.id && <p className="product-add-note" role="status"><strong>{basketFeedback.variantLabel ? `${basketFeedback.variantLabel}: ` : ''}</strong>{basketFeedback.message}</p>}<div className="product-dialog__footer"><span>{formatSampleCad(detailProduct.samplePriceMinor)} CAD · illustrative sample price</span><div className="product-dialog__actions"><button className="button button--ink" type="button" disabled={!detailProduct.available} onClick={() => add(detailProduct, detailVariant)}>{detailProduct.available ? 'Add to demonstration basket' : 'Unavailable example'}</button></div></div></div></>}
      </dialog>

      <BasketDialog basket={basket} dispatch={dispatch} open={basketOpen} onClose={() => { setBasketOpen(false); onCommerceSound('basket-close') }} onSound={onCommerceSound} returnFocus={basketTriggerRef} />
    </section>
  )
}
