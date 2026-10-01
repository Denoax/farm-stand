import { useMemo, useRef, useState } from 'react'
import type { CommerceSound } from '../audio/useSoundscape'
import { Logo } from './Logo'

interface WebsiteNoteFields {
  businessName: string
  brief: string
}

export function formatWebsiteNote({ businessName, brief }: WebsiteNoteFields) {
  const name = businessName.trim()
  const message = brief.trim()
  return [
    'Farm Stand website note',
    ...(name ? ['', `Business name: ${name}`] : []),
    '',
    'What should the website help with?',
    message,
  ].join('\n')
}

type CopyStatus = 'idle' | 'copying' | 'copied' | 'failed'

export function ContactPreview({ onInterfaceSound }: { onInterfaceSound: (kind: CommerceSound) => boolean }) {
  const [businessName, setBusinessName] = useState('')
  const [brief, setBrief] = useState('')
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')
  const [validationMessage, setValidationMessage] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const briefRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLPreElement>(null)
  const revisionRef = useRef(0)
  const attemptRef = useRef(0)
  const copyingRef = useRef(false)
  const summary = useMemo(() => formatWebsiteNote({ businessName, brief }), [businessName, brief])

  const resetTransientState = () => {
    revisionRef.current += 1
    setCopyStatus((current) => current === 'copying' ? current : 'idle')
    setValidationMessage('')
  }

  const requireMessage = () => {
    if (brief.trim()) return true
    setValidationMessage('Add a short note about what the website should help with.')
    setCopyStatus('idle')
    briefRef.current?.focus()
    return false
  }

  const selectPreview = () => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const selection = window.getSelection()
      if (!previewRef.current || !selection) return
      const range = document.createRange()
      range.selectNodeContents(previewRef.current)
      selection.removeAllRanges()
      selection.addRange(range)
      previewRef.current.focus()
    }))
  }

  const copySummary = async () => {
    if (!requireMessage() || copyingRef.current) return
    const attempt = attemptRef.current + 1
    attemptRef.current = attempt
    const revision = revisionRef.current
    const snapshot = summary
    copyingRef.current = true
    setValidationMessage('')
    setCopyStatus('copying')
    try {
      await navigator.clipboard.writeText(snapshot)
      if (attemptRef.current !== attempt) return
      copyingRef.current = false
      if (revisionRef.current !== revision) return setCopyStatus('idle')
      setCopyStatus('copied')
      onInterfaceSound('confirm')
    } catch {
      if (attemptRef.current !== attempt) return
      copyingRef.current = false
      if (revisionRef.current !== revision) return setCopyStatus('idle')
      setCopyStatus('failed')
      setPreviewOpen(true)
      selectPreview()
    }
  }

  const downloadSummary = () => {
    if (!requireMessage()) return
    try {
      const blob = new Blob([summary], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'farm-stand-website-note.txt'
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
      setValidationMessage('')
    } catch {
      setValidationMessage('A local download could not be prepared. Your note is still available in the preview.')
      setPreviewOpen(true)
    }
  }

  return (
    <section className="after-section contact" id="contact" aria-labelledby="contact-heading">
      <div className="postcard">
        <div className="postcard__heading">
          <p className="eyebrow">A project note</p>
          <h2 id="contact-heading">Tell me about your place.</h2>
          <p>A farm shop, a workshop, a small local business—start with what you want the website to make easier.</p>
        </div>

        <label className="postcard__business" htmlFor="business-name">
          <span className="postcard__field-label">Business name <span>(optional)</span></span>
          <input
            id="business-name"
            type="text"
            value={businessName}
            autoComplete="organization"
            onChange={(event) => {
              resetTransientState()
              setBusinessName(event.target.value)
            }}
          />
        </label>

        <label className="postcard__message" htmlFor="brief">What should your website help with?</label>
        <textarea
          id="brief"
          ref={briefRef}
          rows={7}
          value={brief}
          aria-invalid={Boolean(validationMessage)}
          aria-describedby={validationMessage ? 'brief-feedback' : 'brief-boundary'}
          onChange={(event) => {
            resetTransientState()
            setBrief(event.target.value)
          }}
          placeholder="For example: keep our opening information current and make seasonal produce easy to browse."
        />

        <div className="postcard__address" aria-hidden="true">
          <Logo />
          <span>Farm Stand</span>
          <span>Website demonstration</span>
        </div>

        <div className="postcard__actions">
          <button className="button button--ink" type="button" onClick={copySummary} disabled={copyStatus === 'copying'}>
            {copyStatus === 'copying' ? 'Copying…' : 'Copy website note'}
          </button>
          <button className="text-button" type="button" onClick={downloadSummary}>Download note (.txt)</button>
          <p id="brief-boundary">Your note stays in this page. Nothing is sent.</p>
          <p className="postcard__feedback" id="brief-feedback" aria-live="polite">
            {validationMessage || (copyStatus === 'copied' ? 'Note copied' : copyStatus === 'failed' ? 'Clipboard unavailable. The note is selected below; download is also available.' : '')}
          </p>
        </div>

        <details className="postcard__preview" open={previewOpen} onToggle={(event) => setPreviewOpen(event.currentTarget.open)}>
          <summary>Preview the note</summary>
          <pre ref={previewRef} className="brief-summary" tabIndex={0}>{summary}</pre>
        </details>

        {copyStatus === 'copied' && <span className="postcard__stamp" aria-hidden="true">Copied</span>}
      </div>
    </section>
  )
}
