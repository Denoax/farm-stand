import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { productById } from '../content/catalogue'

interface ScreenFrame {
  left: number
  top: number
  width: number
  height: number
}

interface StandShopBridgeProps {
  enabled: boolean
  progressRef: React.RefObject<number>
}

const appleImage = productById.get('apple')?.image ?? ''
const clamp = (value: number, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value))
const mix = (start: number, end: number, progress: number) => start + (end - start) * progress

export function StandShopBridge({ enabled, progressRef }: StandShopBridgeProps) {
  const bridgeRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const bridge = bridgeRef.current
    const image = imageRef.current
    if (!bridge || !image) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let appleFrame: ScreenFrame | null = null
    let targetDocumentFrame: ScreenFrame | null = null
    let frame = 0
    let hiddenTarget: HTMLImageElement | null = null
    let bridgeImageFailed = false

    const restoreTarget = () => {
      if (hiddenTarget) hiddenTarget.style.visibility = ''
      hiddenTarget = null
    }

    const hide = () => {
      bridge.hidden = true
      restoreTarget()
    }

    const update = () => {
      frame = 0
      const progress = progressRef.current ?? 0
      const targetPicture = document.querySelector<HTMLElement>('#product-apple .product-picture')
      const targetImage = targetPicture?.querySelector<HTMLImageElement>('img') ?? null
      if (!enabled || reducedMotion.matches || bridgeImageFailed || !appleFrame || !targetPicture || progress <= 0.58 || progress >= 0.985) {
        hide()
        return
      }

      if (!targetDocumentFrame) {
        const measured = targetPicture.getBoundingClientRect()
        targetDocumentFrame = {
          left: measured.left + window.scrollX,
          top: measured.top + window.scrollY,
          width: measured.width,
          height: measured.height,
        }
      }
      const target = {
        left: targetDocumentFrame.left - window.scrollX,
        top: targetDocumentFrame.top - window.scrollY,
        width: targetDocumentFrame.width,
        height: targetDocumentFrame.height,
      }
      if (!target.width || !target.height) {
        hide()
        return
      }

      if (!image.hasAttribute('src') && appleImage) image.src = appleImage
      if (!image.complete || image.naturalWidth === 0) {
        hide()
        return
      }
      if (hiddenTarget !== targetImage) {
        restoreTarget()
        hiddenTarget = targetImage
      }
      if (hiddenTarget) hiddenTarget.style.visibility = 'hidden'

      const raw = clamp((progress - 0.58) / (0.97 - 0.58))
      const eased = 1 - Math.pow(1 - raw, 3)
      const ownerTransfer = clamp((progress - 0.58) / 0.1)
      const left = mix(appleFrame.left, target.left, eased)
      const top = mix(appleFrame.top, target.top, eased)
      const width = mix(appleFrame.width, target.width, eased)
      const height = mix(appleFrame.height, target.height, eased)

      bridge.hidden = false
      bridge.dataset.phase = raw > 0.9 ? 'arriving' : raw > 0.12 ? 'travelling' : 'leaving-stand'
      bridge.style.left = `${left}px`
      bridge.style.top = `${top}px`
      bridge.style.width = `${width}px`
      bridge.style.height = `${height}px`
      bridge.style.opacity = String(ownerTransfer)
      bridge.style.borderRadius = `${mix(Math.min(width, height) / 2, 18, eased)}px`
      bridge.style.clipPath = `ellipse(${mix(37, 75, eased)}% ${mix(40, 75, eased)}% at 50% 52%)`
      image.style.transform = `scale(${mix(1.62, 1, eased)})`
    }

    const scheduleUpdate = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    const onAppleFrame = (event: Event) => {
      appleFrame = (event as CustomEvent<ScreenFrame>).detail
      scheduleUpdate()
    }
    const onMotionChange = () => scheduleUpdate()
    const onImageLoad = () => scheduleUpdate()
    const onImageError = () => {
      bridgeImageFailed = true
      hide()
    }

    window.addEventListener('farmsceneappleframe', onAppleFrame)
    window.addEventListener('farmstageprogress', scheduleUpdate)
    const onResize = () => {
      targetDocumentFrame = null
      scheduleUpdate()
    }
    window.addEventListener('resize', onResize)
    reducedMotion.addEventListener('change', onMotionChange)
    image.addEventListener('load', onImageLoad)
    image.addEventListener('error', onImageError)
    scheduleUpdate()
    return () => {
      cancelAnimationFrame(frame)
      restoreTarget()
      window.removeEventListener('farmsceneappleframe', onAppleFrame)
      window.removeEventListener('farmstageprogress', scheduleUpdate)
      window.removeEventListener('resize', onResize)
      reducedMotion.removeEventListener('change', onMotionChange)
      image.removeEventListener('load', onImageLoad)
      image.removeEventListener('error', onImageError)
    }
  }, [enabled, progressRef])

  return createPortal(
    <div ref={bridgeRef} className="stand-shop-bridge" aria-hidden="true" inert hidden>
      <img ref={imageRef} alt="" />
    </div>,
    document.body,
  )
}
