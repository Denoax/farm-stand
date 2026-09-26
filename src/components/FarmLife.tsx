import { useState } from 'react'
import { farmLifeProfiles, type FarmLifeId } from '../content/farmLife'
import { DeferredImage } from './DeferredImage'

export function FarmLife() {
  const [selectedId, setSelectedId] = useState<FarmLifeId>('hens')
  const selected = farmLifeProfiles.find((profile) => profile.id === selectedId) ?? farmLifeProfiles[0]

  return (
    <section className="farm-life" id="farm-life" aria-labelledby="farm-life-heading">
      <div className="farm-life__copy">
        <p className="eyebrow eyebrow--light">Around the farm · illustrative photography</p>
        <h2 id="farm-life-heading">{selected.heading}</h2>
        <p>{selected.description}</p>
        <div className="farm-life-tabs" role="tablist" aria-label="Choose a farm-life example">
          {farmLifeProfiles.map((profile) => (
            <button
              type="button"
              role="tab"
              aria-selected={selectedId === profile.id}
              aria-controls="farm-life-panel"
              id={`farm-life-tab-${profile.id}`}
              key={profile.id}
              onClick={() => setSelectedId(profile.id)}
            >{profile.label}</button>
          ))}
        </div>
        <div id="farm-life-panel" role="tabpanel" aria-labelledby={`farm-life-tab-${selected.id}`}>
          <a className="text-link" href={selected.link}>{selected.linkLabel} <span aria-hidden="true">↗</span></a>
        </div>
        <p className="farm-life__disclosure">These licensed photographs illustrate possible farm content; they do not show a client, this fictional property, or an endorsement.</p>
      </div>
      <figure className="farm-life__figure">
        <DeferredImage key={selected.id} src={selected.image} alt={selected.alt} width={1200} height={1800} fallbackLabel={`${selected.label} photograph unavailable`} />
        <figcaption>{selected.credit}</figcaption>
      </figure>
    </section>
  )
}
