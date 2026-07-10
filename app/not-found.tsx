import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '80px 24px',
        background: 'var(--ke-dark-bg)',
        color: 'var(--ke-dark-text)',
      }}
    >
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.3em', color: 'var(--ke-green-400)' }}>
        ERROR 404
      </div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(40px,8vw,72px)', letterSpacing: '-.03em', margin: '16px 0 0' }}>
        Lost the charge.
      </h1>
      <p style={{ fontSize: 17, lineHeight: 1.6, color: 'var(--ke-dark-text-muted)', maxWidth: 460, marginTop: 14 }}>
        We couldn&apos;t find that page. It may have moved, or the link might be out of date.
      </p>
      <div style={{ display: 'flex', gap: 12, marginTop: 30, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          href="/"
          style={{ padding: '13px 26px', borderRadius: 999, background: 'var(--color-primary)', color: '#fff', fontWeight: 600, fontFamily: 'var(--font-display)' }}
        >
          Back home
        </Link>
        <Link
          href="/shop"
          style={{ padding: '13px 26px', borderRadius: 999, border: '1px solid var(--ke-dark-hairline)', color: 'var(--ke-dark-text)', fontWeight: 600, fontFamily: 'var(--font-display)' }}
        >
          Browse the shop
        </Link>
      </div>
    </main>
  )
}
