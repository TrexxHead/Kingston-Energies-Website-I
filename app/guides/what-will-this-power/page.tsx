import Link from 'next/link'
import { ArrowRight, Smartphone, Fan, Wifi, Refrigerator, Lightbulb, Laptop, Zap } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Reveal from '@/app/_design-system/Reveal'
import JsonLd from '@/components/JsonLd'
import { buildBreadcrumbs } from '@/lib/structuredData'

export const metadata = {
  title: 'What will this power? A guide to picking the right backup: Kingston Energies',
  description: 'A plain-language guide to matching what you actually need to run — a phone, a router, a fridge — to the right kind of backup power.',
}

const breadcrumbs = buildBreadcrumbs([
  { name: 'Home', path: '/' },
  { name: 'Guides', path: '/guides' },
  { name: 'What will this power?' },
])

const overline = {
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  letterSpacing: '.3em',
  color: 'var(--ke-green-400)',
} as const

interface Tier {
  icon: typeof Smartphone
  title: string
  devices: string
  fits: string
  cta: string
  href: string
}

const TIERS: Tier[] = [
  {
    icon: Smartphone,
    title: 'A power bank',
    devices: 'Phones, earbuds, small tablets, a handheld fan',
    fits: 'Anything that charges over USB and draws well under 30W. The right call for topping up through a normal day or a short outage.',
    cta: 'Shop power banks',
    href: '/shop?category=powerbanks',
  },
  {
    icon: Laptop,
    title: 'A higher-capacity power bank',
    devices: 'Laptops, larger tablets, camera gear',
    fits: 'Devices that need USB-C PD delivery and more total capacity for a full day away from an outlet.',
    cta: 'Shop PD power banks',
    href: '/shop?category=powerbanks',
  },
  {
    icon: Wifi,
    title: 'A power station',
    devices: 'Wi-Fi router, CPAP machine, lighting, a laptop plus phones together',
    fits: 'Anything with a wall plug that needs to stay on through a multi-hour outage, or several devices running at once.',
    cta: 'Shop power stations',
    href: '/shop?category=stations',
  },
  {
    icon: Refrigerator,
    title: 'A power station + solar',
    devices: 'A small fridge, longer outages, off-grid stretches',
    fits: 'Higher, sustained draw over hours or days — pairing a power station with solar keeps it topped up without a wall outlet at all.',
    cta: 'Shop solar',
    href: '/shop?category=stations',
  },
]

const CANT_ANSWER = [
  'Exact runtime in hours for your specific power station — that depends on its watt-hour capacity and your device\'s actual draw, and we don\'t publish invented numbers here. Check the product spec sheet on each listing, or ask us directly.',
  'Whether a given unit can start a compressor-driven appliance (fridge, AC) from cold — that depends on surge wattage, not just running wattage. If in doubt, ask before you buy.',
]

export default function WhatWillThisPowerGuide() {
  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--ke-dark-text)', background: 'var(--ke-dark-bg)', minHeight: '100vh' }}>
      <JsonLd data={breadcrumbs} />
      <Navbar />
      <main style={{ paddingTop: 64 }}>
        <section style={{ maxWidth: 1240, margin: '0 auto', padding: '96px 32px 48px' }}>
          <Reveal>
            <div style={overline}>GUIDE</div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 'clamp(40px,7vw,72px)',
                lineHeight: 1.02,
                letterSpacing: '-.03em',
                color: '#fff',
                margin: '18px 0 0',
                maxWidth: 780,
              }}
            >
              What will this actually power?
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.65, color: 'rgba(234,242,236,.72)', margin: '24px 0 0', maxWidth: 620 }}>
              The honest, plain-language version — matched to what you need to keep running, not a spec sheet.
              Prefer a personalized number? Run your{' '}
              <Link href="/hub/energy-checkup" style={{ color: 'var(--ke-green-400)' }}>
                Energy Usage Checkup
              </Link>{' '}
              instead.
            </p>
          </Reveal>
        </section>

        <section style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px 72px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {TIERS.map((t, i) => {
              const Icon = t.icon
              return (
                <Reveal key={t.title} delayMs={i * 60}>
                  <div
                    style={{
                      background: 'var(--ke-dark-card)',
                      border: '1px solid var(--ke-dark-hairline)',
                      borderRadius: 20,
                      padding: 26,
                      display: 'grid',
                      gridTemplateColumns: '44px 1fr auto',
                      gap: 20,
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ display: 'inline-flex', width: 44, height: 44, borderRadius: 12, background: 'rgba(147,201,63,.14)', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={20} color="var(--ke-green-400)" />
                    </span>
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, color: '#fff', margin: 0 }}>{t.title}</h3>
                      <p style={{ fontSize: 13, color: 'var(--ke-sun-300)', margin: '6px 0 0', fontFamily: 'var(--font-mono)', letterSpacing: '.02em' }}>{t.devices}</p>
                      <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'rgba(234,242,236,.66)', margin: '10px 0 0', maxWidth: 620 }}>{t.fits}</p>
                    </div>
                    <Link href={t.href} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--ke-green-400)', whiteSpace: 'nowrap' }}>
                      {t.cta} <ArrowRight size={15} />
                    </Link>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </section>

        <section style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px 96px' }}>
          <Reveal>
            <div style={{ background: 'rgba(253,184,19,.08)', border: '1px solid rgba(253,184,19,.25)', borderRadius: 20, padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Zap size={18} color="var(--ke-sun-300)" />
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: '#fff', margin: 0 }}>What this guide won&apos;t tell you</h3>
              </div>
              <ul style={{ margin: '14px 0 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {CANT_ANSWER.map((c) => (
                  <li key={c} style={{ fontSize: 13.5, lineHeight: 1.6, color: 'rgba(234,242,236,.68)' }}>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </section>

        <section style={{ background: 'var(--gradient-deep)' }}>
          <div style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(64px,10vw,120px) 32px', textAlign: 'center' }}>
            <Reveal>
              <div style={{ ...overline, color: 'rgba(234,242,236,.6)' }}>WANT A REAL NUMBER, NOT A GUIDE?</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(32px,5vw,56px)', letterSpacing: '-.025em', color: '#fff', lineHeight: 1.05, margin: '16px 0 0' }}>
                Run your Energy Checkup.
              </h2>
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginTop: 28 }}>
                <Link href="/hub/energy-checkup" style={ctaPrimary}>
                  Start the checkup <ArrowRight size={17} />
                </Link>
                <Link href="/find-my-power" style={ctaGhost}>
                  Or take the 30-second finder
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer showCta={false} />
    </div>
  )
}

const ctaPrimary = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  height: 52,
  padding: '0 26px',
  borderRadius: 999,
  background: '#fff',
  color: 'var(--ke-ink)',
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: 15,
} as const

const ctaGhost = {
  display: 'inline-flex',
  alignItems: 'center',
  height: 52,
  padding: '0 26px',
  borderRadius: 999,
  border: '1.5px solid rgba(255,255,255,.4)',
  color: '#fff',
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  fontSize: 15,
} as const
