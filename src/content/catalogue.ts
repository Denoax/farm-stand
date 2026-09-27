const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

export type DepartmentId = 'fruit-and-veg' | 'butcher' | 'eggs-and-dairy' | 'pantry' | 'boxes' | 'farm-goods'
export type ProduceGroup = 'fruit' | 'vegetable'
export type BrowseFilter = 'featured' | 'all' | DepartmentId
export type CategoryId = DepartmentId

export interface ProductVariant {
  id: string
  label: string
}

export interface Product {
  id: string
  department: DepartmentId
  group?: ProduceGroup
  featured?: boolean
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
  variants?: readonly ProductVariant[]
}

export const categories: Array<{ id: BrowseFilter; label: string }> = [
  { id: 'featured', label: 'Market picks' },
  { id: 'all', label: 'All 48' },
  { id: 'fruit-and-veg', label: 'Fruit & veg' },
  { id: 'butcher', label: 'Butcher' },
  { id: 'eggs-and-dairy', label: 'Eggs & dairy' },
  { id: 'pantry', label: 'Pantry' },
  { id: 'boxes', label: 'Boxes' },
  { id: 'farm-goods', label: 'Farm goods' },
]

const cataloguePhoto = (id: string) => publicAsset(`media/catalogue-expanded/${id}.avif`)
const retainedPhoto = (id: string) => publicAsset(`media/catalogue/${id}.avif`)

type ProductInput = Omit<Product, 'detail' | 'availability' | 'available'> & Partial<Pick<Product, 'detail' | 'availability' | 'available'>>

function makeProduct(input: ProductInput): Product {
  return {
    ...input,
    detail: input.detail ?? `${input.shortDescription} This product and price are part of the Farm Stand demonstration catalogue.`,
    availability: input.availability ?? 'Illustrative availability: at the stand',
    available: input.available ?? true,
  }
}

