import type { CSSProperties } from 'react'

/**
 * Shimmering placeholder for loading states. GPU-friendly (animates
 * background-position only) and theme-neutral. Uses the shared keShimmer
 * keyframe from the design tokens.
 */
export default function Skeleton({
  width = '100%',
  height = 14,
  radius = 8,
  style,
}: {
  width?: number | string
  height?: number | string
  radius?: number
  style?: CSSProperties
}) {
  return (
    <span
      aria-hidden
      style={{
        display: 'block',
        width,
        height,
        borderRadius: radius,
        background: 'linear-gradient(90deg, rgba(0,0,0,.05) 25%, rgba(0,0,0,.09) 37%, rgba(0,0,0,.05) 63%)',
        backgroundSize: '400% 100%',
        animation: 'keShimmer 1.4s ease infinite',
        ...style,
      }}
    />
  )
}
