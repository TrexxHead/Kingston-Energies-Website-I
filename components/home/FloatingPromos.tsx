'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Zap, Sparkles, Gift, Leaf, Sun } from 'lucide-react'

export interface FloatingPromo {
  label: string
  detail?: string
  href: string
  kind: 'flash' | 'banner'
}

interface Orb {
  id: number
  promo: FloatingPromo
  x: number // 0..1 fraction of width
  y: number // 0..1 fraction of height
  vx: number
  vy: number
  size: number
  hue: number
  icon: number
}

const ICONS = [Sparkles, Zap, Gift, Leaf, Sun]
// Soft brand-forward palettes (green / sun-gold / teal) for the orbs.
const HUES = [150, 42, 172, 90, 38]

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

/**
 * Living promo orbs that drift gently over the homepage hero and blend into it.
 * They float with soft physics, expand on hover and open an offer when clicked —
 * they do NOT flee the cursor, so they're easy to catch. Rendered as a
 * pointer-events-none overlay (only the orbs themselves are interactive), so the
 * rest of the hero stays fully clickable. Respects prefers-reduced-motion.
 */
export default function FloatingPromos({ promos }: { promos: FloatingPromo[] }) {
  const count = Math.min(Math.max(promos.length, 3), 6)
  const containerRef = useRef<HTMLDivElement>(null)
  const orbsRef = useRef<Orb[]>([])
  const nodeRefs = useRef<Map<number, HTMLButtonElement>>(new Map())
  const [hoverId, setHoverId] = useState<number | null>(null)
  const [open, setOpen] = useState<FloatingPromo | null>(null)
  const idSeq = useRef(0)
  const reduced = useRef(false)

  // Seed the orbs once, scattered randomly across the hero.
  const seeded = useMemo(() => {
    const arr: Orb[] = []
    for (let i = 0; i < count; i++) {
      arr.push({
        id: idSeq.current++,
        promo: promos[i % promos.length],
        x: rand(0.08, 0.92),
        y: rand(0.12, 0.88),
        vx: rand(-0.00012, 0.00012),
        vy: rand(-0.0001, 0.0001),
        size: rand(52, 84),
        hue: HUES[i % HUES.length],
        icon: i % ICONS.length,
      })
    }
    return arr
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count])

  useEffect(() => {
    orbsRef.current = seeded.map((o) => ({ ...o }))
  }, [seeded])

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let last = performance.now()

    const step = (now: number) => {
      const dt = Math.min(now - last, 48)
      last = now
      const orbs = orbsRef.current
      for (const o of orbs) {
        if (!reduced.current) {
          o.x += o.vx * dt
          o.y += o.vy * dt
          // Gentle random wander so drift feels organic (no cursor reaction).
          o.vx += rand(-0.0000012, 0.0000012) * dt
          o.vy += rand(-0.000001, 0.000001) * dt
          // Damping + soft speed cap.
          o.vx *= 0.995
          o.vy *= 0.995
          const cap = 0.0002
          o.vx = Math.max(-cap, Math.min(cap, o.vx))
          o.vy = Math.max(-cap, Math.min(cap, o.vy))
          // Bounce softly off the padded edges.
          if (o.x < 0.05) { o.x = 0.05; o.vx = Math.abs(o.vx) }
          if (o.x > 0.95) { o.x = 0.95; o.vx = -Math.abs(o.vx) }
          if (o.y < 0.08) { o.y = 0.08; o.vy = Math.abs(o.vy) }
          if (o.y > 0.92) { o.y = 0.92; o.vy = -Math.abs(o.vy) }
        }
        const node = nodeRefs.current.get(o.id)
        if (node) {
          node.style.left = `${o.x * 100}%`
          node.style.top = `${o.y * 100}%`
        }
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [])

  // When an orb is clicked, open its promo and drift it to a fresh spot.
  const openPromo = (o: Orb) => {
    setOpen(o.promo)
    const orb = orbsRef.current.find((x) => x.id === o.id)
    if (orb) {
      orb.x = rand(0.12, 0.88)
      orb.y = rand(0.12, 0.88)
    }
  }

  return (
    <>
      {/* Overlay blends over the hero; only the orbs capture pointer events. */}
      <div
        ref={containerRef}
        aria-hidden
        style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 6 }}
      >
        {seeded.map((o) => {
          const Icon = ICONS[o.icon]
          const hovered = hoverId === o.id
          return (
            <button
              key={o.id}
              ref={(el) => { if (el) nodeRefs.current.set(o.id, el); else nodeRefs.current.delete(o.id) }}
              onMouseEnter={() => setHoverId(o.id)}
              onMouseLeave={() => setHoverId((h) => (h === o.id ? null : h))}
              onClick={() => openPromo(o)}
              aria-label={o.promo.label}
              style={{
                position: 'absolute',
                left: `${o.x * 100}%`,
                top: `${o.y * 100}%`,
                transform: `translate(-50%,-50%) scale(${hovered ? 1.1 : 1})`,
                width: hovered ? 'auto' : o.size,
                minWidth: o.size,
                height: o.size,
                padding: hovered ? '0 20px 0 8px' : 0,
                display: 'flex',
                alignItems: 'center',
                gap: hovered ? 12 : 0,
                borderRadius: 999,
                border: `1px solid hsla(${o.hue},70%,72%,.28)`,
                background: `radial-gradient(circle at 35% 30%, hsla(${o.hue},80%,64%,.28), hsla(${o.hue},70%,42%,.10))`,
                boxShadow: `0 0 ${hovered ? 30 : 20}px hsla(${o.hue},80%,55%,${hovered ? 0.32 : 0.16}), inset 0 0 14px hsla(${o.hue},80%,72%,.14)`,
                backdropFilter: 'blur(2px)',
                cursor: 'pointer',
                color: '#eaf2ec',
                pointerEvents: 'auto',
                transition: 'transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s ease, width .3s ease, padding .3s ease',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              <span style={{ width: o.size, height: o.size, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={hovered ? 20 : 22} style={{ color: `hsl(${o.hue},85%,80%)` }} />
              </span>
              {hovered && (
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12.5, letterSpacing: '-.01em' }}>
                  {o.promo.label}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {open && (
        <div
          onClick={() => setOpen(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 120,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(6,12,10,.6)', backdropFilter: 'blur(4px)', padding: 20,
            animation: 'keFadeIn .2s ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(420px, 92vw)',
              background: 'linear-gradient(160deg, #14231d, #0f1a16)',
              border: '1px solid rgba(255,255,255,.12)',
              borderRadius: 22,
              padding: 28,
              boxShadow: '0 30px 80px -20px rgba(0,0,0,.7)',
              animation: 'kePop .35s cubic-bezier(.22,1,.36,1)',
              color: '#eaf2ec',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '.24em', color: open.kind === 'flash' ? '#fdb813' : '#7fd6a3' }}>
              {open.kind === 'flash' ? <Zap size={13} fill="currentColor" /> : <Sparkles size={13} />}
              {open.kind === 'flash' ? 'FLASH OFFER' : 'SPECIAL OFFER'}
            </span>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, letterSpacing: '-.02em', margin: '12px 0 0' }}>{open.label}</h3>
            {open.detail && <p style={{ fontSize: 14, color: '#b9c6bd', margin: '8px 0 0', lineHeight: 1.5 }}>{open.detail}</p>}
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <Link
                href={open.href || '/shop'}
                onClick={() => setOpen(null)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '11px 20px', borderRadius: 999,
                  background: 'var(--gradient-sun, linear-gradient(120deg,#fdb813,#f7941e))',
                  color: '#1c2a25', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, textDecoration: 'none',
                }}
              >
                Shop now <ArrowRight size={16} />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(null)}
                style={{ padding: '11px 18px', borderRadius: 999, background: 'transparent', border: '1px solid rgba(255,255,255,.18)', color: '#b9c6bd', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
