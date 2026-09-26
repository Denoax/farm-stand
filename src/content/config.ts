import businessConfig from '../../starter-content/business-config.example.json'
import demoProducts from '../../starter-content/demo-products.json'

export type HeroProductId = 'apple' | 'onion'

export const business = businessConfig
export const heroDemo = demoProducts as typeof demoProducts & {
  items: Array<(typeof demoProducts.items)[number] & { id: HeroProductId }>
}
