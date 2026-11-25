'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

/**
 * Battery-backup backdrop: the same street with the grid on, then in an
 * outage — the neighbours go dark, the home with a battery stays lit. Plays
 * once when the panel comes into view; the switch lets visitors flip it.
 * An illustration of what backup does, not live grid data.
 */
export default function OutageScene({ gridOn, outage }: { gridOn: string; outage: string }) {
  const wrap = useRef<HTMLDivElement>(null)
  const [out, setOut] = useState(false)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    let t: ReturnType<typeof setTimeout> | undefined
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !touched) {
          t = setTimeout(() => setOut(true), 1400)
          obs.disconnect()
        }
      },
      { threshold: 0.5 },
    )
    obs.observe(el)
    return () => {
      obs.disconnect()
      if (t) clearTimeout(t)
    }
  }, [touched])

  return (
    <>
      <div ref={wrap} className="ke-bd in" aria-hidden>
        <Image src={gridOn} alt="" fill sizes="100vw" quality={78} className="ke-bd-img" style={{ objectFit: 'cover' }} />
        <Image src={outage} alt="" fill sizes="100vw" quality={78} className={`ke-bd-img ke-en-out${out ? ' on' : ''}`} style={{ objectFit: 'cover' }} />
      </div>
      <button
        type="button"
        className={`ke-en-grid${out ? ' is-out' : ''}`}
        aria-pressed={out}
        onClick={() => {
          setTouched(true)
          setOut((v) => !v)
        }}
      >
        <span className="dot" aria-hidden />
        {out ? 'Grid down — battery on' : 'Grid on'}
        <span className="hint">{out ? 'Restore power' : 'Cut the power'}</span>
      </button>
    </>
  )
}
