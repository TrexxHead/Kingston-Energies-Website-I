'use client'

import { useCallback, useEffect, useState } from 'react'
import { Mail, Phone } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Badge from '../ui/Badge'

type Status = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST'

interface Lead {
  id: string
  name: string
  email: string
  phone: string | null
  message: string
  status: Status
  createdAt: string
}

const STATUSES: Status[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST']
const STATUS_TONE: Record<Status, 'blue' | 'orange' | 'green' | 'neutral' | 'red'> = {
  NEW: 'blue', CONTACTED: 'orange', QUALIFIED: 'orange', CONVERTED: 'green', LOST: 'red',
}

/** Contact-form enquiries (app/api/contact/route.ts), tracked through to converted or lost. */
export default function LeadsCard() {
  const [items, setItems] = useState<Lead[]>([])
  const [filter, setFilter] = useState<Status | 'ALL'>('ALL')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/leads')
    if (res.ok) setItems((await res.json()).leads)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const setStatus = async (id: string, status: Status) => {
    setItems((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)))
    await fetch(`/api/admin/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    load()
  }

  const visible = filter === 'ALL' ? items : items.filter((l) => l.status === filter)

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ ...h3Style, margin: 0 }}>Leads</h3>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['ALL', ...STATUSES] as const).map((s) => (
            <Badge key={s} tone={filter === s ? 'green' : 'neutral'} onClick={() => setFilter(s)}>{s === 'ALL' ? 'All' : s[0] + s.slice(1).toLowerCase()}</Badge>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0 }}>No leads{filter !== 'ALL' ? ` with status ${filter.toLowerCase()}` : ' yet'}.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visible.map((l) => (
            <div key={l.id} style={{ padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 11 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5 }}>{l.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Mail size={11} />{l.email}</span>
                    {l.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Phone size={11} />{l.phone}</span>}
                    <span>{new Date(l.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>
                <select
                  value={l.status}
                  onChange={(e) => setStatus(l.id, e.target.value as Status)}
                  style={{ height: 28, padding: '0 8px', borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 12, background: 'var(--color-surface)' }}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>
                  ))}
                </select>
                <Badge tone={STATUS_TONE[l.status]}>{l.status[0] + l.status.slice(1).toLowerCase()}</Badge>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--color-text)', margin: 0, lineHeight: 1.5 }}>{l.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
