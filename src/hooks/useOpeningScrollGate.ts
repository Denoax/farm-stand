import { useCallback, useEffect, useRef, useState } from 'react'

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
  const [active, setActive] = useState(false)
  const activeRef = useRef(false)
  const storedRef = useRef<StoredDocumentState | undefined>(undefined)
  const watchdogRef = useRef<number | undefined>(undefined)

  const release = useCallback((updateState = true) => {
    if (watchdogRef.current !== undefined) window.clearTimeout(watchdogRef.current)
    watchdogRef.current = undefined
    if (!activeRef.current) return
    activeRef.current = false

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
    if (updateState) setActive(false)
  }, [])

  const begin = useCallback((onWatchdog: () => void) => {
    if (activeRef.current) return
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
    activeRef.current = true
    setActive(true)
    root.style.scrollBehavior = 'auto'
    root.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `${-scrollY}px`
    body.style.left = `${-scrollX}px`
    body.style.right = '0'
    body.style.width = 'auto'
    const compensation = scrollbarWidth()
    if (compensation) body.style.paddingRight = `${compensation}px`
    watchdogRef.current = window.setTimeout(onWatchdog, watchdogMs)
  }, [watchdogMs])

  useEffect(() => () => release(false), [release])

  return { active, activeRef, begin, release }
}
