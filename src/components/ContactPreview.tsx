import { useMemo, useRef, useState } from 'react'

export function ContactPreview() {
  const [brief, setBrief] = useState('')
  const [copied, setCopied] = useState(false)
  const summaryRef = useRef<HTMLPreElement>(null)
  const summary = useMemo(
    () => `Website discussion brief\n\nBusiness: [add your business name]\nWhat I need: ${brief.trim() || '[describe what you would like the website to help with]'}\n\nContact destination: not configured in this demonstration`,
    [brief],
  )

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
    } catch {
      const selection = window.getSelection()
      const range = document.createRange()
      if (summaryRef.current && selection) {
        range.selectNodeContents(summaryRef.current)
        selection.removeAllRanges()
        selection.addRange(range)
      }
      setCopied(false)
    }
  }

  return (
    <section className="contact" id="contact" aria-labelledby="contact-heading">
      <div className="contact-copy">
        <p className="eyebrow">Contact demonstration · nothing is sent</p>
        <h2 id="contact-heading">Tell me about your business.</h2>
        <p>Start a plain-language brief here. The copy action demonstrates a useful handoff without pretending that message delivery is configured.</p>
        <p className="contact-note">An approved public identity, service contact destination, commercial scope, support and pricing terms, and any backend remain intentionally unconfigured.</p>
      </div>
      <div className="brief-builder">
        <label htmlFor="brief">What should your website make easier?</label>
        <textarea
          id="brief"
          rows={5}
          value={brief}
          onChange={(event) => {
            setBrief(event.target.value)
            setCopied(false)
          }}
          placeholder="For example: keep our opening information current and make seasonal produce easy to browse."
        />
        <pre ref={summaryRef} className="brief-summary" tabIndex={0}>{summary}</pre>
        <button className="button button--ink" type="button" onClick={copySummary}>
          {copied ? 'Brief copied' : 'Copy website brief'}
        </button>
        <span className="select-note">The summary stays selectable if clipboard access is unavailable.</span>
      </div>
    </section>
  )
}
