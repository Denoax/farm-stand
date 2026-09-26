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
  { id: 'all', label: 'Everything' },
  { id: 'produce', label: 'Produce' },
  { id: 'farm-goods', label: 'Eggs & farm goods' },
  { id: 'boxes', label: 'Produce boxes' },
]

export const products: Product[] = [
  {
    id: 'apple',
    category: 'produce',
    name: 'Orchard apples',
    unit: 'example 1.5 kg bag',
    shortDescription: 'A crisp red anchor for the demonstration stand.',
    detail: 'A product page can keep the useful buying unit, a plain description, and availability together without turning the farm story into decoration.',
    availability: 'Illustrative availability: at the stand',
    available: true,
    samplePriceMinor: 650,
    image: publicAsset('media/catalogue/apple.avif'),
    alt: 'Red apple on the sunlit demonstration farm stand',
  },
  {
    id: 'onion',
    category: 'produce',
    name: 'Yellow onions',
    unit: 'example 1 kg bag',
    shortDescription: 'Paper-skinned onions presented with a clear selling unit.',
    detail: 'This example shows how a familiar crop can still receive careful photography, scannable information, and a straightforward path into a basket.',
    availability: 'Illustrative availability: at the stand',
    available: true,
    samplePriceMinor: 500,
    image: publicAsset('media/catalogue/onion.avif'),
    alt: 'Yellow onion on the sunlit demonstration farm stand',
  },
  {
    id: 'carrots',
    category: 'produce',
    name: 'Carrot bunches',
    unit: 'example bunch',
    shortDescription: 'Leaf-topped bunches with the quantity stated up front.',
    detail: 'The photograph and unit work together: visitors see the bunch they are reading about rather than having to guess whether the example means one carrot or a bag.',
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
    shortDescription: 'Earthy potatoes shown as the bag-sized staple they represent.',
    detail: 'A concise detail view gives room for preparation notes or variety information later, while this demonstration avoids unsupported growing or certification claims.',
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
    shortDescription: 'A clear unavailable state without invented stock pressure.',
    detail: 'Unavailable examples stay visible so a real farm could explain a crop or season without pretending that an order can be placed.',
    availability: 'Unavailable in this demonstration',
    available: false,
    samplePriceMinor: 550,
    image: publicAsset('media/catalogue/squash.avif'),
    alt: 'Two orange squash on a wooden table against a muted green background',
  },
  {
    id: 'eggs',
    category: 'farm-goods',
    name: 'Egg basket',
    unit: 'example dozen',
    shortDescription: 'A dozen is explicit; the farm-life story links back here.',
    detail: 'This example connects a farm activity with a practical product record. It does not make husbandry, certification, or farm-origin claims.',
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
    shortDescription: 'The contents are visible and listed before the basket step.',
    detail: 'A produce-box page can state what the pictured example contains and how collection might work without implying a subscription or automatic substitution policy.',
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
