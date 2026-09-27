import type { CSSProperties } from 'react'

const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

interface LogoProps {
  className?: string
}

export function Logo({ className = '' }: LogoProps) {
  return (
    <span
      aria-hidden="true"
      className={`logo-mark${className ? ` ${className}` : ''}`}
      style={{ '--logo-source': `url("${publicAsset('brand/barn-mark.svg')}")` } as CSSProperties}
    />
  )
}
