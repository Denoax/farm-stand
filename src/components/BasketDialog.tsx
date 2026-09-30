import { useEffect, useRef, useState, type Dispatch } from 'react'
import type { CommerceSound } from '../audio/useSoundscape'
import { formatSampleCad } from '../content/catalogue'
import { basketCount, basketLines, basketQuantityBounds, basketSubtotal, type BasketAction, type BasketLine, type BasketState } from '../state/basket'
import { DeferredImage } from './DeferredImage'

interface BasketDialogProps {
  basket: BasketState
  dispatch: Dispatch<BasketAction>
  open: boolean
  onClose: () => void
  onSound: (kind: CommerceSound) => boolean
  returnFocus: React.RefObject<HTMLButtonElement | null>
}

type CheckoutStep = 'basket' | 'collection' | 'checkout' | 'complete'
type CollectionId = 'weekday' | 'saturday'

const COLLECTION_PERIODS: Record<CollectionId, string> = {
  weekday: 'Weekday stand · example 3–6 pm',
  saturday: 'Saturday pickup · example 9 am–1 pm',
}

function BasketLineThumbnail({ line }: { line: BasketLine }) {
  return (
    <span className="basket-line-image basket-line-media" aria-hidden="true">
      <DeferredImage src={line.product.image} alt="" width={120} height={90} eager style={{ objectPosition: line.product.imagePosition }} fallbackLabel={`${line.product.name} image unavailable`} />
    </span>
  )
}

function QuantityEditor({ line, dispatch, onSound }: { line: BasketLine; dispatch: Dispatch<BasketAction>; onSound: (kind: CommerceSound) => boolean }) {
  const label = line.variantLabel ? `${line.product.name}, ${line.variantLabel}` : line.product.name
  return (
    <div className="basket-quantity" aria-label={`Quantity for ${label}`}>
      <button type="button" disabled={line.quantity <= basketQuantityBounds.min} onClick={() => { dispatch({ type: 'set', lineId: line.lineId, quantity: line.quantity - 1 }); onSound('quantity') }} aria-label={`Decrease ${label} quantity`}>−</button>
      <output aria-live="polite">{line.quantity}</output>
      <button type="button" disabled={line.quantity >= basketQuantityBounds.max} onClick={() => { dispatch({ type: 'set', lineId: line.lineId, quantity: line.quantity + 1 }); onSound('quantity') }} aria-label={`Increase ${label} quantity`}>+</button>
    </div>
  )
}

