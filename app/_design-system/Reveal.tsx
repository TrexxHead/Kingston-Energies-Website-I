'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  delayMs?: number
}

export default function Reveal({ children, className, style, delayMs = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
