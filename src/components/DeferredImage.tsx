import { useEffect, useRef, useState } from 'react'

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

export function DeferredImage({ src, alt, width, height, className, style, eager = false, fallbackLabel = 'Image unavailable' }: DeferredImageProps) {
  const imageRef = useRef<HTMLImageElement>(null)
  const [shouldLoad, setShouldLoad] = useState(eager)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (eager || shouldLoad) return
    const image = imageRef.current
    if (!image || !('IntersectionObserver' in window)) {
      setShouldLoad(true)
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setShouldLoad(true)
      observer.disconnect()
    }, { rootMargin: '320px 0px' })
    observer.observe(image)
    return () => observer.disconnect()
  }, [eager, shouldLoad])

  return (
    <>
      <img
        ref={imageRef}
        src={shouldLoad && !failed ? src : undefined}
        alt={failed ? '' : alt}
        width={width}
        height={height}
        className={className}
        style={style}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => setFailed(true)}
      />
      {failed && <span className="media-fallback" role="img" aria-label={`${fallbackLabel}. ${alt}`}>{fallbackLabel}</span>}
    </>
  )
}
