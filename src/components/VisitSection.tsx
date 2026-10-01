import { useEffect, useRef, useState } from 'react'
import type { CommerceSound } from '../audio/useSoundscape'

interface VisitSectionProps {
  onInterfaceSound: (kind: CommerceSound) => boolean
}

type EnvelopePhase = 'closed' | 'opening' | 'open' | 'closing'

function targetIsVisit() {
  try {
    return decodeURIComponent(location.hash.slice(1)) === 'visit'
  } catch {
    return false
  }
}

export function VisitSection({ onInterfaceSound }: VisitSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const completionTimerRef = useRef<number | undefined>(undefined)
  const [phase, setPhase] = useState<EnvelopePhase>(() => targetIsVisit() ? 'open' : 'closed')
  const [inviting, setInviting] = useState(false)
  const [invitationDone, setInvitationDone] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)

  const completeAfter = (next: 'open' | 'closed') => {
    if (completionTimerRef.current !== undefined) window.clearTimeout(completionTimerRef.current)
    completionTimerRef.current = window.setTimeout(() => setPhase(next), 1550)
  }

  const toggleEnvelope = () => {
    setInviting(false)
    setInvitationDone(true)
    if (phase === 'opening' || phase === 'closing') return
    if (phase === 'closed') {
      onInterfaceSound('details-open')
      if (reducedMotion) setPhase('open')
      else {
        setPhase('opening')
        completeAfter('open')
      }
      return
    }
    onInterfaceSound('details-close')
    if (reducedMotion) setPhase('closed')
    else {
      setPhase('closing')
      completeAfter('closed')
    }
  }

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => {
      setReducedMotion(media.matches)
      if (media.matches) setPhase((current) => current === 'opening' ? 'open' : current === 'closing' ? 'closed' : current)
    }
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const section = sectionRef.current
    if (!section || reducedMotion || invitationDone || phase !== 'closed' || !('IntersectionObserver' in window)) return
    let invitationTimer: number | undefined
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || document.hidden) {
        if (invitationTimer !== undefined) window.clearTimeout(invitationTimer)
        setInviting(false)
        return
      }
      invitationTimer = window.setTimeout(() => setInviting(true), 450)
    }, { threshold: .35 })
    observer.observe(section)
    return () => {
      observer.disconnect()
      if (invitationTimer !== undefined) window.clearTimeout(invitationTimer)
    }
  }, [invitationDone, phase, reducedMotion])

  useEffect(() => {
    const openDirectVisit = () => {
      if (!targetIsVisit()) return
      if (completionTimerRef.current !== undefined) window.clearTimeout(completionTimerRef.current)
      setInviting(false)
      setInvitationDone(true)
      setPhase('open')
    }
    addEventListener('hashchange', openDirectVisit)
    return () => removeEventListener('hashchange', openDirectVisit)
  }, [])

  useEffect(() => {
    const finishOnHide = () => {
      if (!document.hidden) return
      setInviting(false)
      setPhase((current) => current === 'opening' ? 'open' : current === 'closing' ? 'closed' : current)
    }
    document.addEventListener('visibilitychange', finishOnHide)
    return () => document.removeEventListener('visibilitychange', finishOnHide)
  }, [])

  useEffect(() => () => {
    if (completionTimerRef.current !== undefined) window.clearTimeout(completionTimerRef.current)
  }, [])

  const expanded = phase === 'open' || phase === 'opening'
  const contentExposed = phase === 'open'
  const buttonLabel = expanded ? 'Fold visiting letter' : 'Open visiting letter'

  return (
    <section className="after-section visit" id="visit" aria-labelledby="visit-heading" ref={sectionRef}>
      <div className="visiting-envelope" data-phase={phase} data-inviting={inviting ? 'true' : 'false'}>
        <h2 id="visit-heading">Before you set off.</h2>
        <div className="visiting-envelope__stage">
          <div className="visiting-envelope__letter-slot">
            <div className="visiting-letter" id="visiting-letter" aria-hidden={!contentExposed} inert={!contentExposed ? true : undefined}>
              <div className="visiting-letter__hours">
                <h3>At the stand</h3>
                <dl>
                  <div><dt>Thursday</dt><dd>3–6 pm</dd></div>
                  <div><dt>Saturday</dt><dd>9 am–1 pm</dd></div>
                </dl>
              </div>
              <div className="visiting-letter__support">
                <div>
                  <h3>Collection</h3>
                  <p>Build a basket, then choose a sample collection period.</p>
                  <a href="#shop">Back to the market</a>
                </div>
                <div>
                  <h3>Getting here</h3>
                  <p>This is a demonstration farm, so there is no visitor address.</p>
                </div>
              </div>
              <details onToggle={(event) => onInterfaceSound(event.currentTarget.open ? 'details-open' : 'details-close')}>
                <summary>What a real visiting page would include</summary>
                <p>Directions, parking, step-free access and any gate or arrival instructions—using details confirmed by the business.</p>
              </details>
            </div>
          </div>
          <div className="visiting-envelope__shell" aria-hidden="true">
            <span className="visiting-envelope__back" />
            <span className="visiting-envelope__flap" />
            <span className="visiting-envelope__front" />
            <span className="visiting-envelope__invitation">Open visiting letter</span>
          </div>
          <button
            className="visiting-envelope__button"
            type="button"
            aria-expanded={expanded}
            aria-controls="visiting-letter"
            aria-label={buttonLabel}
            title={buttonLabel}
            disabled={phase === 'opening' || phase === 'closing'}
            onClick={toggleEnvelope}
            onAnimationEnd={() => {
              if (inviting) {
                setInviting(false)
                setInvitationDone(true)
              }
            }}
          />
        </div>
      </div>
    </section>
  )
}
