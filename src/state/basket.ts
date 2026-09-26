import { productById, type ProductId } from '../content/catalogue'

export const basketQuantityBounds = { min: 1, max: 12 }
export const basketStorageKey = 'farm-stand-demo-basket-v1'
export type BasketState = Partial<Record<ProductId, number>>

export type BasketAction =
  | { type: 'add'; productId: ProductId }
  | { type: 'set'; productId: ProductId; quantity: number }
  | { type: 'remove'; productId: ProductId }
  | { type: 'reset' }

export function parseBasketSnapshot(raw: string | null): BasketState {
  if (!raw) return {}
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.entries(value).reduce<BasketState>((basket, [id, quantity]) => {
      const product = productById.get(id as ProductId)
      if (product?.available && Number.isInteger(quantity) && Number(quantity) >= basketQuantityBounds.min && Number(quantity) <= basketQuantityBounds.max) {
        basket[product.id] = Number(quantity)
      }
      return basket
    }, {})
  } catch {
    return {}
  }
}

export function basketReducer(state: BasketState, action: BasketAction): BasketState {
  if (action.type === 'reset') return {}

  const product = productById.get(action.productId)
  if (!product?.available) return state

  if (action.type === 'remove') {
    const next = { ...state }
    delete next[action.productId]
    return next
  }

  if (action.type === 'add') {
    const nextQuantity = Math.min((state[action.productId] ?? 0) + 1, basketQuantityBounds.max)
    return { ...state, [action.productId]: nextQuantity }
  }

  if (!Number.isInteger(action.quantity) || action.quantity < basketQuantityBounds.min || action.quantity > basketQuantityBounds.max) {
    return state
  }
  return { ...state, [action.productId]: action.quantity }
}

export function basketCount(state: BasketState) {
  return Object.values(state).reduce((total, quantity) => total + (quantity ?? 0), 0)
}

export function basketSubtotal(state: BasketState) {
  return Object.entries(state).reduce((total, [id, quantity]) => {
    const product = productById.get(id as ProductId)
    return total + (product?.samplePriceMinor ?? 0) * (quantity ?? 0)
  }, 0)
}
