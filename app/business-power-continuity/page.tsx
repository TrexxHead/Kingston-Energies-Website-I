import Link from 'next/link'
import { ArrowRight, ZapOff, Clock, ShieldCheck, Calculator } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Reveal from '@/app/_design-system/Reveal'
import JsonLd from '@/components/JsonLd'
import { buildBreadcrumbs } from '@/lib/structuredData'

export const metadata = {
  title: 'Business power continuity: Kingston Energies',
  description: 'What does an outage actually cost your business? Estimate it, then build a backup power plan around real numbers.',
}

const breadcrumbs = buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Business power continuity' }])

const overline = {
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  letterSpacing: '.3em',
  color: 'var(--ke-green-400)',
} as const

const STEPS = [
  {
    icon: Calculator,
    title: '1. Estimate the cost',
    body: 'Run the business Energy Checkup — tell us your revenue per hour and what stops when the power does, and we\'ll estimate what an outage actually costs you.',
    href: '/hub/energy-checkup',
    cta: 'Run the checkup',
  },
  {
    icon: ZapOff,
    title: '2. See what\'s exposed',
    body: 'Refrigeration, POS, Wi-Fi, lighting — the checkup breaks down what\'s running and how much of your load a backup system would need to cover.',
    href: '/hub/energy-checkup',
    cta: 'See your breakdown',
  },
  {
    icon: ShieldCheck,
    title: '3. Build a continuity plan',
    body: 'From a power station that keeps the essentials alive through a short cut, to solar for longer or recurring outages — talk to us about what fits your risk and budget.',
    href: '/contact',
    cta: 'Talk to us',
  },
]

export default function BusinessPowerContinuityPage() {
  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--ke-dark-text)', background: 'var(--ke-dark-bg)', minHeight: '100vh' }}>
      <JsonLd data={breadcrumbs} />
      <Navbar />
      <main style={{ paddingTop: 64 }}>
        <section style={{ maxWidth: 1240, margin: '0 auto', padding: '96px 32px 48px' }}>
          <Reveal>
            <div style={overline}>FOR BUSINESSES</div>
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
              What does an outage{' '}
              <span style={{ background: 'var(--gradient-brand)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                cost you?
              </span>
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.65, color: 'rgba(234,242,236,.72)', margin: '24px 0 0', maxWidth: 620 }}>
              Most businesses guess. We’d rather you knew — a real, honest estimate built from your own revenue and
              what actually stops running when JPS does, followed by a plan that matches the risk.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 32 }}>
              <Link href="/hub/energy-checkup" style={ctaPrimary}>
                Run the business checkup <ArrowRight size={17} />
              </Link>
              <Link href="/contact" style={ctaGhost}>
                Talk to us directly
              </Link>
            </div>
          </Reveal>
        </section>

        <section style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px 72px' }}>
          <div className="kp-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
            {STEPS.map((s, i) => {
              const Icon = s.icon
              return (
                <Reveal key={s.title} delayMs={i * 80}>
                  <div style={{ background: 'var(--ke-dark-card)', border: '1px solid var(--ke-dark-hairline)', borderRadius: 20, padding: 28, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <span style={{ display: 'inline-flex', width: 44, height: 44, borderRadius: 12, background: 'rgba(147,201,63,.14)', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={20} color="var(--ke-green-400)" />
                    </span>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, color: '#fff', margin: '18px 0 0' }}>{s.title}</h3>
                    <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'rgba(234,242,236,.64)', margin: '10px 0 20px', flex: 1 }}>{s.body}</p>
                    <Link href={s.href} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--ke-green-400)' }}>
                      {s.cta} <ArrowRight size={15} />
                    </Link>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </section>

        <section style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px 96px' }}>
          <Reveal>
            <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid var(--ke-dark-hairline)', borderRadius: 20, padding: 28, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <Clock size={20} color="var(--ke-sun-300)" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 14.5, lineHeight: 1.65, color: 'rgba(234,242,236,.68)', margin: 0 }}>
                <strong style={{ color: '#fff' }}>Honest, on purpose:</strong> the checkup gives you a directional range,
                not a guaranteed figure — actual outage impact depends on timing, season and what&apos;s running that
                day. It&apos;s built to be a real starting point for a conversation, not a sales number.
              </p>
            </div>
          </Reveal>
        </section>

        <section style={{ background: 'var(--gradient-deep)' }}>
          <div style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(64px,10vw,120px) 32px', textAlign: 'center' }}>
            <Reveal>
              <div style={{ ...overline, color: 'rgba(234,242,236,.6)' }}>TAKES ABOUT 3 MINUTES</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(32px,5vw,56px)', letterSpacing: '-.025em', color: '#fff', lineHeight: 1.05, margin: '16px 0 0' }}>
                Know your number.
              </h2>
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginTop: 28 }}>
                <Link href="/hub/energy-checkup" style={ctaPrimary}>
                  Run the business checkup <ArrowRight size={17} />
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
