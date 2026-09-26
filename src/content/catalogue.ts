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
    detail: 'A bag-sized example with the selling unit, sample price, and availability kept together. Variety and growing details would be added only when supplied by the farm.',
    availability: 'Illustrative availability: at the stand',
    available: true,
    samplePriceMinor: 650,
    image: publicAsset('media/catalogue/apple.avif'),
    alt: 'Red apple rendered on a warm wooden surface',
  },
  {
    id: 'onion',
    category: 'produce',
    name: 'Yellow onions',
    unit: 'example 1 kg bag',
    shortDescription: 'Golden, paper-skinned onions in an example bag.',
    detail: 'A straightforward example listing with the bag size, sample price, and availability visible before it is added to the basket.',
    availability: 'Illustrative availability: at the stand',
    available: true,
    samplePriceMinor: 500,
    image: publicAsset('media/catalogue/onion.avif'),
    alt: 'Yellow onion rendered on a warm wooden surface',
  },
  {
    id: 'carrots',
    category: 'produce',
    name: 'Carrot bunches',
    unit: 'example bunch',
    shortDescription: 'Leaf-topped carrots sold as an example bunch.',
    detail: 'The photograph and selling unit make it clear that this example is one bunch. Variety and harvest notes would be added when verified.',
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
    detail: 'A concise bag-sized listing. Preparation, variety, and growing notes remain unclaimed until a real farm provides them.',
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
    detail: 'This seasonal example remains visible while unavailable, without suggesting that stock can be reserved.',
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
    detail: 'An example dozen with a sample price and collection availability. The wire basket in the photograph is a styling prop and is not included.',
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
    detail: 'The pictured contents are listed below. This demonstration does not imply a subscription, substitutions, or guaranteed stock.',
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
