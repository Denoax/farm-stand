const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

export type FarmLifeId = 'hens' | 'cattle' | 'sheep'

export const farmLifeProfiles = [
  {
    id: 'hens' as const,
    label: 'Hens',
    heading: 'Hens',
    description: 'Follow this illustrative farm-life story to the sample dozen eggs in the stand. Animal access is not offered by this demonstration.',
    image: publicAsset('media/farm-life/hens.avif'),
    imagePosition: '50% 85%',
    alt: 'A group of brown hens gathered behind a farm gate in warm evening light',
    link: '#product-eggs',
    linkLabel: 'View eggs',
    credit: 'Photo: Eline Spee / Pexels',
  },
  {
    id: 'cattle' as const,
    label: 'Cattle',
    heading: 'Cattle',
    description: 'Herd, grazing, and visitor-boundary details belong here once a farm has verified them. This photograph does not depict this fictional property.',
    image: publicAsset('media/farm-life/cattle.avif'),
    imagePosition: '50% 50%',
    alt: 'Brown and white cattle standing beneath a leafy tree in a sunny pasture',
    link: '#visit',
    linkLabel: 'See example visitor information',
    credit: 'Photo: Alina Vilchenko / Pexels',
  },
  {
    id: 'sheep' as const,
    label: 'Sheep',
    heading: 'Sheep',
    description: 'Seasonal flock and visitor information could be shared here after verification. This photograph is illustrative and makes no claim about the property.',
    image: publicAsset('media/farm-life/sheep.avif'),
    imagePosition: '50% 50%',
    alt: 'A light-coloured sheep facing the camera among a flock in golden sunlight',
    link: '#website',
    linkLabel: 'See what this layout demonstrates',
    credit: 'Photo: cottonbro studio / Pexels',
  },
] as const
