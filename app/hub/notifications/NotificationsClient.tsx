'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Bell, Package, Truck, Sparkles, RefreshCw, Tag, Percent, ShieldCheck, CalendarDays, Megaphone,
  Search, Check, Archive, ArchiveRestore, CheckCheck, type LucideIcon,
} from 'lucide-react'
import { NOTIFICATION_CATEGORIES, type NotificationCategory } from '@/lib/notifications'

interface Note {
  id: string
  category: string
  title: string
  body: string | null
  href: string | null
  read: boolean
  archived: boolean
  at: string
}

const META: Record<string, { icon: LucideIcon; tone: string }> = {
  ORDER: { icon: Package, tone: '#2d8a5a' },
  SHIPPING: { icon: Truck, tone: '#2f7cd6' },
  NEW_PRODUCT: { icon: Sparkles, tone: '#8a5cd6' },
  RESTOCK: { icon: RefreshCw, tone: '#2d8a5a' },
  DISCOUNT: { icon: Tag, tone: '#e0872a' },
  PROMOTION: { icon: Percent, tone: '#e0872a' },
  WARRANTY: { icon: ShieldCheck, tone: '#2f7cd6' },
  EVENT: { icon: CalendarDays, tone: '#8a5cd6' },
  ANNOUNCEMENT: { icon: Megaphone, tone: '#555' },
}

function relTime(iso: string): string {
  const d = new Date(iso)
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function NotificationsClient() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [filter, setFilter] = useState<NotificationCategory | 'ALL'>('ALL')
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/notifications${showArchived ? '?archived=1' : ''}`)
    if (res.ok) setNotes((await res.json()).notifications)
    setLoading(false)
  }, [showArchived])

  useEffect(() => { load() }, [load])

  const patch = async (id: string, data: { read?: boolean; archived?: boolean }) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...data } : n)))
    await fetch(`/api/notifications/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (data.archived !== undefined) load()
  }

  const markAllRead = async () => {
    setNotes((prev) => prev.map((n) => ({ ...n, read: true })))
    await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'read-all' }) })
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return notes.filter((n) => {
      if (filter !== 'ALL' && n.category !== filter) return false
      if (q && !(`${n.title} ${n.body ?? ''}`.toLowerCase().includes(q))) return false
      return true
    })
  }, [notes, filter, query])

  const unread = notes.filter((n) => !n.read && !n.archived).length
  // Only show category chips that actually have notifications, plus "All".
  const presentCats = new Set(notes.map((n) => n.category))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notifications"
            style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: 999, border: '1px solid var(--color-border)', fontSize: 13.5, fontFamily: 'inherit' }}
          />
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={unread === 0}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 999, border: '1px solid var(--color-border)', background: '#fff', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-display)', cursor: unread === 0 ? 'default' : 'pointer', opacity: unread === 0 ? 0.5 : 1, color: 'var(--color-text)' }}
        >
          <CheckCheck size={14} /> Mark all read
        </button>
        <button
          type="button"
          onClick={() => setShowArchived((v) => !v)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 999, border: '1px solid var(--color-border)', background: showArchived ? 'var(--ke-green-50,#eef7ee)' : '#fff', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-display)', cursor: 'pointer', color: 'var(--color-text)' }}
        >
          <Archive size={14} /> {showArchived ? 'Archived' : 'Inbox'}
        </button>
      </div>

      {/* Category filter chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Chip active={filter === 'ALL'} onClick={() => setFilter('ALL')}>All</Chip>
        {NOTIFICATION_CATEGORIES.filter((c) => presentCats.has(c.id)).map((c) => (
          <Chip key={c.id} active={filter === c.id} onClick={() => setFilter(c.id)}>{c.label}</Chip>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', padding: '20px 4px' }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: '#fff', border: '1px solid var(--color-border)', borderRadius: 16 }}>
          <Bell size={26} style={{ color: 'var(--ke-green-600)', margin: '0 auto 12px' }} />
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>
            {showArchived ? 'Nothing archived' : query || filter !== 'ALL' ? 'No matching notifications' : 'You’re all caught up'}
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '6px 0 0' }}>
            {showArchived ? 'Archived notifications will appear here.' : 'Order updates, shipping, restocks, discounts and announcements land here.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((n) => {
            const m = META[n.category] ?? { icon: Bell, tone: '#555' }
            const Icon = m.icon
            return (
              <div
                key={n.id}
                style={{
                  display: 'flex', gap: 13, padding: 16, borderRadius: 14,
                  background: !n.read && !n.archived ? 'var(--ke-green-50,#eef7ee)' : '#fff',
                  border: `1px solid ${!n.read && !n.archived ? 'rgba(45,138,90,.3)' : 'var(--color-border)'}`,
                }}
              >
                <span style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${m.tone}1a`, color: m.tone }}>
                  <Icon size={18} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {!n.read && !n.archived && <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--ke-green-500,#4bab6b)', flexShrink: 0 }} />}
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{n.title}</span>
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{relTime(n.at)}</span>
                  </div>
                  {n.body && <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '4px 0 0', lineHeight: 1.45 }}>{n.body}</p>}
                  <div style={{ display: 'flex', gap: 14, marginTop: 10, alignItems: 'center' }}>
                    {n.href && (
                      <Link href={n.href} onClick={() => !n.read && patch(n.id, { read: true })} style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, color: 'var(--ke-green-700)' }}>
                        View →
                      </Link>
                    )}
                    {!n.archived && !n.read && (
                      <button type="button" onClick={() => patch(n.id, { read: true })} style={actionBtn}><Check size={13} /> Mark read</button>
                    )}
                    {n.archived ? (
                      <button type="button" onClick={() => patch(n.id, { archived: false })} style={actionBtn}><ArchiveRestore size={13} /> Restore</button>
                    ) : (
                      <button type="button" onClick={() => patch(n.id, { archived: true })} style={actionBtn}><Archive size={13} /> Archive</button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const actionBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none',
  padding: 0, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5,
  color: 'var(--color-text-muted)',
} as const

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 13px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-display)', cursor: 'pointer',
        border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
        background: active ? 'var(--color-primary)' : '#fff',
        color: active ? '#fff' : 'var(--color-text)',
      }}
    >
      {children}
    </button>
  )
}
