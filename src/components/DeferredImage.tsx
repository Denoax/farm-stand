import { useEffect, useMemo, useRef, useState } from 'react'

interface DeferredImageProps {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  style?: React.CSSProperties
  eager?: boolean
  fallbackLabel?: string
}

type ImageState = 'deferred' | 'loading' | 'decoded' | 'failed'

function retrySource(src: string, attempt: number) {
  if (attempt === 0) return src
  const url = new URL(src, document.baseURI)
  url.searchParams.set('image-retry', String(attempt))
  return url.href
}

export function DeferredImage({ src, alt, width, height, className, style, eager = false, fallbackLabel = 'Image unavailable' }: DeferredImageProps) {
  const imageRef = useRef<HTMLImageElement>(null)
  const sourceRef = useRef(src)
  const [shouldLoad, setShouldLoad] = useState(eager)
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<ImageState>(eager ? 'loading' : 'deferred')
  sourceRef.current = src

  useEffect(() => {
    setAttempt(0)
    setShouldLoad(eager)
    setState(eager ? 'loading' : 'deferred')
  }, [src])

  useEffect(() => {
    if (!eager) return
    setShouldLoad(true)
    setState((current) => current === 'decoded' ? current : 'loading')
  }, [eager])

  useEffect(() => {
    if (eager || shouldLoad) return
    const image = imageRef.current
    if (!image || !('IntersectionObserver' in window)) {
      setShouldLoad(true)
      setState('loading')
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setShouldLoad(true)
      setState('loading')
      observer.disconnect()
    }, { rootMargin: '320px 0px' })
    observer.observe(image)
    return () => observer.disconnect()
  }, [eager, shouldLoad])

  const requestSrc = useMemo(() => shouldLoad ? retrySource(src, attempt) : undefined, [attempt, shouldLoad, src])

  const requestFailed = (requestIdentity: string | undefined) => {
    if (!requestIdentity || sourceRef.current !== src || requestSrc !== requestIdentity) return
    if (attempt === 0) {
      setAttempt(1)
      setState('loading')
      return
    }
    setState('failed')
  }

  const verifyDecoded = async (image: HTMLImageElement, requestIdentity: string | undefined) => {
    if (!requestIdentity) return
    try {
      await image.decode()
    } catch {
      requestFailed(requestIdentity)
      return
    }
    const expected = new URL(requestIdentity, document.baseURI).href
    if (sourceRef.current !== src || requestSrc !== requestIdentity || image.currentSrc !== expected) return
    if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
      requestFailed(requestIdentity)
      return
    }
    setState('decoded')
  }

  const retry = () => {
    setAttempt((current) => current + 1)
    setShouldLoad(true)
    setState('loading')
  }

  return (
    <>
      <img
        ref={imageRef}
        src={state === 'failed' ? undefined : requestSrc}
        alt={state === 'failed' ? '' : alt}
        width={width}
        height={height}
        className={className}
        style={style}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        data-image-state={state}
        data-image-source={src}
        data-image-attempt={attempt}
        onLoad={(event) => { void verifyDecoded(event.currentTarget, requestSrc) }}
        onError={() => requestFailed(requestSrc)}
      />
      {state === 'failed' && (
        <span className="media-fallback" role="group" aria-label={`${fallbackLabel}. ${alt}`}>
          <span>{fallbackLabel}</span>
          <button className="text-button" type="button" onClick={retry}>Retry image</button>
        </span>
      )}
    </>
  )
}
