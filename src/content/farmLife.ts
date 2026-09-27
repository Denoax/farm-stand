const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

export type FarmLifeId = 'hens' | 'cattle' | 'sheep'

export const farmLifeProfiles = [
  {
    id: 'hens' as const,
    variant: 'ground' as const,
    label: 'Hens',
    heading: 'Hens',
    description: 'A hen keeps close to her chicks at ground level, linking this farm-life scene to the sample dozen eggs in the stand.',
    video: publicAsset('media/farm-life-motion/hens.mp4'),
    poster: publicAsset('media/farm-life-motion/hens-poster.avif'),
    imagePosition: '50% 56%',
    alt: 'A hen and chicks foraging together on pebbled ground',
    link: '#product-eggs',
    linkLabel: 'View eggs',
    credit: 'Video: Anurag Gusain / Pexels',
  },
  {
    id: 'cattle' as const,
    variant: 'wide' as const,
    label: 'Cattle',
    heading: 'Cattle',
    description: 'A herd grazes across open pasture beneath distant mountains.',
    video: publicAsset('media/farm-life-motion/cattle.mp4'),
    poster: publicAsset('media/farm-life-motion/cattle-poster.avif'),
    imagePosition: '50% 50%',
    alt: 'A cattle herd spread across a wide pasture beneath distant mountains',
    link: '#visit',
    linkLabel: 'View visiting information',
    credit: 'Video: Taryn Elliott / Pexels',
  },
  {
    id: 'sheep' as const,
    variant: 'reveal' as const,
    label: 'Sheep',
    heading: 'Sheep',
    description: 'A sunlit flock gathers close to the yard, bringing the farm-life sequence to a quiet finish.',
    video: publicAsset('media/farm-life-motion/sheep.mp4'),
    poster: publicAsset('media/farm-life-motion/sheep-poster.avif'),
    imagePosition: '50% 50%',
    alt: 'A light-coloured sheep facing the camera among a flock in golden sunlight',
    link: '#website',
    linkLabel: 'See the website service',
    credit: 'Video: Matthias Groeneveld / Pexels',
  },
] as const
