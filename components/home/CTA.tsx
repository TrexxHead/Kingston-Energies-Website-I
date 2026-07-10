import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import Reveal from '../../app/_design-system/Reveal'

export default function CTA() {
  return (
    <section style={{ background: 'var(--gradient-deep)', padding: '130px 0', textAlign: 'center', position: 'relative' }}>
      <Reveal style={{ maxWidth: 760, margin: '0 auto', padding: '0 32px' }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 'clamp(38px,6vw,64px)',
            letterSpacing: '-.025em',
            lineHeight: 1.02,
            color: '#fff',
            margin: 0,
          }}
        >
          The future
          <br />
          charges here.
        </h2>
        <p style={{ fontSize: 18, lineHeight: 1.6, color: 'rgba(234,242,236,.7)', maxWidth: 440, margin: '22px auto 0' }}>
          Questions, bulk orders, or first dibs on solar — talk to a real person in Kingston.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 38, flexWrap: 'wrap' }}>
          <Link
            href="/contact"
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
            Get in touch
            <ArrowRight size={17} />
          </Link>
          <a
            href="tel:+18763389958"
            style={{
              height: 56,
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0 26px',
              borderRadius: 999,
              border: '1.5px solid rgba(255,255,255,.28)',
              color: '#fff',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            Call 876-338-9958
          </a>
        </div>
      </Reveal>
    </section>
  )
}
