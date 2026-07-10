'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // In production wire this to your error tracker (Sentry, etc.).
    console.error(error)
  }, [error])

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
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.3em', color: 'var(--ke-sun-300)' }}>
        SOMETHING WENT WRONG
      </div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(36px,7vw,60px)', letterSpacing: '-.03em', margin: '16px 0 0' }}>
        A momentary short.
      </h1>
      <p style={{ fontSize: 17, lineHeight: 1.6, color: 'var(--ke-dark-text-muted)', maxWidth: 460, marginTop: 14 }}>
        An unexpected error occurred. You can try again, or head back home.
      </p>
      <div style={{ display: 'flex', gap: 12, marginTop: 30, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={reset}
          style={{ padding: '13px 26px', borderRadius: 999, background: 'var(--color-primary)', color: '#fff', fontWeight: 600, fontFamily: 'var(--font-display)', border: 'none', cursor: 'pointer' }}
        >
          Try again
        </button>
        <Link
          href="/"
          style={{ padding: '13px 26px', borderRadius: 999, border: '1px solid var(--ke-dark-hairline)', color: 'var(--ke-dark-text)', fontWeight: 600, fontFamily: 'var(--font-display)' }}
        >
          Back home
        </Link>
      </div>
    </main>
  )
}
