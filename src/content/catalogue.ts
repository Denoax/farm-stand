const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

export type CategoryId = 'produce' | 'farm-goods' | 'boxes'
export type ProductId = 'apple' | 'onion' | 'carrots' | 'potatoes' | 'squash' | 'eggs' | 'harvest-box'

export interface Product {
  id: ProductId
  category: CategoryId
  name: string
  unit: string
  shortDescription: string
  detail: string
  availability: string
  available: boolean
  samplePriceMinor: number
  image: string
  imagePosition?: string
  alt: string
  boxContents?: string[]
}

export const categories: Array<{ id: 'all' | CategoryId; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'produce', label: 'Produce' },
  { id: 'farm-goods', label: 'Farm goods' },
  { id: 'boxes', label: 'Boxes' },
]

export const products: Product[] = [
  {
    id: 'apple',
    category: 'produce',
    name: 'Orchard apples',
    unit: 'example 1.5 kg bag',
    shortDescription: 'Crisp red apples, presented as an example bag.',
    detail: 'A sample 1.5 kg bag of crisp red apples, with price and collection availability shown together.',
    availability: 'Illustrative availability: at the stand',
    available: true,
    samplePriceMinor: 650,
    image: publicAsset('media/catalogue/apple.avif'),
    alt: 'Red apple on a warm wooden surface',
  },
  {
    id: 'onion',
    category: 'produce',
    name: 'Yellow onions',
    unit: 'example 1 kg bag',
    shortDescription: 'Golden, paper-skinned onions in an example bag.',
    detail: 'A sample 1 kg bag of golden, paper-skinned onions, ready to add to a collection preview.',
    availability: 'Illustrative availability: at the stand',
    available: true,
    samplePriceMinor: 500,
    image: publicAsset('media/catalogue/onion.avif'),
    alt: 'Yellow onion on a warm wooden surface',
  },
  {
    id: 'carrots',
    category: 'produce',
    name: 'Carrot bunches',
    unit: 'example bunch',
    shortDescription: 'Leaf-topped carrots sold as an example bunch.',
    detail: 'One leaf-topped bunch, shown with a sample price and collection availability.',
    availability: 'Illustrative availability: selected collection periods',
    available: true,
    samplePriceMinor: 450,
    image: publicAsset('media/catalogue/carrots.avif'),
    alt: 'Bunches of carrots with leafy tops on a rustic wooden market table',
  },
  {
    id: 'potatoes',
    category: 'produce',
    name: 'Field potatoes',
    unit: 'example 2 kg bag',
    shortDescription: 'Earthy potatoes presented as an example 2 kg bag.',
    detail: 'A sample 2 kg bag, presented with price and collection availability.',
    availability: 'Illustrative availability: at the stand',
    available: true,
    samplePriceMinor: 700,
    image: publicAsset('media/catalogue/potatoes.avif'),
    alt: 'Freshly harvested potatoes piled in a woven basket',
  },
  {
    id: 'squash',
    category: 'produce',
    name: 'Seasonal squash',
    unit: 'example squash',
    shortDescription: 'Orange squash shown as a seasonal, unavailable example.',
    detail: 'A seasonal example that stays visible while marked unavailable.',
    availability: 'Unavailable in this demonstration',
    available: false,
    samplePriceMinor: 550,
    image: publicAsset('media/catalogue/squash.avif'),
    alt: 'Two orange squash on a wooden table against a muted green background',
  },
  {
    id: 'eggs',
    category: 'farm-goods',
    name: 'Dozen eggs',
    unit: 'example dozen',
    shortDescription: 'Mixed-colour eggs presented as an example dozen.',
    detail: 'A sample dozen with a collection price. The wire basket in the photograph is a styling prop and is not included.',
    availability: 'Illustrative availability: selected collection periods',
    available: true,
    samplePriceMinor: 700,
    image: publicAsset('media/catalogue/eggs.avif'),
    alt: 'Mixed-colour eggs in a black wire basket resting on hay',
  },
  {
    id: 'harvest-box',
    category: 'boxes',
    name: 'Mixed harvest box',
    unit: 'example box',
    shortDescription: 'A colourful example box with its pictured contents listed.',
    detail: 'A colourful mixed box with its pictured contents listed below.',
    availability: 'Illustrative availability: Saturday collection',
    available: true,
    samplePriceMinor: 3200,
    image: publicAsset('media/catalogue/produce-box.avif'),
    alt: 'Wooden produce crate filled with peppers, bunching onions, and avocados',
    boxContents: ['Sweet peppers', 'Bunching onions', 'Avocados'],
  },
]

export const productById = new Map(products.map((product) => [product.id, product]))

export function formatSampleCad(minorUnits: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(minorUnits / 100)
}
