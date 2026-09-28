import { useEffect, type CSSProperties } from 'react'

interface LeafHandoffProps {
  active: boolean
  onComplete: () => void
}

type LeafStyle = CSSProperties & Record<`--${string}`, string | number>

const leaves: Array<{
  sprite: 'a' | 'b' | 'c' | 'd'
  x: number
  y: number
  size: number
  fromX: number
  fromY: number
  toX: number
  toY: number
  fromRotate: number
  toRotate: number
  delay: number
  depth: number
}> = [
  { sprite: 'a', x: -3, y: 4, size: 26, fromX: -22, fromY: -6, toX: 3, toY: 8, fromRotate: -38, toRotate: 18, delay: 0, depth: 1.04 },
  { sprite: 'c', x: 15, y: -7, size: 23, fromX: -4, fromY: -24, toX: 2, toY: 9, fromRotate: 32, toRotate: -12, delay: 55, depth: .88 },
  { sprite: 'b', x: 38, y: -9, size: 28, fromX: 0, fromY: -28, toX: -3, toY: 11, fromRotate: -18, toRotate: 22, delay: 100, depth: 1.08 },
  { sprite: 'd', x: 66, y: -8, size: 25, fromX: 5, fromY: -25, toX: -2, toY: 10, fromRotate: 28, toRotate: -18, delay: 25, depth: .92 },
  { sprite: 'a', x: 84, y: 2, size: 27, fromX: 20, fromY: -8, toX: -4, toY: 8, fromRotate: 42, toRotate: 8, delay: 80, depth: 1.02 },
  { sprite: 'b', x: 90, y: 23, size: 24, fromX: 24, fromY: -2, toX: -7, toY: 6, fromRotate: -24, toRotate: 20, delay: 145, depth: .82 },
  { sprite: 'c', x: 88, y: 50, size: 29, fromX: 26, fromY: 3, toX: -8, toY: 2, fromRotate: 36, toRotate: -9, delay: 30, depth: 1.1 },
  { sprite: 'd', x: 83, y: 75, size: 26, fromX: 23, fromY: 8, toX: -7, toY: -3, fromRotate: -32, toRotate: 15, delay: 105, depth: .95 },
  { sprite: 'a', x: 61, y: 84, size: 27, fromX: 4, fromY: 24, toX: -3, toY: -8, fromRotate: 18, toRotate: -20, delay: 155, depth: .85 },
  { sprite: 'b', x: 34, y: 85, size: 29, fromX: -2, fromY: 26, toX: 3, toY: -9, fromRotate: -28, toRotate: 14, delay: 60, depth: 1.06 },
  { sprite: 'd', x: 8, y: 73, size: 26, fromX: -22, fromY: 10, toX: 7, toY: -3, fromRotate: 24, toRotate: -16, delay: 125, depth: .9 },
  { sprite: 'c', x: -8, y: 47, size: 29, fromX: -27, fromY: 3, toX: 9, toY: 1, fromRotate: -40, toRotate: 12, delay: 40, depth: 1.12 },
  { sprite: 'b', x: -7, y: 25, size: 25, fromX: -25, fromY: -2, toX: 8, toY: 5, fromRotate: 30, toRotate: -22, delay: 175, depth: .8 },
  { sprite: 'a', x: 24, y: 11, size: 19, fromX: -7, fromY: -17, toX: 3, toY: 7, fromRotate: -20, toRotate: 25, delay: 210, depth: .74 },
  { sprite: 'd', x: 58, y: 10, size: 20, fromX: 4, fromY: -18, toX: -2, toY: 7, fromRotate: 18, toRotate: -24, delay: 190, depth: .76 },
  { sprite: 'c', x: 69, y: 65, size: 19, fromX: 10, fromY: 18, toX: -4, toY: -7, fromRotate: -24, toRotate: 18, delay: 220, depth: .72 },
]

export function LeafHandoff({ active, onComplete }: LeafHandoffProps) {
  useEffect(() => {
    if (!active) return
    const timeout = window.setTimeout(onComplete, 1580)
    return () => window.clearTimeout(timeout)
  }, [active, onComplete])

  if (!active) return null
  return (
    <div className="leaf-handoff" aria-hidden="true" data-leaf-state="playing">
      {leaves.map((leaf, index) => {
        const style: LeafStyle = {
          left: `${leaf.x}%`,
          top: `${leaf.y}%`,
          width: `${leaf.size}vw`,
          '--leaf-from-x': `${leaf.fromX}vw`,
          '--leaf-from-y': `${leaf.fromY}vh`,
          '--leaf-to-x': `${leaf.toX}vw`,
          '--leaf-to-y': `${leaf.toY}vh`,
          '--leaf-from-rotate': `${leaf.fromRotate}deg`,
          '--leaf-to-rotate': `${leaf.toRotate}deg`,
          '--leaf-delay': `${leaf.delay}ms`,
          '--leaf-depth': leaf.depth,
        }
        return <img key={`${leaf.sprite}-${index}`} src={`${import.meta.env.BASE_URL}media/leaves/leaf-${leaf.sprite}.webp`} alt="" style={style} />
      })}
    </div>
  )
}
