'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import Reveal from '../../app/_design-system/Reveal'

function zone(seg: number, i: number): number {
  const t = seg - i
  if (t < 0) return Math.max(0, 1 + t * 3)
  if (t > 1) return Math.max(0, 1 - (t - 1) * 3)
  return 1
}

const FACTS = [
  {
    label: 'CAPACITY',
    labelColor: 'var(--ke-green-600)',
    value: '10,400',
    valueGradient: 'var(--gradient-brand)',
    valueColor: 'var(--ke-green-600)',
    unit: 'mAh',
    copy: 'Three full phone charges. A whole weekend without a wall socket.',
  },
  {
    label: 'PORTS',
    labelColor: 'var(--ke-green-600)',
    value: '×3',
    valueGradient: 'linear-gradient(120deg,var(--ke-blue-400),var(--ke-blue-600))',
    valueColor: 'var(--ke-blue-600)',
    unit: '',
    copy: "USB-C, Micro and USB-A. Yours, your partner's, and your friend's — charging together.",
  },
  {
    label: 'SPEED',
    labelColor: '#f7941e',
    value: '2× fast',
    valueGradient: 'var(--gradient-sun)',
    valueColor: '#f7941e',
    unit: '',
    copy: "Half the wait. An LED display tells you exactly what's left.",
  },
]

const IMAGES = ['/images/powerbank-box.jpg', '/images/powerbank-hand.jpg', '/images/charger-cable.jpg']

export default function ProductChapter() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let raf = 0

    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const wrap = wrapRef.current
        if (!wrap) return
        const rect = wrap.getBoundingClientRect()
        const vh = window.innerHeight
        const p = Math.max(0, Math.min(1, -rect.top / (rect.height - vh)))
        setProgress(p)
      })
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const seg = progress * 3
  const opacities = [zone(seg, 0), zone(seg, 1), zone(seg, 2)]

  return (
    <section id="ke-product" style={{ background: '#fbfdfb', color: 'var(--color-text)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '110px 32px 0', textAlign: 'center' }}>
        <Reveal>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.3em', color: 'var(--ke-green-600)' }}>
            01 — THE FLAGSHIP
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 'clamp(36px,6vw,64px)',
              letterSpacing: '-.025em',
              lineHeight: 1,
              margin: '18px 0 0',
            }}
          >
            Charmast 10,400.
          </h2>
          <p style={{ fontSize: 18, color: 'var(--color-text-muted)', maxWidth: 480, margin: '18px auto 0', lineHeight: 1.6 }}>
            A pocket-sized brick of energy. Keep scrolling — it&apos;ll explain itself.
          </p>
        </Reveal>
      </div>

      <div ref={wrapRef} style={{ height: '320vh', position: 'relative' }}>
        <div style={{ position: 'sticky', top: 0, height: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
          <div
            style={{
              maxWidth: 1140,
              margin: '0 auto',
              padding: '0 32px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 64,
              alignItems: 'center',
              width: '100%',
            }}
            className="kp-2col"
          >
            <div
              style={{
                position: 'relative',
                aspectRatio: '4/5',
                maxHeight: '66vh',
                borderRadius: 28,
                overflow: 'hidden',
                background: '#eef3ee',
                boxShadow: 'var(--shadow-xl)',
              }}
            >
              {IMAGES.map((src, i) => (
                <Image
                  key={src}
                  src={src}
                  alt=""
                  fill
                  sizes="(max-width: 900px) 90vw, 540px"
                  style={{
                    objectFit: 'cover',
                    opacity: opacities[i],
                    transform: `scale(${1.045 - opacities[i] * 0.045})`,
                    transition: 'opacity .12s linear',
                  }}
                />
              ))}
            </div>

            <div style={{ position: 'relative', minHeight: 340 }}>
              <div
                className="kad-hide-sm"
                style={{ position: 'absolute', left: -32, top: 8, bottom: 8, width: 2, background: 'var(--ke-gray-200)', borderRadius: 2 }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: 2,
                    height: `${progress * 100}%`,
                    background: 'linear-gradient(180deg, var(--ke-green-400), var(--ke-blue-400))',
                    borderRadius: 2,
                  }}
                />
              </div>

              {FACTS.map((fact, i) => {
                const o = opacities[i]
                return (
                  <div
                    key={fact.label}
                    style={{
                      position: i === 0 ? 'relative' : 'absolute',
                      top: i === 0 ? 'auto' : 0,
                      left: i === 0 ? 'auto' : 0,
                      right: i === 0 ? 'auto' : 0,
                      opacity: o,
                      transform: `translateY(${(1 - o) * 22}px)`,
                      pointerEvents: o > 0.5 ? 'auto' : 'none',
                      transition: 'opacity .12s linear',
                    }}
                  >
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.3em', color: fact.labelColor }}>
                      {fact.label}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 800,
                        fontSize: 72,
                        letterSpacing: '-.03em',
                        lineHeight: 1,
                        margin: '16px 0 0',
                      }}
                    >
                      <span
                        style={{
                          background: fact.valueGradient,
                          WebkitBackgroundClip: 'text',
                          backgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          color: fact.valueColor,
                        }}
                      >
                        {fact.value}
                      </span>
                      {fact.unit && <span style={{ fontSize: 28, color: 'var(--color-text-muted)' }}> {fact.unit}</span>}
                    </div>
                    <p style={{ fontSize: 18, lineHeight: 1.6, color: 'var(--color-text-muted)', margin: '18px 0 0', maxWidth: 380 }}>
                      {fact.copy}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)' }}>
        <div
          style={{
            maxWidth: 1140,
            margin: '0 auto',
            padding: '56px 32px 96px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 32,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 48, letterSpacing: '-.02em' }}>
                J$7,999
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  height: 22,
                  padding: '2px 10px',
                  borderRadius: 999,
                  background: 'var(--ke-green-50)',
                  color: 'var(--ke-green-700)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 11,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ke-green-700)' }} />
                In stock
              </span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.14em', color: 'var(--color-text-muted)', marginTop: 10 }}>
              10,400&nbsp;MAH&nbsp;&nbsp;·&nbsp;&nbsp;3&nbsp;PORTS&nbsp;&nbsp;·&nbsp;&nbsp;2×&nbsp;SPEED&nbsp;&nbsp;·&nbsp;&nbsp;12-MO&nbsp;WARRANTY
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link
              href="/shop"
              style={{
                height: 56,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 26px',
                borderRadius: 999,
                background: 'var(--color-primary)',
                color: '#fff',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 15,
                boxShadow: 'var(--shadow-green)',
              }}
            >
              Configure yours
              <ArrowRight size={17} />
            </Link>
            <Link
              href="/contact"
              style={{
                height: 56,
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0 26px',
                borderRadius: 999,
                border: '1.5px solid var(--color-border)',
                color: 'var(--color-text)',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              Talk to us
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
