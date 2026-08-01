'use client'

import { useEffect } from 'react'

export default function HubError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[hub] section error:', error)
  }, [error])

  return (
    <div style={{ padding: 40 }}>
      <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 16, padding: '32px 24px', textAlign: 'center', maxWidth: 460, margin: '0 auto' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, marginBottom: 6 }}>This section couldn’t load</div>
        <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', margin: '0 0 18px' }}>
          We hit a snag loading your account data. This is usually temporary. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{ padding: '10px 22px', borderRadius: 999, background: 'var(--color-primary)', color: '#fff', border: 'none', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
        >
          Try again
        </button>
      </div>
    </div>
  )
}
