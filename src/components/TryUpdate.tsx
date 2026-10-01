import { useState } from 'react'
import type { CommerceSound } from '../audio/useSoundscape'

const defaultHours = { opens: '09:00', closes: '13:00' }

function parseTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return null
  const [hours, minutes] = value.split(':').map(Number)
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return hours * 60 + minutes
}

function formatTime(value: string) {
  const totalMinutes = parseTime(value)
  if (totalMinutes === null) return ''
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const period = hours >= 12 ? 'pm' : 'am'
  const displayHour = hours % 12 || 12
  return `${displayHour}:${minutes === 0 ? '00' : String(minutes).padStart(2, '0')} ${period}`
}

function validateHours(opens: string, closes: string) {
  const openingMinutes = parseTime(opens)
  const closingMinutes = parseTime(closes)
  if (openingMinutes === null || closingMinutes === null) return 'Enter complete opening and closing times.'
  if (closingMinutes <= openingMinutes) return 'Closing must be later than opening for this same-day example.'
  return ''
}

interface TryUpdateProps {
  onInterfaceSound: (kind: CommerceSound) => boolean
}

export function TryUpdate({ onInterfaceSound }: TryUpdateProps) {
  const [hours, setHours] = useState(defaultHours)
  const error = validateHours(hours.opens, hours.closes)
  const formattedRange = error ? 'Hours need checking' : `${formatTime(hours.opens)}–${formatTime(hours.closes)}`

  return (
    <section className="try-update" aria-labelledby="try-update-heading">
      <h3 id="try-update-heading">Sample Saturday hours</h3>
      <span className="hours-mask" aria-live="polite">
        <span className="hours-value" data-valid={error ? 'false' : 'true'} key={error ? 'invalid' : `${hours.opens}-${hours.closes}`}>{formattedRange}</span>
      </span>
      <details onToggle={(event) => onInterfaceSound(event.currentTarget.open ? 'details-open' : 'details-close')}>
        <summary>Try changing the hours</summary>
        <div className="try-update__fields">
          <label>
            Opens
            <input
              type="time"
              value={hours.opens}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'sample-hours-error' : undefined}
              onChange={(event) => setHours((current) => ({ ...current, opens: event.target.value }))}
            />
          </label>
          <label>
            Closes
            <input
              type="time"
              value={hours.closes}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'sample-hours-error' : undefined}
              onChange={(event) => setHours((current) => ({ ...current, closes: event.target.value }))}
            />
          </label>
        </div>
        {error && <p className="field-error" id="sample-hours-error" role="status">{error}</p>}
        <button
          className="text-button"
          type="button"
          onClick={() => {
            setHours(defaultHours)
            onInterfaceSound('clear')
          }}
        >Reset sample</button>
      </details>
    </section>
  )
}
