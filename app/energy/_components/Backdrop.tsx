'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

/**
 * Full-bleed photographic backdrop for a Solar & Energy panel.
 *
 * - A still poster always renders first (next/image, responsive).
 * - If a loop video is given, it loads only once the panel is near the
 *   viewport, plays while visible and pauses off-screen. Skipped entirely for
 *   reduced-motion or data-saver visitors (they keep the still).
 * - The still drifts in slowly as the panel enters (a subtle push-in).
 *
 * Imagery is illustrative (AI-generated scenes of Jamaican homes), not photos
 * of a specific installation; the page says so in its footer note.
 */
export default function Backdrop({
  src,
  alt = '',
  video,
  priority = false,
  position = 'center',
  children,
}: {
  src: string
  alt?: string
  video?: string
  priority?: boolean
  position?: string
  children?: React.ReactNode
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const vid = useRef<HTMLVideoElement>(null)
  const [near, setNear] = useState(priority)
  const [inView, setInView] = useState(priority)
  const [motionOk, setMotionOk] = useState(false)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true
    setMotionOk(!rm && !saveData)
    const el = wrap.current
    if (!el) return
    const nearObs = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '100% 0px' })
    const viewObs = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.15 })
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
  }, [inView, near, motionOk])

  const showVideo = Boolean(video && motionOk && near)

  return (
    <div ref={wrap} className={`ke-bd${inView ? ' in' : ''}`} aria-hidden={alt ? undefined : true}>
      <Image src={src} alt={alt} fill priority={priority} sizes="100vw" quality={78} style={{ objectFit: 'cover', objectPosition: position }} className="ke-bd-img" />
      {showVideo && (
        <video
          ref={vid}
          className={`ke-bd-vid${playing ? ' on' : ''}`}
          src={video}
          poster={src}
          muted
          loop
          playsInline
          preload="metadata"
          onPlaying={() => setPlaying(true)}
          style={{ objectPosition: position }}
        />
      )}
      {children}
    </div>
  )
}
