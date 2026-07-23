'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

/**
 * Lightweight cookie-consent banner. Records the visitor's choice for a year in
 * both localStorage (for this component) and a `ke-cookie-consent` cookie (so
 * the server/analytics can read it later). We only set essential cookies until
 * the visitor accepts, so declining simply hides the banner.
 */
const KEY = 'ke-cookie-consent'

export default function CookieConsent() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true)
    } catch {
      setShow(true)
    }
  }, [])

  const choose = (choice: 'accepted' | 'declined') => {
    try {
      localStorage.setItem(KEY, choice)
    } catch {
      // ignore storage failures
    }
    // 1-year cookie so the choice survives across sessions/devices signed in.
    document.cookie = `${KEY}=${choice}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
    setShow(false)
  }

  if (!show) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 80,
        maxWidth: 520,
        margin: '0 auto',
        background: '#fff',
        border: '1px solid var(--color-border)',
        borderRadius: 16,
        boxShadow: '0 12px 40px rgba(0,0,0,.18)',
        padding: '18px 20px',
      }}
    >
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>
        We use cookies 🍪
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--color-text-muted)', margin: '6px 0 14px' }}>
        Kingston Energies uses cookies to keep you signed in, remember your cart, and understand how the site is used.
        See our <Link href="/legal/privacy" style={{ color: 'var(--ke-green-700)' }}>privacy policy</Link>.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => choose('accepted')}
          style={{ flex: 1, minWidth: 130, height: 42, borderRadius: 999, border: 'none', background: 'var(--color-primary)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}
        >
          Accept all
        </button>
        <button
          type="button"
          onClick={() => choose('declined')}
          style={{ flex: 1, minWidth: 130, height: 42, borderRadius: 999, border: '1.5px solid var(--color-border)', background: '#fff', color: 'var(--color-text)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}
        >
          Essential only
        </button>
      </div>
    </div>
  )
}
