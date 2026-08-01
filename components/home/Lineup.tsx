'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Zap } from 'lucide-react'
import Reveal from '../../app/_design-system/Reveal'
import { fmt } from '@/lib/catalog'

interface LineupProps {
  /** Lowest live price per group (powerbanks/chargers/accessories/stations), or null if nothing's listed. */
  minPrices: Record<string, number | null>
  /** Live thumbnail for the featured power bank (Charmast) — falls back to the static image if unavailable. */
  powerbanksImage: string | null
  /** Live thumbnail for the featured power station (Anker) — falls back to the static image if unavailable. */
  stationsImage: string | null
}

export default function Lineup({ minPrices, powerbanksImage, stationsImage }: LineupProps) {
  const CARDS = [
    {
      n: '01',
      title: 'Power banks',
      desc: '10,000–20,000mAh. USB-C PD, multi-port, LED displays.',
      group: 'powerbanks',
      href: '/shop?category=powerbanks',
      image: powerbanksImage ?? '/images/powerbanks-window.jpg',
      hoverBorder: 'rgba(147,201,63,.5)',
    },
    {
      n: '02',
      title: 'Chargers & cables',
      desc: 'Fast wall chargers. USB-C, Lightning and braided cables.',
      group: 'chargers',
      href: '/shop?category=chargers',
      image: '/images/charger-cable.jpg',
      objectPosition: 'center 45%',
      hoverBorder: 'rgba(41,171,226,.55)',
    },
    {
      n: '03',
      title: 'Accessories',
      desc: 'Stands, organizers, and the extras that pair with power.',
      group: 'accessories',
      href: '/shop?category=accessories',
      image: '/images/phone-stand.jpg',
      objectPosition: 'center 40%',
      hoverBorder: 'rgba(147,201,63,.5)',
    },
    {
      n: '04',
      title: 'Power stations',
      desc: 'Big off-grid power. AC output, solar-ready inputs.',
      group: 'stations',
      href: '/shop?category=stations',
      image: stationsImage ?? '/images/anker-1.jpg',
      objectPosition: 'center 40%',
      hoverBorder: 'rgba(253,184,19,.55)',
    },
  ]
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
                  {minPrices[card.group] != null && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.18em', color: 'rgba(234,242,236,.5)', marginTop: 16 }}>
                      FROM {fmt(minPrices[card.group] as number)}
                    </div>
                  )}
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
