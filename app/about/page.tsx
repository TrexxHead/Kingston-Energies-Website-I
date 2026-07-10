import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Recycle, Wrench, HeartHandshake, Sparkles } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Reveal from '@/app/_design-system/Reveal'

export const metadata = {
  title: 'About — Kingston Energies',
  description: 'Born in Kingston, built for everywhere. The story behind Kingston Energies.',
}

const overline = {
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  letterSpacing: '.3em',
  color: 'var(--ke-green-400)',
} as const

const VALUES = [
  { icon: Recycle, title: 'Sustainable by design', body: 'Portable power today, renewable and smart energy tomorrow. Every product is a step toward a cleaner grid.' },
  { icon: Wrench, title: 'Built to be repaired', body: 'We favour devices you can open, service and keep. Repairability beats replacement — for your wallet and the planet.' },
  { icon: HeartHandshake, title: 'People first', body: 'We started hand to hand at Kingston markets. Real support from real people is still the standard we answer to.' },
  { icon: Sparkles, title: 'Quietly innovative', body: 'Premium engineering without the premium theatre. The best technology is the kind you never have to think about.' },
]

const PHASES = [
  { tag: 'PHASE 01 · TODAY', title: 'Portable energy', body: 'Power banks, chargers, cables and accessories — dependable power for everyday life across Jamaica.' },
  { tag: 'PHASE 02 · NEXT', title: 'Renewable energy', body: 'Solar-ready power stations and home storage, bringing clean generation within reach of every household.' },
  { tag: 'PHASE 03 · HORIZON', title: 'Smart energy', body: 'Connected homes that generate, store and balance their own power — energy that manages itself.' },
]

const STATS = [
  { value: '40+', label: 'POWER BANKS SOLD' },
  { value: '60+', label: 'CHARGERS SOLD' },
  { value: '12mo', label: 'STANDARD WARRANTY' },
  { value: '100%', label: 'REPAIRABLE FOCUS' },
]

export default function About() {
  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--ke-dark-text)', background: 'var(--ke-dark-bg)', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ paddingTop: 64 }}>
        {/* Hero */}
        <section style={{ maxWidth: 1240, margin: '0 auto', padding: '96px 32px 40px' }}>
          <Reveal>
            <div style={overline}>OUR&nbsp;STORY</div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 'clamp(40px,7vw,84px)',
                lineHeight: 1.02,
                letterSpacing: '-.03em',
                color: '#fff',
                margin: '18px 0 0',
                maxWidth: 900,
              }}
            >
              Powering progress.
              <br />
              <span style={{ background: 'var(--gradient-brand)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                Charging initiatives.
              </span>
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.65, color: 'rgba(234,242,236,.72)', margin: '24px 0 0', maxWidth: 620 }}>
              Kingston Energies is a portable-power company from Kingston, Jamaica — evolving, deliberately, into an
              energy-technology company. This is how we got here, and where we&apos;re going.
            </p>
          </Reveal>
        </section>

        {/* Story band with photo */}
        <section style={{ position: 'relative', height: '70vh', minHeight: 480, overflow: 'hidden', margin: '24px 0' }}>
          <Image src="/images/brand-card.jpg" alt="Kingston Energies" fill style={{ objectFit: 'cover', objectPosition: 'center 40%' }} sizes="100vw" />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,rgba(13,23,20,.94) 8%,rgba(13,23,20,.5) 55%,rgba(13,23,20,.3) 100%)' }} />
          <div style={{ position: 'relative', maxWidth: 1240, margin: '0 auto', padding: '0 32px', height: '100%', display: 'flex', alignItems: 'center' }}>
            <Reveal style={{ maxWidth: 560 }}>
              <div style={{ ...overline, letterSpacing: '.3em' }}>EST. KINGSTON&nbsp;·&nbsp;JAMAICA</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(30px,5vw,52px)', lineHeight: 1.05, letterSpacing: '-.02em', color: '#fff', margin: '18px 0 0' }}>
                Born at the market.
                <br />
                Built for everywhere.
              </h2>
              <p style={{ fontSize: 16.5, lineHeight: 1.7, color: 'rgba(234,242,236,.78)', margin: '20px 0 0' }}>
                We began hand to hand — at markets and pop-ups, keeping real people charged when it mattered. That
                closeness to customers shaped everything: honest pricing, products that last, and support you can
                actually reach. As we grow into renewable and smart energy, that market-stall standard travels with us.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Values bento */}
        <section style={{ maxWidth: 1240, margin: '0 auto', padding: '56px 32px' }}>
          <Reveal>
            <div style={overline}>01 — WHAT WE STAND FOR</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(28px,4.5vw,44px)', letterSpacing: '-.02em', color: '#fff', margin: '16px 0 40px' }}>
              Four things we don&apos;t compromise.
            </h2>
          </Reveal>
          <div className="kp-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            {VALUES.map((v, i) => {
              const Icon = v.icon
              return (
                <Reveal key={v.title} delayMs={i * 80}>
                  <div style={{ background: 'var(--ke-dark-card)', border: '1px solid var(--ke-dark-hairline)', borderRadius: 20, padding: 28, height: '100%' }}>
                    <span style={{ display: 'inline-flex', width: 44, height: 44, borderRadius: 12, background: 'rgba(147,201,63,.14)', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={20} color="var(--ke-green-400)" />
                    </span>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: '#fff', margin: '18px 0 0' }}>{v.title}</h3>
                    <p style={{ fontSize: 15, lineHeight: 1.65, color: 'rgba(234,242,236,.66)', margin: '10px 0 0' }}>{v.body}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </section>

        {/* Roadmap phases */}
        <section style={{ maxWidth: 1240, margin: '0 auto', padding: '40px 32px 64px' }}>
          <Reveal>
            <div style={overline}>02 — THE ROADMAP</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(28px,4.5vw,44px)', letterSpacing: '-.02em', color: '#fff', margin: '16px 0 40px' }}>
              From power bank to power grid.
            </h2>
          </Reveal>
          <div className="kp-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
            {PHASES.map((p, i) => (
              <Reveal key={p.title} delayMs={i * 90}>
                <div style={{ borderTop: '2px solid var(--ke-green-400)', paddingTop: 20, height: '100%' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.2em', color: 'var(--ke-green-400)' }}>{p.tag}</div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, color: '#fff', margin: '12px 0 0' }}>{p.title}</h3>
                  <p style={{ fontSize: 15, lineHeight: 1.65, color: 'rgba(234,242,236,.66)', margin: '10px 0 0' }}>{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section style={{ background: '#0a120f', borderTop: '1px solid rgba(255,255,255,.07)', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
          <div className="kp-4col" style={{ maxWidth: 1240, margin: '0 auto', padding: '56px 32px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24 }}>
            {STATS.map((s) => (
              <div key={s.label}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(32px,4vw,48px)', letterSpacing: '-.03em', color: '#fff', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.22em', color: 'rgba(234,242,236,.45)', marginTop: 10 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ background: 'var(--gradient-deep)' }}>
          <div style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(64px,10vw,120px) 32px', textAlign: 'center' }}>
            <Reveal>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(32px,5vw,56px)', letterSpacing: '-.025em', color: '#fff', lineHeight: 1.05, margin: 0 }}>
                Come power up with us.
              </h2>
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginTop: 28 }}>
                <Link href="/shop" style={ctaPrimary}>
                  Shop the lineup <ArrowRight size={17} />
                </Link>
                <Link href="/contact" style={ctaGhost}>
                  Get in touch
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
