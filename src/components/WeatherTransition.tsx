import { useEffect, useRef } from 'react'

interface WeatherTransitionProps {
  motionPaused: boolean
  onToggleMotion: () => void
}

const rainDrops = Array.from({ length: 20 }, (_, index) => ({
  left: `${(index * 37 + 11) % 100}%`,
  delay: `${-((index * 13) % 17) / 10}s`,
  duration: `${0.75 + ((index * 7) % 8) / 10}s`,
}))

export function WeatherTransition({ motionPaused, onToggleMotion }: WeatherTransitionProps) {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    let frame = 0
    const update = () => {
      frame = 0
      const bounds = section.getBoundingClientRect()
      const range = Math.max(section.offsetHeight - innerHeight, 1)
      const progress = Math.min(1, Math.max(0, -bounds.top / range))
      section.style.setProperty('--weather-progress', progress.toFixed(4))
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

  return (
    <section className="weather-story" aria-labelledby="weather-heading" ref={sectionRef}>
      <div className="weather-story__sticky">
        <div className="weather-story__rain" aria-hidden="true">
          {rainDrops.map((drop, index) => <i key={index} style={{ left: drop.left, animationDelay: drop.delay, animationDuration: drop.duration }} />)}
        </div>
        <div className="weather-story__sun" aria-hidden="true" />
        <div className="weather-story__copy">
          <p className="eyebrow eyebrow--light">From the stand to the fields</p>
          <h2 id="weather-heading">A shower passes. The farm carries on.</h2>
          <p>One short change in weather takes the story from what is available today to the life around the farm.</p>
          <div className="weather-story__actions">
            <a className="text-link" href="#farm-life">Skip to farm life ↓</a>
            <button type="button" onClick={onToggleMotion}>{motionPaused ? 'Use full motion' : 'Pause motion'}</button>
          </div>
        </div>
        <div className="weather-story__waterline" aria-hidden="true" />
      </div>
    </section>
  )
}
