'use client'

import { useRef } from 'react'
import type { CarPhoto as CarPhotoEntry } from '@/lib/vehicles/carPhotos'

/**
 * A rendered side view of the owner's model (generated studio render, white),
 * repainted in their colour: a paint mask multiplies the colour into the body
 * only, and a highlight layer puts the sheen back for dark colours. Wheels,
 * glass, lamps and trim keep their own colour. The car eases towards the
 * pointer and the paint fades when the colour changes. An illustration of the
 * model, not a photo of the owner's car.
 */
export default function CarPhoto({ photo, colour, label, height }: { photo: CarPhotoEntry; colour: string; label: string; height?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const base = `/images/cars/${photo.slug}`
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current
    if (!el || e.pointerType !== 'mouse') return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    el.style.setProperty('--tx', `${(x * 10).toFixed(1)}px`)
    el.style.setProperty('--ry', `${(x * 4).toFixed(2)}deg`)
  }
  const onLeave = () => {
    ref.current?.style.setProperty('--tx', '0px')
    ref.current?.style.setProperty('--ry', '0deg')
  }
  return (
    <div className="ke-cp" onPointerMove={onMove} onPointerLeave={onLeave} style={{ maxWidth: height ? (height * photo.w) / photo.h : undefined }}>
      <style>{CSS}</style>
      <div ref={ref} className="ke-cp-car" role="img" aria-label={label} style={{ aspectRatio: `${photo.w} / ${photo.h}` }}>
        <span className="ke-cp-shadow" aria-hidden />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${base}.webp`} alt="" draggable={false} />
        <span className="ke-cp-paint" aria-hidden style={{ background: colour, WebkitMaskImage: `url(${base}-paint.png)`, maskImage: `url(${base}-paint.png)` }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ke-cp-shine" src={`${base}-shine.png`} alt="" draggable={false} />
      </div>
    </div>
  )
}

const CSS = `
.ke-cp{width:100%;margin:0 auto;perspective:900px;padding:2% 3% 4%}
.ke-cp-car{--tx:0px;--ry:0deg;position:relative;width:100%;isolation:isolate;transform:translateX(var(--tx)) rotateY(var(--ry));transition:transform .5s cubic-bezier(.2,.7,.2,1);animation:ke-cp-in .8s cubic-bezier(.2,.7,.2,1) both}
.ke-cp-car img{position:absolute;inset:0;width:100%;height:100%;user-select:none;-webkit-user-drag:none}
.ke-cp-paint{position:absolute;inset:0;mix-blend-mode:multiply;-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;transition:background-color .6s ease}
.ke-cp-shine{opacity:.55}
.ke-cp-shadow{position:absolute;left:6%;right:6%;bottom:-3%;height:12%;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.55),rgba(0,0,0,0));filter:blur(4px);z-index:-1}
@keyframes ke-cp-in{from{opacity:0;transform:translateX(-24px)}to{opacity:1}}
@media (prefers-reduced-motion:reduce){.ke-cp-car{animation:none;transition:none}}
`
