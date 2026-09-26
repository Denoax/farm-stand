import { useEffect, useRef, useState } from 'react'
import { farmLifeProfiles, type FarmLifeId } from '../content/farmLife'

interface FarmLifeProps {
  onViewProduct: (productId: 'eggs') => void
}

const profileById = new Map(farmLifeProfiles.map((profile) => [profile.id, profile]))

export function FarmLife({ onViewProduct }: FarmLifeProps) {
  const [selectedId, setSelectedId] = useState<FarmLifeId>('hens')
  const [focusedId, setFocusedId] = useState<FarmLifeId>('hens')
  const [previousId, setPreviousId] = useState<FarmLifeId | null>(null)
  const [imageFailed, setImageFailed] = useState(false)
  const [loadMessage, setLoadMessage] = useState('')
  const [entered, setEntered] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const tabRefs = useRef(new Map<FarmLifeId, HTMLButtonElement>())
  const requestTokenRef = useRef(0)
  const selected = profileById.get(selectedId) ?? farmLifeProfiles[0]
  const previous = previousId ? profileById.get(previousId) : null

  useEffect(() => {
    const section = sectionRef.current
    if (!section || !('IntersectionObserver' in window)) {
      setEntered(true)
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setEntered(true)
      observer.disconnect()
    }, { threshold: 0.16 })
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  useEffect(() => () => {
    requestTokenRef.current += 1
  }, [])

  const selectProfile = async (id: FarmLifeId) => {
    const token = ++requestTokenRef.current
    setFocusedId(id)
    setLoadMessage('')
    if (id === selectedId) return
    const profile = profileById.get(id)
    if (!profile) return

    const image = new Image()
    image.src = profile.image
    try {
      await new Promise<void>((resolve, reject) => {
        image.addEventListener('load', () => resolve(), { once: true })
        image.addEventListener('error', () => reject(new Error('image load failed')), { once: true })
      })
      await image.decode()
    } catch {
      if (requestTokenRef.current === token) {
        setFocusedId(selectedId)
        setLoadMessage(`${profile.label} photograph could not be loaded. The previous profile remains in view.`)
        requestAnimationFrame(() => tabRefs.current.get(selectedId)?.focus())
      }
      return
    }
    if (requestTokenRef.current !== token) return
    setPreviousId(selectedId)
    setSelectedId(id)
    setImageFailed(false)
  }

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, id: FarmLifeId) => {
    const currentIndex = farmLifeProfiles.findIndex((profile) => profile.id === id)
    let nextIndex = currentIndex
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % farmLifeProfiles.length
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + farmLifeProfiles.length) % farmLifeProfiles.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = farmLifeProfiles.length - 1
    else return
    event.preventDefault()
    const nextId = farmLifeProfiles[nextIndex].id
    tabRefs.current.get(nextId)?.focus()
    void selectProfile(nextId)
  }

  return (
    <section className="farm-life" id="farm-life" aria-labelledby="farm-life-heading" ref={sectionRef} data-entered={entered ? 'true' : 'false'} data-profile={selected.id}>
      <div className="farm-life__copy">
        <p className="eyebrow eyebrow--light">Around the farm · illustrative photography</p>
        <div className="farm-life-tabs" role="tablist" aria-label="Choose a farm-life example">
          {farmLifeProfiles.map((profile) => (
            <button
              type="button"
              role="tab"
              aria-selected={selectedId === profile.id}
              aria-controls="farm-life-panel"
              id={`farm-life-tab-${profile.id}`}
              tabIndex={focusedId === profile.id ? 0 : -1}
              ref={(node) => {
                if (node) tabRefs.current.set(profile.id, node)
                else tabRefs.current.delete(profile.id)
              }}
              key={profile.id}
              onClick={() => void selectProfile(profile.id)}
              onKeyDown={(event) => onTabKeyDown(event, profile.id)}
            >{profile.label}</button>
          ))}
        </div>
        <div className="farm-life__panel" id="farm-life-panel" role="tabpanel" aria-labelledby={`farm-life-tab-${selected.id}`}>
          <div className="farm-life__panel-content" key={selected.id}>
            <h2 id="farm-life-heading">{selected.heading}</h2>
            <p>{selected.description}</p>
            <a
              className="text-link"
              href={selected.link}
              onClick={selected.id === 'hens' ? (event) => {
                event.preventDefault()
                onViewProduct('eggs')
              } : undefined}
            >{selected.linkLabel} <span aria-hidden="true">{selected.id === 'hens' ? '↓' : '↗'}</span></a>
          </div>
        </div>
        <p className="farm-life__load-status" role="status">{loadMessage}</p>
        <p className="farm-life__disclosure">These licensed photographs illustrate possible farm content; they do not show a client, this fictional property, or an endorsement.</p>
      </div>
      <figure className="farm-life__figure">
        {previous && (
          <img
            className="farm-life__image farm-life__image--outgoing"
            src={previous.image}
            alt=""
            width="1200"
            height="1800"
            aria-hidden="true"
            style={{ objectPosition: previous.imagePosition }}
          />
        )}
        <img
          className="farm-life__image farm-life__image--incoming"
          key={selected.id}
          src={entered ? selected.image : undefined}
          alt={imageFailed ? '' : selected.alt}
          width="1200"
          height="1800"
          loading="lazy"
          decoding="async"
          style={{ objectPosition: selected.imagePosition }}
          onError={() => setImageFailed(true)}
          onAnimationEnd={() => setPreviousId(null)}
        />
        {imageFailed && <span className="media-fallback" role="img" aria-label={`${selected.label} photograph unavailable. ${selected.alt}`}>{selected.label} photograph unavailable</span>}
        <figcaption>{selected.credit}</figcaption>
      </figure>
    </section>
  )
}
