'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Zap } from 'lucide-react'
import Reveal from '../../app/_design-system/Reveal'

const CARDS = [
  {
    n: '01',
    title: 'Power banks',
    desc: '10,000–20,000mAh. USB-C PD, multi-port, LED displays.',
    from: 'FROM J$6,999',
    href: '/shop?category=powerbanks',
    image: '/images/powerbanks-window.jpg',
    hoverBorder: 'rgba(147,201,63,.5)',
  },
  {
    n: '02',
    title: 'Chargers & cables',
    desc: 'Fast wall chargers. USB-C, Lightning and braided cables.',
    from: 'FROM J$2,499',
    href: '/shop?category=chargers',
    image: '/images/charger-cable.jpg',
    objectPosition: 'center 45%',
    hoverBorder: 'rgba(41,171,226,.55)',
  },
  {
    n: '03',
    title: 'Accessories',
    desc: 'Stands, organizers, and the extras that pair with power.',
    from: 'FROM J$2,499',
    href: '/shop?category=accessories',
    image: '/images/phone-stand.jpg',
    objectPosition: 'center 40%',
    hoverBorder: 'rgba(147,201,63,.5)',
  },
  {
    n: '04',
    title: 'Power stations',
    desc: 'Big off-grid power. AC output, solar-ready inputs.',
    from: 'FROM J$49,999',
    href: '/shop?category=stations',
    image: null,
    hoverBorder: 'rgba(253,184,19,.55)',
  },
]

export default function Lineup() {
  return (
    <section id="ke-lineup" style={{ background: '#0d1714', padding: '110px 0 90px', position: 'relative' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px' }}>
        <Reveal
          style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}
        >
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(32px,5vw,56px)', letterSpacing: '-.025em', color: '#fff', margin: 0 }}>
            The lineup.
          </h2>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.26em', color: 'rgba(234,242,236,.4)' }}>
            EVERYTHING TO KEEP YOU POWERED
          </span>
        </Reveal>

        <div className="kp-4col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20, marginTop: 48 }}>
          {CARDS.map((card) => (
            <Reveal key={card.n}>
              <Link
                href={card.href}
                style={{
                  display: 'block',
                  border: '1px solid rgba(255,255,255,.09)',
                  borderRadius: 22,
                  overflow: 'hidden',
                  background: '#111e1a',
                  transition: 'transform .3s var(--ease-standard),border-color .3s var(--ease-standard)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)'
                  e.currentTarget.style.borderColor = card.hoverBorder
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,.09)'
                }}
              >
                <div style={{ position: 'relative', width: '100%', height: 230, background: '#16241f' }}>
                  {card.image ? (
                    <Image
                      src={card.image}
                      alt={card.title}
                      fill
                      sizes="(max-width: 1100px) 50vw, 25vw"
                      style={{ objectFit: 'cover', objectPosition: card.objectPosition ?? 'center', opacity: 0.92 }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Zap size={28} color="rgba(255,255,255,.25)" />
                    </div>
                  )}
                </div>
                <div style={{ padding: 24 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.3em', color: 'var(--ke-green-400)' }}>
                    {card.n}
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: '#fff', marginTop: 10 }}>
                    {card.title}
                  </div>
                  <div style={{ fontSize: 14.5, lineHeight: 1.6, color: 'rgba(234,242,236,.6)', marginTop: 8 }}>{card.desc}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.18em', color: 'rgba(234,242,236,.5)', marginTop: 16 }}>
                    {card.from}
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