export const products = [
  makeProduct({ id: 'apple', department: 'fruit-and-veg', group: 'fruit', featured: true, name: 'Orchard apples', unit: 'example 1.5 kg bag', shortDescription: 'Crisp red orchard apples.', samplePriceMinor: 650, image: cataloguePhoto('apple'), alt: 'Red apples hanging from an orchard branch' }),
  makeProduct({ id: 'green-apples', department: 'fruit-and-veg', group: 'fruit', name: 'Green apples', unit: 'example 1.5 kg bag', shortDescription: 'Tart green apples with a clean snap.', samplePriceMinor: 600, image: cataloguePhoto('green-apples'), alt: 'Green apples grouped together outdoors' }),
  makeProduct({ id: 'pears', department: 'fruit-and-veg', group: 'fruit', featured: true, name: 'Bartlett pears', unit: 'example 1 kg bag', shortDescription: 'Tender green pears for eating or preserving.', samplePriceMinor: 700, image: cataloguePhoto('pears'), alt: 'Fresh green pears arranged on a market surface' }),
  makeProduct({ id: 'peaches', department: 'fruit-and-veg', group: 'fruit', name: 'Tree-ripened peaches', unit: 'example 1 kg basket', shortDescription: 'Soft-blushed peaches picked for eating.', samplePriceMinor: 850, image: cataloguePhoto('peaches'), alt: 'Ripe peaches in warm natural light' }),
  makeProduct({ id: 'nectarines', department: 'fruit-and-veg', group: 'fruit', name: 'Nectarines', unit: 'example 1 kg basket', shortDescription: 'Smooth-skinned, fragrant stone fruit.', samplePriceMinor: 850, image: cataloguePhoto('nectarines'), alt: 'Red and yellow nectarines piled together' }),
  makeProduct({ id: 'plums', department: 'fruit-and-veg', group: 'fruit', name: 'Purple plums', unit: 'example 1 kg basket', shortDescription: 'Deep purple plums with a sweet-tart finish.', samplePriceMinor: 700, image: cataloguePhoto('plums'), alt: 'Purple plums with their natural bloom visible' }),
  makeProduct({ id: 'apricots', department: 'fruit-and-veg', group: 'fruit', name: 'Apricots', unit: 'example 750 g basket', shortDescription: 'Small golden apricots for snacking or jam.', samplePriceMinor: 750, image: cataloguePhoto('apricots'), alt: 'Golden apricots in a rustic bowl' }),
  makeProduct({ id: 'cherries', department: 'fruit-and-veg', group: 'fruit', featured: true, name: 'Sweet cherries', unit: 'example 750 g basket', shortDescription: 'Dark, glossy cherries with stems attached.', samplePriceMinor: 1100, image: cataloguePhoto('cherries'), alt: 'Fresh dark red cherries with green stems' }),
  makeProduct({ id: 'strawberries', department: 'fruit-and-veg', group: 'fruit', featured: true, name: 'Strawberries', unit: 'example 1 L basket', shortDescription: 'Fragrant red berries packed for the stand.', samplePriceMinor: 750, image: cataloguePhoto('strawberries'), alt: 'Fresh strawberries in a wooden container' }),
  makeProduct({ id: 'blueberries', department: 'fruit-and-veg', group: 'fruit', name: 'Blueberries', unit: 'example 500 mL basket', shortDescription: 'Firm blueberries for breakfast or baking.', samplePriceMinor: 650, image: cataloguePhoto('blueberries'), alt: 'Ripe blueberries filling a small bowl' }),
  makeProduct({ id: 'raspberries', department: 'fruit-and-veg', group: 'fruit', name: 'Raspberries', unit: 'example 500 mL basket', shortDescription: 'Delicate red raspberries picked into a small basket.', samplePriceMinor: 700, image: cataloguePhoto('raspberries'), alt: 'Red raspberries closely arranged together' }),
  makeProduct({ id: 'blackberries', department: 'fruit-and-veg', group: 'fruit', name: 'Blackberries', unit: 'example 500 mL basket', shortDescription: 'Juicy blackberries with a deep bramble flavour.', samplePriceMinor: 700, image: cataloguePhoto('blackberries'), alt: 'Dark ripe blackberries in a container' }),
  makeProduct({ id: 'table-grapes', department: 'fruit-and-veg', group: 'fruit', name: 'Table grapes', unit: 'example 1 kg bag', shortDescription: 'Seedless grapes in a loose market bunch.', samplePriceMinor: 600, image: cataloguePhoto('table-grapes'), alt: 'A fresh bunch of pale green table grapes' }),
  makeProduct({ id: 'cantaloupe', department: 'fruit-and-veg', group: 'fruit', name: 'Cantaloupe', unit: 'example melon', shortDescription: 'A netted-rind melon selected for ripeness.', samplePriceMinor: 550, image: cataloguePhoto('cantaloupe'), alt: 'Whole and cut cantaloupe showing orange flesh' }),
  makeProduct({ id: 'watermelon', department: 'fruit-and-veg', group: 'fruit', name: 'Watermelon', unit: 'example melon', shortDescription: 'A full watermelon for sharing.', samplePriceMinor: 900, image: cataloguePhoto('watermelon'), alt: 'Whole and sliced watermelon showing red flesh' }),
  makeProduct({ id: 'currants', department: 'fruit-and-veg', group: 'fruit', name: 'Red currants', unit: 'example 500 mL basket', shortDescription: 'Bright, tart currants for preserves and desserts.', samplePriceMinor: 750, image: cataloguePhoto('currants'), alt: 'Translucent red currants on their stems' }),

  makeProduct({ id: 'onion', department: 'fruit-and-veg', group: 'vegetable', featured: true, name: 'Yellow onions', unit: 'example 1 kg bag', shortDescription: 'Golden, paper-skinned storage onions.', samplePriceMinor: 500, image: cataloguePhoto('onion'), alt: 'Whole yellow onions with papery skins' }),
  makeProduct({ id: 'red-onions', department: 'fruit-and-veg', group: 'vegetable', name: 'Red onions', unit: 'example 1 kg bag', shortDescription: 'Purple-skinned onions with crisp white centres.', samplePriceMinor: 550, image: cataloguePhoto('red-onions'), alt: 'Whole and halved red onions' }),
  makeProduct({ id: 'carrots', department: 'fruit-and-veg', group: 'vegetable', featured: true, name: 'Carrot bunches', unit: 'example bunch', shortDescription: 'Leaf-topped carrots sold as a bunch.', samplePriceMinor: 450, image: retainedPhoto('carrots'), alt: 'Bunches of carrots with leafy tops on a rustic wooden market table' }),
  makeProduct({ id: 'potatoes', department: 'fruit-and-veg', group: 'vegetable', name: 'Field potatoes', unit: 'example 2 kg bag', shortDescription: 'Earthy potatoes packed as a family-size bag.', samplePriceMinor: 700, image: retainedPhoto('potatoes'), alt: 'Freshly harvested potatoes piled in a woven basket' }),
  makeProduct({ id: 'tomatoes', department: 'fruit-and-veg', group: 'vegetable', featured: true, name: 'Vine tomatoes', unit: 'example 1 kg basket', shortDescription: 'Red tomatoes with the vine still attached.', samplePriceMinor: 600, image: cataloguePhoto('tomatoes'), alt: 'Ripe red tomatoes attached to green vines' }),
  makeProduct({ id: 'cucumber', department: 'fruit-and-veg', group: 'vegetable', name: 'Field cucumber', unit: 'example cucumber', shortDescription: 'A long, crisp cucumber for salads and pickling.', samplePriceMinor: 250, image: cataloguePhoto('cucumber'), alt: 'Fresh green cucumbers on a market surface' }),
  makeProduct({ id: 'zucchini', department: 'fruit-and-veg', group: 'vegetable', name: 'Green zucchini', unit: 'example 1 kg bundle', shortDescription: 'Tender green summer squash.', samplePriceMinor: 450, image: cataloguePhoto('zucchini'), alt: 'Fresh dark green zucchini grouped together' }),
  makeProduct({ id: 'sweet-corn', department: 'fruit-and-veg', group: 'vegetable', name: 'Sweet corn', unit: 'example half-dozen', shortDescription: 'Six cobs with their green husks intact.', samplePriceMinor: 350, image: cataloguePhoto('sweet-corn'), alt: 'Fresh sweet corn with green husks partly opened' }),
  makeProduct({ id: 'beetroot', department: 'fruit-and-veg', group: 'vegetable', name: 'Beet bunches', unit: 'example bunch', shortDescription: 'Ruby beets with leafy tops attached.', samplePriceMinor: 450, image: cataloguePhoto('beetroot'), alt: 'Fresh beetroot with long leafy stems' }),
  makeProduct({ id: 'broccoli', department: 'fruit-and-veg', group: 'vegetable', name: 'Broccoli crowns', unit: 'example pair', shortDescription: 'Two tightly headed green broccoli crowns.', samplePriceMinor: 400, image: cataloguePhoto('broccoli'), alt: 'Green broccoli crowns on a wooden surface' }),
  makeProduct({ id: 'sweet-peppers', department: 'fruit-and-veg', group: 'vegetable', name: 'Sweet peppers', unit: 'example four-pack', shortDescription: 'A mixed group of crisp sweet peppers.', samplePriceMinor: 650, image: cataloguePhoto('sweet-peppers'), alt: 'Red, yellow, and green sweet peppers' }),
  makeProduct({ id: 'squash', department: 'fruit-and-veg', group: 'vegetable', name: 'Seasonal squash', unit: 'example squash', shortDescription: 'Orange winter squash shown as a seasonal example.', detail: 'A seasonal example that remains visible while it is unavailable.', availability: 'Unavailable in this demonstration', available: false, samplePriceMinor: 550, image: retainedPhoto('squash'), alt: 'Two orange squash on a wooden table against a muted green background' }),

  makeProduct({ id: 'ground-beef', department: 'butcher', featured: true, name: 'Ground beef', unit: 'example 500 g pack', shortDescription: 'Fresh raw ground beef for burgers or sauces.', samplePriceMinor: 1200, image: cataloguePhoto('ground-beef'), alt: 'Raw ground beef in a clear glass bowl' }),
  makeProduct({ id: 'beef-steak', department: 'butcher', name: 'Beef steaks', unit: 'example two-pack', shortDescription: 'Two raw beef steaks cut for the grill.', samplePriceMinor: 1800, image: cataloguePhoto('beef-steak'), alt: 'Raw beef steaks with herbs on a dark board' }),
  makeProduct({ id: 'chicken-breast', department: 'butcher', name: 'Chicken breasts', unit: 'example 600 g pack', shortDescription: 'Boneless raw chicken breasts packed together.', samplePriceMinor: 1400, image: cataloguePhoto('chicken-breast'), alt: 'Raw boneless chicken breasts on a board' }),
  makeProduct({ id: 'pork-chops', department: 'butcher', name: 'Pork chops', unit: 'example two-pack', shortDescription: 'Thick-cut raw pork chops.', samplePriceMinor: 1600, image: cataloguePhoto('pork-chops'), alt: 'Raw pork chops arranged with herbs' }),
  makeProduct({ id: 'sausages', department: 'butcher', name: 'Farm sausages', unit: 'example six-pack', shortDescription: 'Six fresh raw sausages ready for cooking.', samplePriceMinor: 1300, image: cataloguePhoto('sausages'), alt: 'Fresh uncooked sausages arranged on paper' }),
  makeProduct({ id: 'lamb-chops', department: 'butcher', name: 'Lamb chops', unit: 'example four-pack', shortDescription: 'Four raw lamb chops for pan or grill.', samplePriceMinor: 2200, image: cataloguePhoto('lamb-chops'), alt: 'Raw lamb chops with herbs on a dark surface' }),

  makeProduct({ id: 'eggs', department: 'eggs-and-dairy', featured: true, name: 'Dozen eggs', unit: 'example dozen', shortDescription: 'Mixed-colour eggs presented as a dozen.', detail: 'A sample dozen with a collection price. The wire basket in the photograph is a styling prop and is not included.', availability: 'Illustrative availability: selected collection periods', samplePriceMinor: 700, image: retainedPhoto('eggs'), alt: 'Mixed-colour eggs in a black wire basket resting on hay' }),
  makeProduct({ id: 'butter', department: 'eggs-and-dairy', name: 'Cultured butter', unit: 'example 250 g', shortDescription: 'A small portion of pale cultured butter.', samplePriceMinor: 700, image: cataloguePhoto('butter'), alt: 'Pale butter served on a small ceramic plate' }),
  makeProduct({ id: 'cheddar', department: 'eggs-and-dairy', name: 'Cheddar selection', unit: 'example 300 g', shortDescription: 'A sample selection of cheddar and marbled Colby-style cheese.', samplePriceMinor: 950, image: cataloguePhoto('cheddar'), alt: 'Blocks and slices of orange cheddar and marbled cheese' }),
  makeProduct({ id: 'plain-yogurt', department: 'eggs-and-dairy', name: 'Plain yogurt', unit: 'example 750 mL jar', shortDescription: 'Thick plain yogurt shown in a reusable jar.', samplePriceMinor: 650, image: cataloguePhoto('plain-yogurt'), alt: 'Plain yogurt in a glass jar with a spoon' }),

  makeProduct({ id: 'honey', department: 'pantry', featured: true, name: 'Wildflower honey', unit: 'example 500 g jar', shortDescription: 'Golden honey in a clear glass jar.', samplePriceMinor: 1200, image: cataloguePhoto('honey'), alt: 'Golden honey in a glass jar with a wooden dipper' }),
  makeProduct({ id: 'berry-jam', department: 'pantry', name: 'Berry jam', unit: 'example 250 mL jar', shortDescription: 'Small-batch red berry preserve.', samplePriceMinor: 900, image: cataloguePhoto('berry-jam'), alt: 'Red berry jam in an open glass jar' }),
  makeProduct({ id: 'pickled-cucumbers', department: 'pantry', name: 'Dill pickles', unit: 'example 500 mL jar', shortDescription: 'Cucumber spears preserved with dill.', samplePriceMinor: 850, image: cataloguePhoto('pickled-cucumbers'), alt: 'Pickled cucumbers packed in a glass jar' }),
  makeProduct({ id: 'rolled-oats', department: 'pantry', name: 'Rolled oats', unit: 'example 1 kg bag', shortDescription: 'Whole rolled oats for porridge and baking.', samplePriceMinor: 650, image: cataloguePhoto('rolled-oats'), alt: 'Dry rolled oats heaped in a wooden bowl' }),

  makeProduct({ id: 'harvest-box', department: 'boxes', featured: true, name: 'Mixed harvest box', unit: 'example box', shortDescription: 'A colourful vegetable box with its pictured contents listed.', detail: 'A mixed box represented by the photographed peppers, bunching onions, and avocados.', availability: 'Illustrative availability: Saturday collection', samplePriceMinor: 3200, image: retainedPhoto('produce-box'), alt: 'Wooden produce crate filled with peppers, bunching onions, and avocados', boxContents: ['Sweet peppers', 'Bunching onions', 'Avocados'] }),
  makeProduct({ id: 'fruit-box', department: 'boxes', name: 'Orchard fruit box', unit: 'example box', shortDescription: 'A mixed box of orchard and soft fruit.', detail: 'A sample fruit box represented by the photographed apples, grapes, oranges, and soft fruit. Exact contents would follow the stated collection period.', availability: 'Illustrative availability: Saturday collection', samplePriceMinor: 2800, image: cataloguePhoto('fruit-box'), alt: 'Open produce box filled with apples, grapes, oranges, and berries', boxContents: ['Apples', 'Grapes', 'Oranges', 'Seasonal soft fruit'] }),

  makeProduct({ id: 'canvas-tote', department: 'farm-goods', featured: true, name: 'Canvas market tote', unit: 'example tote', shortDescription: 'A reusable natural-canvas shopping tote.', samplePriceMinor: 1800, image: cataloguePhoto('canvas-tote'), alt: 'Natural canvas tote bag with sturdy handles' }),
  makeProduct({ id: 'work-cap', department: 'farm-goods', name: 'Farm work cap', unit: 'example cap', shortDescription: 'A simple adjustable cotton cap.', samplePriceMinor: 2200, image: cataloguePhoto('work-cap'), alt: 'Plain work cap photographed from the side' }),
  makeProduct({ id: 'market-apron', department: 'farm-goods', name: 'Market apron', unit: 'example apron', shortDescription: 'A durable waist apron with front pockets.', samplePriceMinor: 3500, image: cataloguePhoto('market-apron'), alt: 'Market worker wearing a practical waist apron' }),
  makeProduct({ id: 'farm-tee', department: 'farm-goods', name: 'Cotton work shirt', unit: 'example shirt', shortDescription: 'A plain short-sleeve cotton shirt.', samplePriceMinor: 2800, image: cataloguePhoto('farm-tee'), alt: 'Plain light-coloured short-sleeve cotton shirt', variants: [{ id: 's', label: 'Small' }, { id: 'm', label: 'Medium' }, { id: 'l', label: 'Large' }, { id: 'xl', label: 'Extra large' }] }),
] as const satisfies readonly Product[]

export type ProductId = (typeof products)[number]['id']

export const productById = new Map<ProductId, (typeof products)[number]>(products.map((product) => [product.id, product]))

export const departmentCounts = products.reduce<Record<DepartmentId, number>>((counts, product) => {
  counts[product.department] += 1
  return counts
}, { 'fruit-and-veg': 0, butcher: 0, 'eggs-and-dairy': 0, pantry: 0, boxes: 0, 'farm-goods': 0 })

export function formatSampleCad(minorUnits: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(minorUnits / 100)
}
