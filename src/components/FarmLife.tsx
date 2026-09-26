import { useEffect, useRef, useState } from 'react'
import { farmLifeProfiles } from '../content/farmLife'

interface FarmLifeProps {
  onViewProduct: (productId: 'eggs') => void
}

function FarmProfileScene({ profile, index, onViewProduct }: {
  profile: (typeof farmLifeProfiles)[number]
  index: number
  onViewProduct: (productId: 'eggs') => void
}) {
  const sceneRef = useRef<HTMLElement>(null)
  const [imageFailed, setImageFailed] = useState(false)
  const [imageReady, setImageReady] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(() => {
    const target = decodeURIComponent(window.location.hash.slice(1))
    return target === profile.id || (target === 'farm-life' && index === 0)
  })

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    let frame = 0
    const update = () => {
      frame = 0
      const bounds = scene.getBoundingClientRect()
      const range = Math.max(scene.offsetHeight - innerHeight, 1)
      scene.style.setProperty('--profile-progress', Math.min(1, Math.max(0, -bounds.top / range)).toFixed(4))
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    addEventListener('scroll', schedule, { passive: true })
    addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      removeEventListener('scroll', schedule)
      removeEventListener('resize', schedule)
    }
  }, [])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || !('IntersectionObserver' in window)) {
      setShouldLoad(true)
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setShouldLoad(true)
      observer.disconnect()
    }, { rootMargin: '900px 0px' })
    observer.observe(scene)
    return () => observer.disconnect()
  }, [])

  return (
    <article className={`farm-profile farm-profile--${profile.id} farm-profile--${profile.variant}`} id={profile.id} ref={sceneRef} data-media-ready={imageReady ? 'true' : 'false'}>
      <div className="farm-profile__sticky">
        <figure className="farm-profile__figure">
          <div className="farm-profile__placeholder" aria-hidden="true" />
          <img className="farm-profile__image farm-profile__image--wide" src={shouldLoad && !imageFailed ? profile.image : undefined} alt={imageFailed ? '' : profile.alt} width="1920" height="1280" loading="lazy" decoding="async" style={{ objectPosition: profile.imagePosition }} onLoad={() => setImageReady(true)} onError={() => setImageFailed(true)} />
          {profile.variant === 'reveal' && !imageFailed && <img className="farm-profile__image farm-profile__image--detail" src={shouldLoad ? profile.image : undefined} alt="" width="1200" height="1800" loading="lazy" decoding="async" aria-hidden="true" />}
          {imageFailed && <span className="media-fallback" role="img" aria-label={`${profile.label} photograph unavailable. ${profile.alt}`}>{profile.label} photograph unavailable</span>}
          <div className="farm-profile__foreground" aria-hidden="true"><i /><i /></div>
          <figcaption>{profile.credit}</figcaption>
        </figure>
        <div className="farm-profile__copy">
          <p className="farm-profile__number">0{index + 1} / 03</p>
          <p className="eyebrow eyebrow--light">Around the farm · illustrative photography</p>
          <h2>{profile.heading}</h2>
          <p>{profile.description}</p>
          <a className="text-link" href={profile.link} onClick={profile.id === 'hens' ? (event) => { event.preventDefault(); onViewProduct('eggs') } : undefined}>
            {profile.linkLabel} <span aria-hidden="true">{profile.id === 'hens' ? '↓' : '↗'}</span>
          </a>
        </div>
      </div>
    </article>
  )
}

export function FarmLife({ onViewProduct }: FarmLifeProps) {
  return (
    <section className="farm-life" id="farm-life" aria-labelledby="farm-life-heading">
      <div className="farm-life__intro">
        <p className="eyebrow eyebrow--light">Life beyond the stand</p>
        <h2 id="farm-life-heading">Three subjects. Three ways into the story.</h2>
        <nav aria-label="Farm-life scenes">
          {farmLifeProfiles.map((profile) => <a key={profile.id} href={`#${profile.id}`}>{profile.label}</a>)}
        </nav>
        <p>Licensed photographs illustrate the kind of verified story a farm could tell. They do not show a client, this fictional property, animal access, or an endorsement.</p>
      </div>
      {farmLifeProfiles.map((profile, index) => <FarmProfileScene key={profile.id} profile={profile} index={index} onViewProduct={onViewProduct} />)}
    </section>
  )
}
