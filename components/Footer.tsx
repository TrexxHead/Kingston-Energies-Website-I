import Link from 'next/link'
import Image from 'next/image'
import { Lock } from 'lucide-react'

function InstagramGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

export default function Footer() {
  return (
    <footer style={{ background: '#0a120f', borderTop: '1px solid rgba(255,255,255,.07)' }}>
      <div
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: '34px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Image src="/images/logo-mark.png" alt="" width={22} height={22} style={{ objectFit: 'contain' }} />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '.22em',
              color: 'rgba(234,242,236,.45)',
            }}
          >
            © 2026 KINGSTON ENERGIES — POWERING PROGRESS
          </span>
        </div>

        <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap' }}>
          <Link href="/shop" style={{ fontSize: 13, color: 'rgba(234,242,236,.55)' }}>
            Product
          </Link>
          <Link href="/services" style={{ fontSize: 13, color: 'rgba(234,242,236,.55)' }}>
            Services
          </Link>
          <Link href="/about" style={{ fontSize: 13, color: 'rgba(234,242,236,.55)' }}>
            About
          </Link>
          <Link href="/contact" style={{ fontSize: 13, color: 'rgba(234,242,236,.55)' }}>
            Get in touch
          </Link>
          <Link href="/hub" style={{ fontSize: 13, color: 'rgba(234,242,236,.55)' }}>
            Dashboard
          </Link>
          <Link
            href="/admin/login"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(234,242,236,.55)' }}
          >
            <Lock size={12} />
            Admin
          </Link>
          <a href="tel:+18763389958" style={{ fontSize: 13, color: 'rgba(234,242,236,.55)' }}>
            876-338-9958
          </a>
          <a
            href="https://instagram.com/kingstonenergies"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Kingston Energies on Instagram"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(234,242,236,.55)' }}
          >
            <InstagramGlyph size={14} />
            @kingstonenergies
          </a>
        </div>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,.06)' }}>
        <div
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            padding: '16px 32px',
            display: 'flex',
            gap: 22,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {[
            { href: '/legal/privacy', label: 'Privacy' },
            { href: '/legal/terms', label: 'Terms' },
            { href: '/legal/returns', label: 'Returns & Refunds' },
            { href: '/legal/warranty', label: 'Warranty' },
          ].map((l) => (
            <Link key={l.href} href={l.href} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.14em', color: 'rgba(234,242,236,.4)' }}>
              {l.label.toUpperCase()}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}
