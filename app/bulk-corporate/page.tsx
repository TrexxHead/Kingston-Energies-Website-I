import Link from 'next/link'
import { ArrowRight, Layers, Truck, FileText, Users } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Reveal from '@/app/_design-system/Reveal'
import JsonLd from '@/components/JsonLd'
import { buildBreadcrumbs } from '@/lib/structuredData'

export const metadata = {
  title: 'Bulk & corporate orders: Kingston Energies',
  description: 'Kitting out a team, an office or a storefront? Bulk pricing on power banks, chargers and power stations, Kingston-wide delivery included.',
}

const breadcrumbs = buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Bulk & corporate' }])

const overline = {
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  letterSpacing: '.3em',
  color: 'var(--ke-green-400)',
} as const

const POINTS = [
  {
    icon: Layers,
    title: 'Bulk pricing, per product',
    body: 'Discounts scale with quantity on the item you’re ordering — not a blanket cart discount, so the maths stays transparent order to order.',
  },
  {
    icon: FileText,
    title: 'One invoice, one contact',
    body: 'A single itemized invoice for the whole order, with proof-of-payment upload and delivery tracking on every line.',
  },
  {
    icon: Truck,
    title: 'Kingston-wide delivery',
    body: 'Coordinated drop-off for multi-unit orders — tell us your timeline and we’ll work the delivery pipeline around it.',
  },
  {
    icon: Users,
    title: 'A dedicated point of contact',
    body: 'Corporate and reseller accounts get a direct line for reorders, so restocking a fleet of devices doesn’t start from zero each time.',
  },
]

const USE_CASES = [
  'Corporate gifting — branded-ready power banks for staff or clients',
  'Retail & reseller stock — wholesale-adjacent pricing at volume',
  'Events & activations — charging stations and giveaway units',
  'Offices & field teams — fleet chargers, cables and backup power',
]

export default function BulkCorporatePage() {
  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--ke-dark-text)', background: 'var(--ke-dark-bg)', minHeight: '100vh' }}>
      <JsonLd data={breadcrumbs} />
      <Navbar />
      <main style={{ paddingTop: 64 }}>
        <section style={{ maxWidth: 1240, margin: '0 auto', padding: '96px 32px 48px' }}>
          <Reveal>
            <div style={overline}>BULK &amp; CORPORATE</div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 'clamp(40px,7vw,76px)',
                lineHeight: 1.02,
                letterSpacing: '-.03em',
                color: '#fff',
                margin: '18px 0 0',
                maxWidth: 820,
              }}
            >
              Power, ordered{' '}
              <span style={{ background: 'var(--gradient-brand)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                at scale.
              </span>
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.65, color: 'rgba(234,242,236,.72)', margin: '24px 0 0', maxWidth: 620 }}>
              From a dozen power banks for a launch event to an ongoing fleet order for your team — tell us the
              quantity and we’ll put a bulk quote together.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 32 }}>
              <Link href="/contact" style={ctaPrimary}>
                Request a bulk quote <ArrowRight size={17} />
              </Link>
              <Link href="/shop" style={ctaGhost}>
                Browse the catalog
              </Link>
            </div>
          </Reveal>
        </section>

        <section style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px 72px' }}>
          <div className="kp-4col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18 }}>
            {POINTS.map((p, i) => {
              const Icon = p.icon
              return (
                <Reveal key={p.title} delayMs={(i % 4) * 80}>
                  <div style={{ background: 'var(--ke-dark-card)', border: '1px solid var(--ke-dark-hairline)', borderRadius: 20, padding: 26, height: '100%' }}>
                    <span style={{ display: 'inline-flex', width: 40, height: 40, borderRadius: 12, background: 'rgba(147,201,63,.14)', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={18} color="var(--ke-green-400)" />
                    </span>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16.5, color: '#fff', margin: '16px 0 0' }}>{p.title}</h3>
                    <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'rgba(234,242,236,.62)', margin: '8px 0 0' }}>{p.body}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </section>

        <section style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px 96px' }}>
          <Reveal>
            <div style={{ background: 'var(--ke-dark-card)', border: '1px solid var(--ke-dark-hairline)', borderRadius: 24, padding: 'clamp(28px,4vw,48px)' }}>
              <div style={overline}>WHO ORDERS IN BULK</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(24px,3vw,32px)', color: '#fff', margin: '12px 0 24px' }}>
                A few of the orders we put together most.
              </h2>
              <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '14px 32px', margin: 0, padding: 0, listStyle: 'none' }}>
                {USE_CASES.map((u) => (
                  <li key={u} style={{ display: 'flex', gap: 10, fontSize: 15, color: 'rgba(234,242,236,.78)', lineHeight: 1.5 }}>
                    <span style={{ color: 'var(--ke-green-400)' }}>&bull;</span>
                    {u}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </section>

        <section style={{ background: 'var(--gradient-deep)' }}>
          <div style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(64px,10vw,120px) 32px', textAlign: 'center' }}>
            <Reveal>
              <div style={{ ...overline, color: 'rgba(234,242,236,.6)' }}>READY WHEN YOU ARE</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(32px,5vw,56px)', letterSpacing: '-.025em', color: '#fff', lineHeight: 1.05, margin: '16px 0 0' }}>
                Tell us the quantity.
              </h2>
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginTop: 28 }}>
                <Link href="/contact" style={ctaPrimary}>
                  Request a bulk quote <ArrowRight size={17} />
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
