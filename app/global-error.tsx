'use client'

import { useEffect } from 'react'

// Catches errors in the root layout itself. Must render its own <html>/<body>.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0d1714', color: '#eaf2ec' }}>
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '80px 24px',
          }}
        >
          <h1 style={{ fontWeight: 800, fontSize: 40, margin: 0 }}>Something went wrong.</h1>
          <p style={{ color: 'rgba(234,242,236,.68)', marginTop: 12 }}>Please try again.</p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 24, padding: '13px 26px', borderRadius: 999, background: '#5c8a1e', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer' }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
