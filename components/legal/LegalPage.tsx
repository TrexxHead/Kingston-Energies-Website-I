import type { ReactNode } from 'react'
import CommerceShell from '@/components/shop/CommerceShell'

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <CommerceShell>
      <article style={{ maxWidth: 760, margin: '0 auto', padding: '64px 32px 96px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.3em', color: 'var(--ke-green-600)' }}>
          LEGAL
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(34px,5vw,48px)', letterSpacing: '-.025em', lineHeight: 1.05, color: 'var(--color-text)', margin: '14px 0 0' }}>
          {title}
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '.16em', color: 'var(--color-text-muted)', marginTop: 12 }}>
          LAST UPDATED — {updated}
        </p>
        <div style={{ marginTop: 32, fontSize: 16, lineHeight: 1.7, color: 'var(--color-text)' }}>{children}</div>
        <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', marginTop: 40, paddingTop: 20, borderTop: '1px solid var(--color-border)' }}>
          Questions? Email <a href="mailto:hello@kingstonenergies.com" style={{ color: 'var(--ke-green-700)' }}>hello@kingstonenergies.com</a> or call{' '}
          <a href="tel:+18763389958" style={{ color: 'var(--ke-green-700)' }}>876-338-9958</a>.
        </p>
      </article>
    </CommerceShell>
  )
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--color-text)', margin: '0 0 10px' }}>
        {heading}
      </h2>
      <div style={{ color: 'var(--color-text)' }}>{children}</div>
    </section>
  )
}
