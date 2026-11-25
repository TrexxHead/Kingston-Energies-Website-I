'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'
import AmbientVideo from './AmbientVideo'

/**
 * The hero: the same home by day and at dusk. The hero is taller than the
 * screen and its picture sticks while you scroll, so the sun sets and the
 * lights come on as you read — a crossfade driven by scroll position.
 * Reduced-motion visitors get the daytime still with no scroll effect.
 */
export default function HeroSunset({ day, dusk, dayVideo, duskVideo, children }: { day: string; dusk: string; dayVideo?: string; duskVideo?: string; children: React.ReactNode }) {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const update = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const travel = Math.max(1, r.height - window.innerHeight)
      const p = Math.min(1, Math.max(0, -r.top / travel))
      el.style.setProperty('--p', p.toFixed(3))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section ref={root} className="ke-en-sunset" aria-labelledby="en-hero">
      <div className="ke-en-sticky">
        <div className="ke-bd in">
          <div className="ke-en-layer ke-en-day">
            <Image src={day} alt="" fill priority sizes="100vw" quality={78} className="ke-bd-img" style={{ objectFit: 'cover' }} />
            {dayVideo && <AmbientVideo src={dayVideo} poster={day} />}
          </div>
          <div className="ke-en-layer ke-en-dusk">
            <Image src={dusk} alt="" fill sizes="100vw" quality={78} className="ke-bd-img" style={{ objectFit: 'cover' }} />
            {duskVideo && <AmbientVideo src={duskVideo} poster={dusk} />}
          </div>
        </div>
        <div className="ke-en-shade" />
        {children}
      </div>
    </section>
  )
}
