'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Mail, Phone } from 'lucide-react'
import { analytics } from '@/lib/analytics'

function InstagramGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

const SHOP_COLUMN = [
  { href: '/shop?category=powerbanks', label: 'Power banks' },
  { href: '/shop?category=chargers,components', label: 'Chargers & cables' },
  { href: '/shop?category=accessories', label: 'Accessories' },
  { href: '/shop?category=stations', label: 'Stations' },
  { href: '/bulk-corporate', label: 'Bulk & corporate' },
]

const COMPANY_COLUMN = [
  { href: '/about', label: 'About' },
  { href: '/services', label: 'Services' },
  { href: '/faq', label: 'FAQ' },
  { href: '/find-my-power', label: 'Find my power' },
  { href: '/back-in-stock', label: 'Back in stock' },
]

const LEGAL_COLUMN = [
  { href: '/legal/privacy', label: 'Privacy' },
  { href: '/legal/terms', label: 'Terms' },
  { href: '/legal/returns', label: 'Returns & Refunds' },
  { href: '/legal/warranty', label: 'Warranty' },
  { href: '/legal/delivery', label: 'Delivery & Rates' },
]

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, color: '#fff', marginBottom: 16 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {links.map((l) => (
          <Link key={l.href} href={l.href} style={{ fontSize: 13.5, color: 'rgba(234,242,236,.55)' }}>
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

function NewsletterBox() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status === 'busy') return
    setStatus('busy')
    try {
      const res = await fetch('/api/marketing/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error()
      setStatus('done')
      setEmail('')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div style={{ fontSize: 13, color: 'var(--ke-green-400)', marginTop: 4 }}>
        You&apos;re on the list — thanks for signing up.
      </div>
    )
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 4 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12.5, color: '#fff', marginBottom: 8 }}>
        Get updated
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle') }}
          placeholder="Email"
          style={{
            flex: 1,
            minWidth: 0,
            height: 38,
            padding: '0 12px',
            borderRadius: 9,
            border: '1px solid rgba(255,255,255,.12)',
            background: 'rgba(255,255,255,.05)',
            color: '#fff',
            fontSize: 13,
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={status === 'busy'}
          style={{
            height: 38,
            padding: '0 16px',
            borderRadius: 9,
            border: 'none',
            background: '#fff',
            color: '#0d1714',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 12.5,
            cursor: 'pointer',
            opacity: status === 'busy' ? 0.6 : 1,
            flexShrink: 0,
          }}
        >
          {status === 'busy' ? '…' : 'Subscribe'}
        </button>
      </div>
      {status === 'error' && (
        <div style={{ fontSize: 11.5, color: '#e88585', marginTop: 6 }}>Couldn&apos;t sign you up — check the address and try again.</div>
      )}
    </form>
  )
}

export default function Footer({ showCta = true }: { showCta?: boolean }) {
  return (
    <footer style={{ background: '#0a120f', position: 'relative', overflow: 'hidden' }}>
      {showCta && (
        <>
          {/* Ambient glow — same brand gradient used behind the homepage hero
              and the auth pages, so the footer's CTA band reads as the same
              site. */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: -120,
              left: '50%',
              width: 720,
              height: 480,
              transform: 'translateX(-50%)',
              background: 'radial-gradient(circle, rgba(147,201,63,.14) 0%, rgba(41,171,226,.06) 40%, transparent 68%)',
              filter: 'blur(50px)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative', maxWidth: 760, margin: '0 auto', padding: 'clamp(64px,9vw,110px) 32px 56px', textAlign: 'center' }}>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 'clamp(30px,4.5vw,48px)',
                letterSpacing: '-.025em',
                lineHeight: 1.05,
                color: '#fff',
                margin: 0,
              }}
            >
              The future charges here.
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: 'rgba(234,242,236,.7)', maxWidth: 420, margin: '18px auto 0' }}>
              Questions, bulk orders, or first dibs on solar: talk to a real person in Kingston.
            </p>
            <Link
              href="/contact"
              style={{
                height: 54,
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
                marginTop: 32,
              }}
            >
              Get in touch
              <ArrowRight size={17} />
            </Link>
          </div>
        </>
      )}

      {showCta && <div style={{ maxWidth: 1240, margin: '0 auto', borderTop: '1px dashed rgba(255,255,255,.14)' }} />}

      {/* Columns */}
      <div
        style={{
          position: 'relative',
          maxWidth: 1240,
          margin: '0 auto',
          padding: showCta ? '48px 32px 40px' : 'clamp(56px,8vw,88px) 32px 40px',
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
          gap: 40,
        }}
        className="ke-footer-grid"
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Image src="/images/logo-mark.png" alt="" width={24} height={24} style={{ objectFit: 'contain' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: '#fff' }}>
              KINGSTON <span style={{ color: 'var(--ke-green-400)' }}>ENERGIES</span>
            </span>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(234,242,236,.5)', margin: '14px 0 18px', maxWidth: 280 }}>
            Portable power and fast charging for homes and businesses across Kingston.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
            <a href="tel:+18763389958" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(234,242,236,.55)' }}>
              <Phone size={13} />
              876-338-9958
            </a>
            <a href="mailto:kingstonenergygroup@outlook.com" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(234,242,236,.55)' }}>
              <Mail size={13} />
              kingstonenergygroup@outlook.com
            </a>
            <a
              href="https://instagram.com/kingstonenergies"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Kingston Energies on Instagram"
              onClick={() => analytics.trackSocialInteraction('instagram', 'click', 'footer')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(234,242,236,.55)' }}
            >
              <InstagramGlyph size={13} />
              @kingstonenergies
            </a>
          </div>

          <NewsletterBox />
        </div>

        <FooterColumn title="Shop" links={SHOP_COLUMN} />
        <FooterColumn title="Company" links={COMPANY_COLUMN} />
        <FooterColumn title="Legal" links={LEGAL_COLUMN} />
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,.06)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '16px 32px', textAlign: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.22em', color: 'rgba(234,242,236,.4)' }}>
            © 2026 KINGSTON ENERGIES: POWERING PROGRESS
          </span>
        </div>
      </div>
    </footer>
  )
}
