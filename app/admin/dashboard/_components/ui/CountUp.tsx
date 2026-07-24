'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Animated number that counts up from 0 to `value` on mount / when the value
 * changes. Pass a `format` fn (e.g. currency) to render the running number.
 */
export default function CountUp({ value, format, duration = 900 }: { value: number; format?: (n: number) => string; duration?: number }) {
  const [n, setN] = useState(0)
  const raf = useRef<number | undefined>(undefined)

  useEffect(() => {
    const start = performance.now()
    const to = value
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
      setN(to * eased)
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [value, duration])

  const rounded = Math.round(n)
  return <>{format ? format(rounded) : rounded.toLocaleString()}</>
}
