'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

interface Announcement {
  enabled: boolean
  message: string
  link: string
  style: 'marquee' | 'bar'
}

/**
 * Slim, admin-controlled announcement across the very top of every page. Two
 * looks: a static centred "bar", or a scrolling "marquee" billboard. Dismissible
 * per-message (remembered in localStorage) so it's never nagging.
 */
export default function AnnouncementBar() {
  const [a, setA] = useState<Announcement | null>(null)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    fetch('/api/announcement')
      .then((r) => (r.ok ? r.json() : { announcement: null }))
      .then((d: { announcement: Announcement | null }) => {
        if (!d.announcement) return
        setA(d.announcement)
        try {
          setDismissed(localStorage.getItem('ke-ann-dismissed') === d.announcement.message)
        } catch {
          setDismissed(false)
        }
      })
      .catch(() => {})
  }, [])

  if (!a || dismissed) return null

  const dismiss = () => {
    try {
      localStorage.setItem('ke-ann-dismissed', a.message)
    } catch {
      // ignore
    }
    setDismissed(true)
  }

  const inner = a.link ? (
    <Link href={a.link} style={{ color: 'inherit', textDecoration: 'none' }}>{a.message}</Link>
  ) : (
    <span>{a.message}</span>
  )

  return (
    <div
      role="region"
      aria-label="Site announcement"
      style={{
        position: 'relative',
        background: 'var(--gradient-brand, linear-gradient(90deg,#2f6b62,#04547c))',
        color: '#fff',
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: 13,
        lineHeight: 1,
        height: 34,
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      {a.style === 'marquee' ? (
        <div style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap' }}>
          <div style={{ display: 'inline-block', paddingLeft: '100%', animation: 'keMarquee 18s linear infinite' }}>
            {inner}
            <span aria-hidden style={{ padding: '0 60px' }}>•</span>
            {inner}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, textAlign: 'center', padding: '0 40px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {inner}
        </div>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        style={{ position: 'absolute', right: 8, top: 0, bottom: 0, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.85 }}
      >
        <X size={15} />
      </button>
    </div>
  )
}
