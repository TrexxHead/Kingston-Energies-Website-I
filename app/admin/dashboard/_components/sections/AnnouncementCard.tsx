'use client'

import { useCallback, useEffect, useState } from 'react'
import { Megaphone, Check } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Button from '../ui/Button'
import TextInput from '../ui/TextInput'
import Switch from '../ui/Switch'

interface Announcement {
  enabled: boolean
  message: string
  link: string
  style: 'marquee' | 'bar'
}

/**
 * Admin control for the site-wide announcement bar. Whatever's set here shows
 * across the very top of every storefront page (as a scrolling billboard or a
 * static bar) the moment it's saved.
 */
export default function AnnouncementCard() {
  const [a, setA] = useState<Announcement | null>(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/announcement')
    if (res.ok) setA((await res.json()).announcement)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    if (!a) return
    setBusy(true)
    setSaved(false)
    const res = await fetch('/api/admin/announcement', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(a),
    })
    setBusy(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  if (!a) {
    return (
      <div style={cardStyle}>
        <h3 style={h3Style}>Site announcement</h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading…</p>
      </div>
    )
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Megaphone size={17} color="var(--ke-green-600)" />
          <h3 style={{ ...h3Style, margin: 0 }}>Site announcement</h3>
        </div>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>{a.enabled ? 'Live' : 'Off'}</span>
          <Switch checked={a.enabled} onChange={(v) => setA({ ...a, enabled: v })} />
        </span>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '0 0 14px' }}>
        Shows a slim bar across the top of every page. Keep it short and punchy.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <TextInput label="Message" value={a.message} onChange={(v) => setA({ ...a, message: v })} placeholder="🎉 Flash sale — 20% off power banks this weekend!" />
        <TextInput label="Link (optional)" value={a.link} onChange={(v) => setA({ ...a, link: v })} placeholder="/shop" />
        <TextInput label="Style" value={a.style} onChange={(v) => setA({ ...a, style: v as Announcement['style'] })} options={['marquee', 'bar']} />
      </div>

      {/* Live preview */}
      {a.message.trim() && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', color: 'var(--color-text-muted)', marginBottom: 6 }}>PREVIEW</div>
          <div style={{ height: 34, borderRadius: 8, overflow: 'hidden', background: 'var(--gradient-brand, linear-gradient(90deg,#2f6b62,#04547c))', color: '#fff', display: 'flex', alignItems: 'center', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>
            {a.style === 'marquee' ? (
              <div style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'inline-block', paddingLeft: '100%', animation: 'keMarquee 18s linear infinite' }}>{a.message}</div>
              </div>
            ) : (
              <div style={{ flex: 1, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 12px' }}>{a.message}</div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
        <Button size="sm" variant="primary" onClick={save}>{busy ? 'Saving…' : 'Save announcement'}</Button>
        {saved && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--ke-green-700)' }}>
            <Check size={14} /> Saved — it's live on the site
          </span>
        )}
      </div>
    </div>
  )
}
