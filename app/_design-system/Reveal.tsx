'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  delayMs?: number
}

/**
 * Anything already in the viewport at mount is shown immediately rather than
 * animated — otherwise already-visible content sits at opacity 0 for a beat
 * until the IntersectionObserver's first callback fires, which reads as
 * broken/unstyled content flashing in on every page load.
 */
export default function Reveal({ children, className, style, delayMs = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true)
      return
    }

    const rect = node.getBoundingClientRect()
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.unobserve(node)
        }
      },
      { threshold: 0.15 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(30px)',
        transition: `opacity 850ms var(--ease-out) ${delayMs}ms, transform 850ms var(--ease-out) ${delayMs}ms`,
      }}
    >
      {children}
    </div>
  )
}
