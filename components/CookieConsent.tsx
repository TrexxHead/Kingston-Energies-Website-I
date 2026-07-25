'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Cookie } from 'lucide-react'

/**
 * Compact, non-blocking cookie notice tucked into the bottom-left corner. Slides
 * up + fades in on load, dismisses smoothly. Frosted glass to match the site.
 * Records the choice for a year in localStorage + a `ke-cookie-consent` cookie.
 */
const KEY = 'ke-cookie-consent'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    let needed = true
    try {
      needed = !localStorage.getItem(KEY)
    } catch {
      needed = true
    }
    if (!needed) return
    setVisible(true)
    const t = setTimeout(() => setShown(true), 60) // trigger the slide-in
    return () => clearTimeout(t)
  }, [])

  const choose = (choice: 'accepted' | 'declined') => {
    try {
      localStorage.setItem(KEY, choice)
    } catch {
      // ignore
    }
    document.cookie = `${KEY}=${choice}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
    setShown(false) // animate out
    setTimeout(() => setVisible(false), 340)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      style={{
        position: 'fixed',
        left: 20,
        bottom: 20,
        zIndex: 70,
        width: 'min(340px, calc(100vw - 40px))',
        background: 'rgba(255,255,255,.82)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        border: '1px solid rgba(16,24,20,.08)',
        borderRadius: 16,
        boxShadow: '0 16px 40px -12px rgba(16,24,20,.28)',
        padding: 16,
        opacity: shown ? 1 : 0,
        transform: shown ? 'translateY(0) scale(1)' : 'translateY(16px) scale(.98)',
        transition: 'opacity .35s cubic-bezier(.16,1,.3,1), transform .35s cubic-bezier(.16,1,.3,1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
        <span style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--ke-green-50)', color: 'var(--ke-green-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Cookie size={16} />
        </span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--color-text)' }}>Cookies</span>
      </div>
      <p style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--color-text-muted)', margin: '0 0 12px' }}>
        We use cookies to keep you signed in, remember your cart and improve the site.{' '}
        <Link href="/legal/privacy" style={{ color: 'var(--ke-green-700)' }}>Learn more</Link>.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => choose('accepted')}
          style={{ flex: 1, height: 36, borderRadius: 999, border: 'none', background: 'var(--color-primary)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}
        >
          Accept
        </button>
        <button
          type="button"
          onClick={() => choose('declined')}
          style={{ flex: 1, height: 36, borderRadius: 999, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-muted)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}
        >
          Essential only
        </button>
      </div>
    </div>
  )
}
