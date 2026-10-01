import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CommerceSound } from '../audio/useSoundscape'

interface VisitSectionProps {
  onInterfaceSound: (kind: CommerceSound) => boolean
}

type EnvelopePhase =
  | 'closed'
  | 'opening-flap'
  | 'opening-extract'
  | 'opening-hold'
  | 'opening-upper'
  | 'opening-lower'
  | 'open'
  | 'closing-lower'
  | 'closing-upper'
  | 'closing-insert'
  | 'closing-flap'

function targetIsVisit() {
  try {
    return decodeURIComponent(location.hash.slice(1)) === 'visit'
  } catch {
    return false
  }
}

const nextPhase: Partial<Record<EnvelopePhase, EnvelopePhase>> = {
  'opening-flap': 'opening-extract',
  'opening-extract': 'opening-hold',
  'opening-hold': 'opening-upper',
  'opening-upper': 'opening-lower',
  'opening-lower': 'open',
  'closing-lower': 'closing-upper',
  'closing-upper': 'closing-insert',
  'closing-insert': 'closing-flap',
  'closing-flap': 'closed',
}

export function VisitSection({ onInterfaceSound }: VisitSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const panelRefs = useRef<Array<HTMLElement | null>>([])
  const completionTimerRef = useRef<number | undefined>(undefined)
  const runRef = useRef(0)
  const [phase, setPhase] = useState<EnvelopePhase>(() => targetIsVisit() ? 'open' : 'closed')
  const [inviting, setInviting] = useState(false)
  const [invitationDone, setInvitationDone] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)

  const settle = (next: 'open' | 'closed') => {
    runRef.current += 1
    if (completionTimerRef.current !== undefined) window.clearTimeout(completionTimerRef.current)
    completionTimerRef.current = undefined
    setPhase(next)
  }

  const guardSequence = (next: 'open' | 'closed') => {
    const run = ++runRef.current
    if (completionTimerRef.current !== undefined) window.clearTimeout(completionTimerRef.current)
    completionTimerRef.current = window.setTimeout(() => {
      if (run === runRef.current) settle(next)
    }, 3100)
  }

  const toggleEnvelope = () => {
    setInviting(false)
    setInvitationDone(true)
    if (phase !== 'closed' && phase !== 'open') return
    if (phase === 'closed') {
      onInterfaceSound('details-open')
      if (reducedMotion) settle('open')
      else {
        setPhase('opening-flap')
        guardSequence('open')
      }
      return
    }
    onInterfaceSound('details-close')
    if (reducedMotion) settle('closed')
    else {
      setPhase('closing-lower')
      guardSequence('closed')
    }
  }

  const advance = (event: React.TransitionEvent<HTMLElement>, owner: 'flap' | 'packet' | 'upper' | 'lower') => {
    if (event.propertyName !== 'transform' || event.target !== event.currentTarget) return
    const expectedOwner: Partial<Record<EnvelopePhase, typeof owner>> = {
      'opening-flap': 'flap',
      'opening-extract': 'packet',
      'opening-upper': 'upper',
      'opening-lower': 'lower',
      'closing-lower': 'lower',
      'closing-upper': 'upper',
      'closing-insert': 'packet',
      'closing-flap': 'flap',
    }
    if (expectedOwner[phase] !== owner) return
    const next = nextPhase[phase]
    if (next) setPhase(next)
  }

  const finishExtractionHold = (event: React.AnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.animationName !== 'letter-extracted-hold' || phase !== 'opening-hold') return
    setPhase('opening-upper')
  }

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    let previousHeight = 0
    const measure = () => {
      const height = Math.ceil(Math.max(0, ...panelRefs.current.map((panel) => panel?.scrollHeight ?? 0)))
      if (height <= 0 || Math.abs(height - previousHeight) < 2) return
      previousHeight = height
      stage.style.setProperty('--letter-panel-height', `${height}px`)
    }
    measure()
    const observer = new ResizeObserver(measure)
    panelRefs.current.forEach((panel) => { if (panel) observer.observe(panel) })
    void document.fonts?.ready.then(measure)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => {
      setReducedMotion(media.matches)
      if (!media.matches) return
      setPhase((current) => {
        if (current.startsWith('opening-')) return 'open'
        if (current.startsWith('closing-')) return 'closed'
        return current
      })
      runRef.current += 1
      if (completionTimerRef.current !== undefined) window.clearTimeout(completionTimerRef.current)
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
      setInviting(false)
      setInvitationDone(true)
      settle('open')
    }
    addEventListener('hashchange', openDirectVisit)
    return () => removeEventListener('hashchange', openDirectVisit)
  }, [])

  useEffect(() => {
    const finishOnHide = () => {
      if (!document.hidden) return
      setInviting(false)
      setPhase((current) => {
        if (current.startsWith('opening-')) return 'open'
        if (current.startsWith('closing-')) return 'closed'
        return current
      })
      runRef.current += 1
      if (completionTimerRef.current !== undefined) window.clearTimeout(completionTimerRef.current)
    }
    document.addEventListener('visibilitychange', finishOnHide)
    return () => document.removeEventListener('visibilitychange', finishOnHide)
  }, [])

  useEffect(() => () => {
    runRef.current += 1
    if (completionTimerRef.current !== undefined) window.clearTimeout(completionTimerRef.current)
  }, [])

  useEffect(() => {
    if (phase !== 'open' && phase !== 'closed') return
    if (completionTimerRef.current !== undefined) window.clearTimeout(completionTimerRef.current)
    completionTimerRef.current = undefined
  }, [phase])

  const opening = phase.startsWith('opening-')
  const expanded = opening || phase === 'open'
  const contentExposed = phase === 'open'
  const buttonLabel = expanded ? 'Fold visiting letter' : 'Open visiting letter'

  return (
    <section className="after-section visit" id="visit" aria-labelledby="visit-heading" ref={sectionRef}>
      <div className="visiting-envelope" data-phase={phase} data-inviting={inviting ? 'true' : 'false'}>
        <h2 id="visit-heading">Before you set off.</h2>
        <div className="visiting-envelope__stage" ref={stageRef}>
          <div className="visiting-envelope__letter-slot">
            <div className="visiting-letter" id="visiting-letter" aria-hidden={!contentExposed} inert={!contentExposed ? true : undefined} onTransitionEnd={(event) => advance(event, 'packet')} onAnimationEnd={finishExtractionHold}>
              <div className="visiting-letter__fold visiting-letter__fold--upper" onTransitionEnd={(event) => advance(event, 'upper')}>
                <section className="visiting-letter__panel visiting-letter__panel--upper" ref={(panel) => { panelRefs.current[0] = panel }}>
                  <h3>At the stand</h3>
                  <dl>
                    <div><dt>Thursday</dt><dd>3–6 pm</dd></div>
                    <div><dt>Saturday</dt><dd>9 am–1 pm</dd></div>
                  </dl>
                </section>
                <span className="visiting-letter__back" aria-hidden="true" />
              </div>
              <section className="visiting-letter__panel visiting-letter__panel--centre" ref={(panel) => { panelRefs.current[1] = panel }}>
                <h3>Collection</h3>
                <p>Build a basket, then choose a sample collection period.</p>
                <a className="button button--ink" href="#shop">Back to the market</a>
              </section>
              <div className="visiting-letter__fold visiting-letter__fold--lower" onTransitionEnd={(event) => advance(event, 'lower')}>
                <section className="visiting-letter__panel visiting-letter__panel--lower" ref={(panel) => { panelRefs.current[2] = panel }}>
                  <h3>Getting here</h3>
                  <p>This is a demonstration farm, so there is no visitor address.</p>
                  <details onToggle={(event) => onInterfaceSound(event.currentTarget.open ? 'details-open' : 'details-close')}>
                    <summary>What a real visiting page would include</summary>
                    <p>Directions, parking, step-free access and any gate or arrival instructions—using details confirmed by the business.</p>
                  </details>
                </section>
                <span className="visiting-letter__back" aria-hidden="true" />
              </div>
            </div>
          </div>
          <div className="visiting-envelope__shell" aria-hidden="true">
            <span className="visiting-envelope__back" />
            <span className="visiting-envelope__flap" onTransitionEnd={(event) => advance(event, 'flap')} />
            <span className="visiting-envelope__front" />
            <span className="visiting-envelope__invitation">{expanded ? 'Fold visiting letter' : 'Open visiting letter'}</span>
          </div>
          <button
            className="visiting-envelope__button"
            type="button"
            aria-expanded={expanded}
            aria-controls="visiting-letter"
            aria-label={buttonLabel}
            title={buttonLabel}
            disabled={phase !== 'closed' && phase !== 'open'}
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
