import { useEffect, useRef } from 'react'

export type LeafPhase = 'entering' | 'covered' | 'clearing'

interface LeafHandoffProps {
  phase: LeafPhase
  onEntered: () => void
  onCoverPresented: () => void
  onCleared: () => void
}

const panels = ['top', 'right', 'bottom', 'left'] as const

export function LeafHandoff({ phase, onEntered, onCoverPresented, onCleared }: LeafHandoffProps) {
  const presentedPhase = useRef<LeafPhase | undefined>(undefined)

  useEffect(() => {
    if (phase === 'entering') {
      const timeout = window.setTimeout(onEntered, 600)
      return () => window.clearTimeout(timeout)
    }
    if (phase === 'clearing') {
      const timeout = window.setTimeout(onCleared, 800)
      return () => window.clearTimeout(timeout)
    }
  }, [onCleared, onEntered, phase])

  useEffect(() => {
    if (phase !== 'covered' || presentedPhase.current === phase) return
    presentedPhase.current = phase
    let secondFrame = 0
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(onCoverPresented)
    })
    return () => {
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
    }
  }, [onCoverPresented, phase])

  return (
    <div className="leaf-handoff" aria-hidden="true" data-leaf-phase={phase}>
      {panels.map((panel) => (
        <div className={`leaf-handoff__panel leaf-handoff__panel--${panel}`} key={panel}>
          <img src={`${import.meta.env.BASE_URL}media/leaves/leaf-canopy.webp`} alt="" />
        </div>
      ))}
    </div>
  )
}
