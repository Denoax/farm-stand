const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

export type FarmLifeId = 'hens' | 'cattle' | 'sheep'

export const farmLifeProfiles = [
  {
    id: 'hens' as const,
    variant: 'ground' as const,
    label: 'Hens',
    heading: 'Hens',
    description: 'A hen keeps close to her chicks at ground level, linking this farm-life scene to the sample dozen eggs in the stand.',
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
    description: 'A herd spreads across open pasture at the close of the day.',
    image: publicAsset('media/farm-life/cattle-v24.avif'),
    imagePosition: '50% 50%',
    alt: 'Cattle spread across a wide pasture beneath a dramatic evening sky',
    link: '#visit',
    linkLabel: 'View visiting information',
    credit: 'Photo: Helena Lopes / Pexels',
  },
  {
    id: 'sheep' as const,
    variant: 'reveal' as const,
    label: 'Sheep',
    heading: 'Sheep',
    description: 'A sunlit flock gathers close to the yard, bringing the farm-life sequence to a quiet finish.',
    image: publicAsset('media/farm-life/sheep.avif'),
    imagePosition: '50% 50%',
    alt: 'A light-coloured sheep facing the camera among a flock in golden sunlight',
    link: '#website',
    linkLabel: 'See the website service',
    credit: 'Photo: cottonbro studio / Pexels',
  },
] as const