export function BasketDialog({ basket, dispatch, open, onClose, onSound, returnFocus }: BasketDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const completionGuardRef = useRef(false)
  const stepHeadingRef = useRef<HTMLHeadingElement>(null)
  const previousStepRef = useRef<CheckoutStep>('basket')
  const [step, setStep] = useState<CheckoutStep>('basket')
  const [collectionId, setCollectionId] = useState<CollectionId>('weekday')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [emailAttempted, setEmailAttempted] = useState(false)
  const [completedBasketSignature, setCompletedBasketSignature] = useState<string>()
  const [confirmReset, setConfirmReset] = useState(false)
  const [removedLine, setRemovedLine] = useState<BasketLine | null>(null)
  const lines = basketLines(basket)
  const subtotal = basketSubtotal(basket)
  const basketSignature = lines.map((line) => `${line.lineId}:${line.quantity}:${line.product.samplePriceMinor}`).join('|')
  const emailValid = !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    if (!lines.length) {
      setStep('basket')
      setCompletedBasketSignature(undefined)
      return
    }
    if (completedBasketSignature && completedBasketSignature !== basketSignature) {
      setCompletedBasketSignature(undefined)
      if (step === 'complete') setStep('basket')
    }
  }, [basketSignature, completedBasketSignature, lines.length, step])

  useEffect(() => {
    if (!open || previousStepRef.current === step) return
    previousStepRef.current = step
    const frame = requestAnimationFrame(() => {
      if (step === 'basket') document.getElementById('basket-heading')?.focus()
      else stepHeadingRef.current?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [open, step])

  const chooseStep = (next: CheckoutStep) => {
    completionGuardRef.current = false
    setStep(next)
    dialogRef.current?.querySelector<HTMLElement>('.basket-drawer__scroll')?.scrollTo({ top: 0 })
  }

  const completePreview = () => {
    if (completionGuardRef.current || step !== 'checkout') return
    setEmailAttempted(true)
    if (!emailValid || !lines.length) return
    completionGuardRef.current = true
    setCompletedBasketSignature(basketSignature)
    setStep('complete')
    onSound('confirm')
  }

  const clearBasket = () => {
    dispatch({ type: 'reset' })
    setRemovedLine(null)
    setConfirmReset(false)
    setCollectionId('weekday')
    setName('')
    setEmail('')
    setNote('')
    setEmailAttempted(false)
    setCompletedBasketSignature(undefined)
    setStep('basket')
    onSound('clear')
  }

  const stepTitle = step === 'basket' ? 'Your basket' : step === 'collection' ? 'Collection' : step === 'checkout' ? 'Checkout' : 'Preview complete'

  return (
    <dialog className="basket-dialog basket-drawer" ref={dialogRef} aria-labelledby="basket-heading" data-checkout-step={step} onClose={() => {
      setConfirmReset(false)
      onClose()
      returnFocus.current?.focus()
    }}>
      <div className="dialog-bar basket-drawer__header">
        <div className="basket-drawer__title"><p className="eyebrow">Demonstration basket</p><h2 id="basket-heading" tabIndex={-1}>{stepTitle} <span>{basketCount(basket)}</span></h2></div>
        <button className="icon-button" type="button" onClick={() => dialogRef.current?.close()} aria-label="Close basket">×</button>
      </div>
      <div className="basket-drawer__scroll">
        {removedLine && step === 'basket' && (
          <div className="basket-undo" role="status">
            <span>{removedLine.product.name}{removedLine.variantLabel ? `, ${removedLine.variantLabel}` : ''} removed.</span>
            <button className="text-button" type="button" onClick={() => { dispatch({ type: 'set', lineId: removedLine.lineId, quantity: removedLine.quantity }); setRemovedLine(null); onSound('add') }}>Undo</button>
          </div>
        )}
        {lines.length === 0 ? (
          <div className="basket-empty"><p>Your demonstration basket is empty.</p><button className="text-button" type="button" onClick={() => dialogRef.current?.close()}>Continue browsing</button></div>
        ) : step === 'basket' ? (
          <>
            <ul className="basket-lines">
              {lines.map((line) => (
                <li key={line.lineId}>
                  <BasketLineThumbnail line={line} />
                  <div className="basket-line-copy"><strong>{line.product.name}</strong>{line.variantLabel && <span>Size: {line.variantLabel}</span>}<span>{line.product.unit}</span><span>{formatSampleCad(line.product.samplePriceMinor)} sample price × {line.quantity}</span></div>
                  <strong className="line-total">{formatSampleCad(line.product.samplePriceMinor * line.quantity)}</strong>
                  <div className="basket-line-actions"><QuantityEditor line={line} dispatch={dispatch} onSound={onSound} /><button className="text-button text-button--danger" type="button" onClick={() => { setRemovedLine(line); dispatch({ type: 'remove', lineId: line.lineId }); onSound('remove') }}>Remove</button></div>
                </li>
              ))}
            </ul>
            <div className="reset-basket">{!confirmReset ? <button className="text-button text-button--danger" type="button" onClick={() => setConfirmReset(true)}>Clear demonstration basket</button> : <div role="group" aria-label="Confirm clearing the basket"><span>Remove every item?</span><button type="button" onClick={clearBasket}>Yes, clear it</button><button type="button" onClick={() => setConfirmReset(false)}>Keep items</button></div>}</div>
          </>
        ) : step === 'collection' ? (
          <section className="checkout-stage" aria-labelledby="collection-step-heading">
            <div className="checkout-steps" aria-label="Preview progress"><strong aria-current="step">1. Collection</strong><span>2. Checkout</span></div>
            <h3 ref={stepHeadingRef} id="collection-step-heading" tabIndex={-1}>Choose an illustrative collection period.</h3>
            <p className="checkout-summary-line">{basketCount(basket)} items · {formatSampleCad(subtotal)} CAD sample subtotal</p>
            <fieldset className="collection-choices"><legend>Collection period</legend>{(Object.entries(COLLECTION_PERIODS) as [CollectionId, string][]).map(([id, label]) => <label key={id}><input type="radio" name="collection" value={id} checked={collectionId === id} onChange={() => { setCollectionId(id); setCompletedBasketSignature(undefined); onSound('filter') }} /> <span>{label}</span></label>)}</fieldset>
            <p className="collection-basket-note">Changing this preview never removes, substitutes, or reprices basket items. A real shop would re-check availability and ask before changing a basket.</p>
          </section>
        ) : step === 'checkout' ? (
          <section className="checkout-stage" aria-labelledby="checkout-step-heading">
            <div className="checkout-steps" aria-label="Preview progress"><span>1. Collection</span><strong aria-current="step">2. Checkout</strong></div>
            <div className="checkout-heading"><div><h3 ref={stepHeadingRef} id="checkout-step-heading" tabIndex={-1}>Review the local preview.</h3><p>{COLLECTION_PERIODS[collectionId]}</p></div><button className="text-button" type="button" onClick={() => chooseStep('basket')}>Edit basket</button></div>
            <ul className="checkout-lines">{lines.map((line) => <li key={line.lineId}><BasketLineThumbnail line={line} /><span><strong>{line.product.name}</strong>{line.variantLabel && <small>Size: {line.variantLabel}</small>}<small>{line.quantity} × {formatSampleCad(line.product.samplePriceMinor)}</small></span><b>{formatSampleCad(line.product.samplePriceMinor * line.quantity)}</b></li>)}</ul>
            <div className="checkout-details">
              <div className="checkout-details__heading"><div><h3>Optional sample details</h3><p>Kept only in this open demonstration.</p></div><button className="text-button" type="button" onClick={() => { setName('Alex Example'); setEmail('alex@example.com'); setNote('Please have the sample collection ready at the stand.'); setEmailAttempted(false); setCompletedBasketSignature(undefined); onSound('filter') }}>Use sample details</button></div>
              <label htmlFor="checkout-name">Name <span>optional</span><input id="checkout-name" autoComplete="off" value={name} onChange={(event) => { setName(event.target.value); setCompletedBasketSignature(undefined) }} /></label>
              <label htmlFor="checkout-email">Email <span>optional</span><input id="checkout-email" type="email" autoComplete="off" value={email} aria-invalid={emailAttempted && !emailValid ? 'true' : undefined} aria-describedby="checkout-email-note" onChange={(event) => { setEmail(event.target.value); setEmailAttempted(false); setCompletedBasketSignature(undefined) }} /></label>
              <p id="checkout-email-note" className={emailAttempted && !emailValid ? 'field-error' : 'field-note'}>{emailAttempted && !emailValid ? 'Enter an email in the form name@example.com, or leave it blank.' : 'No message is sent from this demonstration.'}</p>
              <label htmlFor="checkout-note">Pickup note <span>optional</span><textarea id="checkout-note" rows={3} value={note} onChange={(event) => { setNote(event.target.value); setCompletedBasketSignature(undefined) }} /></label>
            </div>
          </section>
        ) : (
          <section className="checkout-stage checkout-complete" aria-labelledby="preview-complete-heading" role="status">
            <p className="checkout-complete__mark" aria-hidden="true">✓</p>
            <h3 ref={stepHeadingRef} id="preview-complete-heading" tabIndex={-1}>Preview complete</h3>
            <p><strong>{COLLECTION_PERIODS[collectionId]}</strong></p>
            <ul>{lines.map((line) => <li key={line.lineId}><span>{line.quantity} × {line.product.name}{line.variantLabel ? ` · ${line.variantLabel}` : ''}</span><strong>{formatSampleCad(line.product.samplePriceMinor * line.quantity)}</strong></li>)}</ul>
            <p className="checkout-summary-line">Illustrative subtotal · {formatSampleCad(subtotal)} CAD</p>
            {(name || email || note) && <div className="checkout-private-summary"><strong>Optional sample details</strong>{name && <span>{name}</span>}{email && <span>{email}</span>}{note && <span>{note}</span>}</div>}
            <p className="collection-result"><strong>Nothing was sent, reserved or charged.</strong> This completed only the local website preview, and your basket is unchanged.</p>
          </section>
        )}
      </div>
      <div className="basket-drawer__footer">
        <div className="basket-total"><span>Illustrative subtotal · CAD</span><strong>{formatSampleCad(subtotal)}</strong></div>
        <div className="checkout-actions">
          {step === 'basket' && <button className="button button--sun" type="button" disabled={!lines.length} onClick={() => { chooseStep('collection'); onSound('details-open') }}>Choose collection</button>}
          {step === 'collection' && <><button className="text-button" type="button" onClick={() => chooseStep('basket')}>Back to basket</button><button className="button button--sun" type="button" onClick={() => { chooseStep('checkout'); onSound('details-open') }}>Continue to checkout</button></>}
          {step === 'checkout' && <><button className="text-button" type="button" onClick={() => chooseStep('collection')}>Back to collection</button><button className="button button--sun" type="button" onClick={completePreview}>Complete preview</button></>}
          {step === 'complete' && <><button className="text-button" type="button" onClick={() => chooseStep('checkout')}>Back to checkout</button><button className="button button--sun" type="button" onClick={() => dialogRef.current?.close()}>Continue browsing</button></>}
        </div>
      </div>
    </dialog>
  )
}
