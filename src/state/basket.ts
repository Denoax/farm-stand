import { productById, type Product, type ProductId } from '../content/catalogue'

export const basketQuantityBounds = { min: 1, max: 12 }
export const basketStorageKey = 'farm-stand-demo-basket-v2'
export const legacyBasketStorageKey = 'farm-stand-demo-basket-v1'
export type BasketState = Partial<Record<string, number>>

export interface BasketLine {
  lineId: string
  product: Product
  variantId?: string
  variantLabel?: string
  quantity: number
}

export type BasketAction =
  | { type: 'add'; productId: ProductId; variantId?: string }
  | { type: 'set'; lineId: string; quantity: number }
  | { type: 'remove'; lineId: string }
  | { type: 'reset' }

export function basketLineId(productId: ProductId, variantId?: string) {
  return variantId ? `${productId}:${variantId}` : productId
}

export function resolveBasketLine(lineId: string): Omit<BasketLine, 'quantity'> | null {
  const separator = lineId.indexOf(':')
  const productId = (separator === -1 ? lineId : lineId.slice(0, separator)) as ProductId
  const variantId = separator === -1 ? undefined : lineId.slice(separator + 1)
  const product = productById.get(productId)
  if (!product?.available) return null

  const variants = product.variants
  if (!variants?.length) return variantId ? null : { lineId: product.id, product }
  const variant = variants.find((candidate) => candidate.id === variantId)
  return variant ? { lineId: basketLineId(product.id, variant.id), product, variantId: variant.id, variantLabel: variant.label } : null
}

export function basketLines(state: BasketState): BasketLine[] {
  return Object.entries(state).flatMap(([lineId, quantity]) => {
    const line = resolveBasketLine(lineId)
    return line && quantity ? [{ ...line, quantity }] : []
  })
}

export function parseBasketSnapshot(raw: string | null): BasketState {
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    const value = parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'lines' in parsed
      ? (parsed as { lines?: unknown }).lines
      : parsed
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.entries(value).reduce<BasketState>((basket, [lineId, quantity]) => {
      const line = resolveBasketLine(lineId)
      if (line && Number.isInteger(quantity) && Number(quantity) >= basketQuantityBounds.min && Number(quantity) <= basketQuantityBounds.max) {
        basket[line.lineId] = Number(quantity)
      }
      return basket
    }, {})
  } catch {
    return {}
  }
}

export function serializeBasket(state: BasketState) {
  return JSON.stringify({ version: 2, lines: state })
}

export function basketReducer(state: BasketState, action: BasketAction): BasketState {
  if (action.type === 'reset') return {}

  if (action.type === 'remove') {
    if (!resolveBasketLine(action.lineId)) return state
    const next = { ...state }
    delete next[action.lineId]
    return next
  }

  if (action.type === 'set') {
    const line = resolveBasketLine(action.lineId)
    if (!line || !Number.isInteger(action.quantity) || action.quantity < basketQuantityBounds.min || action.quantity > basketQuantityBounds.max) return state
    return { ...state, [line.lineId]: action.quantity }
  }

  const line = resolveBasketLine(basketLineId(action.productId, action.variantId))
  if (!line) return state
  const nextQuantity = Math.min((state[line.lineId] ?? 0) + 1, basketQuantityBounds.max)
  return { ...state, [line.lineId]: nextQuantity }
}

export function basketCount(state: BasketState) {
  return Object.values(state).reduce<number>((total, quantity) => total + (quantity ?? 0), 0)
}

export function basketSubtotal(state: BasketState) {
  return basketLines(state).reduce((total, line) => total + line.product.samplePriceMinor * line.quantity, 0)
}
