import Link from 'next/link'
import { ArrowRight, BatteryCharging, Plug, Package, ShieldCheck, Building2, Sun } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Reveal from '@/app/_design-system/Reveal'

export const metadata = {
  title: 'Services — Kingston Energies',
  description: 'Portable power, fast charging, repairability, business orders and solar early-access.',
}

const overline = {
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  letterSpacing: '.3em',
  color: 'var(--ke-green-400)',
} as const

interface Service {
  icon: typeof BatteryCharging
  title: string
  body: string
  href: string
  cta: string
  badge?: string
}

const SERVICES: Service[] = [
  {
    icon: BatteryCharging,
    title: 'Portable power',
    body: 'Slim everyday power banks to 20,000mAh PD workhorses — dependable charge for phones, tablets and more, wherever the day takes you.',
    href: '/shop?category=powerbanks',
    cta: 'Shop power banks',
  },
  {
    icon: Plug,
    title: 'Fast charging & cables',
    body: '20W and 33W GaN chargers plus braided, fast-charge cables. The right adapter for every device, built to keep up.',
    href: '/shop?category=chargers',
    cta: 'Shop charging',
  },
  {
    icon: Package,
    title: 'Accessories',
    body: 'Stands, pouches and the small essentials that round out your kit — considered, durable, and priced fairly.',
    href: '/shop?category=accessories',
    cta: 'Shop accessories',
  },
  {
    icon: ShieldCheck,
    title: 'Repairability & warranty',
    body: 'Every device ships with a 12-month warranty and a repair-first philosophy. Register your device in your energy hub to activate cover and earn points.',
    href: '/hub',
    cta: 'Your energy hub',
  },
  {
    icon: Building2,
    title: 'Business & bulk orders',
    body: 'Kitting out a team, an event or a storefront? Tell us what you need and we’ll put together a bulk quote — Kingston-wide delivery included.',
    href: '/contact',
    cta: 'Request a quote',
  },
  {
    icon: Sun,
    title: 'Solar — early access',
    body: 'Solar-ready power stations and home storage are next on our roadmap. Join the waitlist to be first when clean generation goes live.',
    href: '/contact',
    cta: 'Join the waitlist',
    badge: 'COMING SOON',
  },
]

export default function Services() {
  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--ke-dark-text)', background: 'var(--ke-dark-bg)', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ paddingTop: 64 }}>
        {/* Hero */}
        <section style={{ maxWidth: 1240, margin: '0 auto', padding: '96px 32px 48px' }}>
          <Reveal>
            <div style={overline}>SERVICES&nbsp;&amp;&nbsp;SUPPORT</div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 'clamp(40px,7vw,80px)',
                lineHeight: 1.02,
                letterSpacing: '-.03em',
                color: '#fff',
                margin: '18px 0 0',
                maxWidth: 860,
              }}
            >
              Everything to keep you{' '}
              <span style={{ background: 'var(--gradient-brand)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                charged.
              </span>
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.65, color: 'rgba(234,242,236,.72)', margin: '24px 0 0', maxWidth: 600 }}>
              From the power bank in your pocket to the energy that will one day run your home — here&apos;s how Kingston
              Energies can help.
            </p>
          </Reveal>
        </section>

        {/* Services grid */}
        <section style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px 72px' }}>
          <div className="kp-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
            {SERVICES.map((s, i) => {
              const Icon = s.icon
              return (
                <Reveal key={s.title} delayMs={(i % 3) * 80}>
                  <div
                    style={{
                      background: 'var(--ke-dark-card)',
                      border: '1px solid var(--ke-dark-hairline)',
                      borderRadius: 20,
                      padding: 28,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ display: 'inline-flex', width: 44, height: 44, borderRadius: 12, background: 'rgba(147,201,63,.14)', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={20} color="var(--ke-green-400)" />
                      </span>
                      {s.badge && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.18em', color: 'var(--ke-sun-300)', border: '1px solid rgba(253,184,19,.35)', borderRadius: 999, padding: '4px 9px' }}>
                          {s.badge}
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 21, color: '#fff', margin: '18px 0 0' }}>{s.title}</h3>
                    <p style={{ fontSize: 15, lineHeight: 1.65, color: 'rgba(234,242,236,.66)', margin: '10px 0 20px', flex: 1 }}>{s.body}</p>
                    <Link href={s.href} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--ke-green-400)' }}>
                      {s.cta} <ArrowRight size={15} />
                    </Link>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </section>

        {/* CTA */}
        <section style={{ background: 'var(--gradient-deep)' }}>
          <div style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(64px,10vw,120px) 32px', textAlign: 'center' }}>
            <Reveal>
              <div style={{ ...overline, color: 'rgba(234,242,236,.6)' }}>NOT SURE WHERE TO START?</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(32px,5vw,56px)', letterSpacing: '-.025em', color: '#fff', lineHeight: 1.05, margin: '16px 0 0' }}>
                Tell us what you need.
              </h2>
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginTop: 28 }}>
                <Link href="/contact" style={ctaPrimary}>
                  Get a quote <ArrowRight size={17} />
                </Link>
                <Link href="/shop" style={ctaGhost}>
                  Browse the shop
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
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
