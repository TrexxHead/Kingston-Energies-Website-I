'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import AmbientVideo from './AmbientVideo'

/**
 * Full-bleed photographic backdrop for a Solar & Energy panel: a responsive
 * still that pushes in gently as the panel enters, with an optional silent
 * loop on top (see AmbientVideo for when it loads and plays).
 *
 * Imagery is illustrative (AI-generated scenes of Jamaican homes), not photos
 * of a specific installation; the page says so in its footer note.
 */
export default function Backdrop({ src, video, position = 'center', priority = false }: { src: string; video?: string; position?: string; priority?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(priority)

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.15 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={wrap} className={`ke-bd${inView ? ' in' : ''}`} aria-hidden>
      <Image src={src} alt="" fill priority={priority} sizes="100vw" quality={78} style={{ objectFit: 'cover', objectPosition: position }} className="ke-bd-img" />
      {video && <AmbientVideo src={video} poster={src} position={position} />}
    </div>
  )
}
