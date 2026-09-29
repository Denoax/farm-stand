import { useCallback, useEffect, useRef, useState } from 'react'

export type ScrollGateOwner = 'opening' | 'handoff'

interface StoredDocumentState {
  scrollX: number
  scrollY: number
  rootOverflow: string
  rootScrollBehavior: string
  bodyPosition: string
  bodyTop: string
  bodyLeft: string
  bodyRight: string
  bodyWidth: string
  bodyPaddingRight: string
}

const scrollbarWidth = () => Math.max(0, window.innerWidth - document.documentElement.clientWidth)

export function useOpeningScrollGate(watchdogMs: number) {
  const [owner, setOwner] = useState<ScrollGateOwner | null>(null)
  const ownerRef = useRef<ScrollGateOwner | null>(null)
  const storedRef = useRef<StoredDocumentState | undefined>(undefined)
  const watchdogRef = useRef<number | undefined>(undefined)

  const release = useCallback((expectedOwner?: ScrollGateOwner, updateState = true) => {
    if (expectedOwner && ownerRef.current !== expectedOwner) return false
    if (watchdogRef.current !== undefined) window.clearTimeout(watchdogRef.current)
    watchdogRef.current = undefined
    if (!ownerRef.current) return false
    ownerRef.current = null

    const stored = storedRef.current
    storedRef.current = undefined
    if (stored) {
      const root = document.documentElement
      const body = document.body
      root.style.overflow = stored.rootOverflow
      root.style.scrollBehavior = stored.rootScrollBehavior
      body.style.position = stored.bodyPosition
      body.style.top = stored.bodyTop
      body.style.left = stored.bodyLeft
      body.style.right = stored.bodyRight
      body.style.width = stored.bodyWidth
      body.style.paddingRight = stored.bodyPaddingRight
      window.scrollTo(stored.scrollX, stored.scrollY)
    }
    delete document.documentElement.dataset.scrollGateOwner
    if (updateState) setOwner(null)
    return true
  }, [])

  const begin = useCallback((nextOwner: ScrollGateOwner, onWatchdog: () => void, timeoutMs = watchdogMs) => {
    if (ownerRef.current === nextOwner) return true
    if (ownerRef.current) return false
    const root = document.documentElement
    const body = document.body
    const scrollX = window.scrollX
    const scrollY = window.scrollY
    storedRef.current = {
      scrollX,
      scrollY,
      rootOverflow: root.style.overflow,
      rootScrollBehavior: root.style.scrollBehavior,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyPaddingRight: body.style.paddingRight,
    }
    ownerRef.current = nextOwner
    setOwner(nextOwner)
    root.dataset.scrollGateOwner = nextOwner
    root.style.scrollBehavior = 'auto'
    root.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `${-scrollY}px`
    body.style.left = `${-scrollX}px`
    body.style.right = '0'
    body.style.width = 'auto'
    const compensation = scrollbarWidth()
    if (compensation) body.style.paddingRight = `${compensation}px`
    watchdogRef.current = window.setTimeout(onWatchdog, timeoutMs)
    return true
  }, [watchdogMs])

  const moveTo = useCallback((expectedOwner: ScrollGateOwner, scrollX: number, scrollY: number) => {
    if (ownerRef.current !== expectedOwner || !storedRef.current) return false
    storedRef.current.scrollX = scrollX
    storedRef.current.scrollY = scrollY
    document.body.style.top = `${-scrollY}px`
    document.body.style.left = `${-scrollX}px`
    return true
  }, [])

  useEffect(() => () => { release(undefined, false) }, [release])

  return { active: owner !== null, activeRef: ownerRef, owner, begin, moveTo, release }
}
