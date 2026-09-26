const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

export type FarmLifeId = 'hens' | 'cattle' | 'sheep'

export const farmLifeProfiles = [
  {
    id: 'hens' as const,
    variant: 'ground' as const,
    label: 'Hens',
    heading: 'Hens',
    description: 'Follow this illustrative farm-life story to the sample dozen eggs in the stand. Animal access is not offered by this demonstration.',
    image: publicAsset('media/farm-life/hens-v24.avif'),
    imagePosition: '50% 56%',
    alt: 'A hen and chicks foraging together on pebbled ground',
    link: '#product-eggs',
    linkLabel: 'View eggs',
    credit: 'Photo: Nguyen Huy / Pexels',
  },
  {
    id: 'cattle' as const,
    variant: 'wide' as const,
    label: 'Cattle',
    heading: 'Cattle',
    description: 'Herd, grazing, and visitor-boundary details belong here once a farm has verified them. This photograph does not depict this fictional property.',
    image: publicAsset('media/farm-life/cattle-v24.avif'),
    imagePosition: '50% 50%',
    alt: 'Cattle spread across a wide pasture beneath a dramatic evening sky',
    link: '#visit',
    linkLabel: 'See example visitor information',
    credit: 'Photo: Helena Lopes / Pexels',
  },
  {
    id: 'sheep' as const,
    variant: 'reveal' as const,
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
