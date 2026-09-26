import { useState } from 'react'

const defaultHours = { opens: '09:00', closes: '13:00' }

function formatTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return 'Choose a time'
  const [hours, minutes] = value.split(':').map(Number)
  const period = hours >= 12 ? 'pm' : 'am'
  const displayHour = hours % 12 || 12
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`
}

export function TryUpdate() {
  const [hours, setHours] = useState(defaultHours)

  return (
    <section className="try-update" aria-labelledby="try-update-heading">
      <div className="try-update__editor">
        <p className="eyebrow">Try an update</p>
        <h3 id="try-update-heading">Change sample collection hours.</h3>
        <div className="try-update__fields">
          <label>
            Opens
            <input type="time" value={hours.opens} onChange={(event) => setHours((current) => ({ ...current, opens: event.target.value }))} />
          </label>
          <label>
            Closes
            <input type="time" value={hours.closes} onChange={(event) => setHours((current) => ({ ...current, closes: event.target.value }))} />
          </label>
        </div>
        <button className="text-button" type="button" onClick={() => setHours(defaultHours)}>Reset sample</button>
      </div>
      <div className="try-update__preview" aria-live="polite">
        <p className="eyebrow">Customer-facing preview</p>
        <strong>Saturday collection</strong>
        <span>{formatTime(hours.opens)}–{formatTime(hours.closes)}</span>
        <p>Preview only — nothing is saved or published.</p>
      </div>
    </section>
  )
}
