'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * A silent background loop that sits on top of its poster still.
 * Loads only once it is near the viewport, plays only while visible, fades in
 * once frames are actually playing, and is never rendered for reduced-motion
 * or data-saver visitors (they keep the still underneath).
 */
export default function AmbientVideo({ src, poster, position = 'center' }: { src: string; poster: string; position?: string }) {
  const box = useRef<HTMLDivElement>(null)
  const vid = useRef<HTMLVideoElement>(null)
  const [allowed, setAllowed] = useState(false)
  const [near, setNear] = useState(false)
  const [inView, setInView] = useState(false)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true
    if (rm || saveData) return
    setAllowed(true)
    const el = box.current
    if (!el) return
    const nearObs = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '100% 0px' })
    const viewObs = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.1 })
    nearObs.observe(el)
    viewObs.observe(el)
    return () => {
      nearObs.disconnect()
      viewObs.disconnect()
    }
  }, [])

  useEffect(() => {
    const v = vid.current
    if (!v) return
    if (inView) v.play().catch(() => {})
    else v.pause()
  }, [inView, near])

  return (
    <div ref={box} className="ke-bd-vbox" aria-hidden>
      {allowed && near && (
        <video
          ref={vid}
          className={`ke-bd-vid${playing ? ' on' : ''}`}
          src={src}
          poster={poster}
          muted
          loop
          playsInline
          preload="metadata"
          onPlaying={() => setPlaying(true)}
          style={{ objectPosition: position }}
        />
      )}
    </div>
  )
}
