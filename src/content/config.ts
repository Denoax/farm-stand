import businessConfig from '../../starter-content/business-config.example.json'
import demoProducts from '../../starter-content/demo-products.json'

export type ProductId = (typeof demoProducts.items)[number]['id']

export const business = businessConfig
export const demo = demoProducts
