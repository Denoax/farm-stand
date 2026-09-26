const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

export type FarmLifeId = 'hens' | 'cattle' | 'sheep'

export const farmLifeProfiles = [
  {
    id: 'hens' as const,
    label: 'Hens',
    heading: 'Connect daily farm life to useful information.',
    description: 'An animal profile can introduce the activity, answer common questions, and lead naturally to an example product without implying that every visit includes animal access.',
    image: publicAsset('media/farm-life/hens.avif'),
    alt: 'A group of brown hens gathered behind a farm gate in warm evening light',
    link: '#product-eggs',
    linkLabel: 'See the demonstration eggs',
    credit: 'Photo: Eline Spee / Pexels',
  },
  {
    id: 'cattle' as const,
    label: 'Cattle',
    heading: 'Make livestock information calm and legible.',
    description: 'A farm could use this space for supported herd, grazing, or visitor information. This demonstration does not claim a breed, pedigree, health status, or property ownership.',
    image: publicAsset('media/farm-life/cattle.avif'),
    alt: 'Brown and white cattle standing beneath a leafy tree in a sunny pasture',
    link: '#visit',
    linkLabel: 'See example visitor information',
    credit: 'Photo: Alina Vilchenko / Pexels',
  },
  {
    id: 'sheep' as const,
    label: 'Sheep',
    heading: 'Give another activity its own clear story.',
    description: 'The selected photograph and short profile change together, demonstrating how one page can hold several activities without an auto-rotating carousel or a wall of cards.',
    image: publicAsset('media/farm-life/sheep.avif'),
    alt: 'A light-coloured sheep facing the camera among a flock in golden sunlight',
    link: '#website',
    linkLabel: 'See what this layout demonstrates',
    credit: 'Photo: cottonbro studio / Pexels',
  },
] as const
