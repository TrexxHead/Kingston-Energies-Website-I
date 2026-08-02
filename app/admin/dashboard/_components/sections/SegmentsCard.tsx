'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, Users } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import TextInput from '../ui/TextInput'

interface Criteria {
  tiers?: string[]
  needs?: string[]
  minTotalSpent?: number
  minOrders?: number
  signedUpAfter?: string
  signedUpBefore?: string
  lastPurchaseWithinDays?: number
  neverPurchased?: boolean
}

interface Segment {
  id: string
  name: string
  description: string | null
  criteria: Criteria
  size: number
}

const TIERS = ['VIP', 'REPEAT', 'NEW']
const NEEDS = ['EVERYDAY', 'BACKUP', 'OFFGRID', 'BUSINESS']

const emptyForm = {
  name: '',
  description: '',
  tiers: [] as string[],
  needs: [] as string[],
  minTotalSpent: '',
  minOrders: '',
  lastPurchaseWithinDays: '',
  neverPurchased: false,
}

function criteriaFromForm(f: typeof emptyForm): Criteria {
  const c: Criteria = {}
  if (f.tiers.length) c.tiers = f.tiers
  if (f.needs.length) c.needs = f.needs
  if (f.minTotalSpent) c.minTotalSpent = Number(f.minTotalSpent)
  if (f.minOrders) c.minOrders = Number(f.minOrders)
  if (f.lastPurchaseWithinDays) c.lastPurchaseWithinDays = Number(f.lastPurchaseWithinDays)
  if (f.neverPurchased) c.neverPurchased = true
  return c
}

function summarize(c: Criteria): string {
  const parts: string[] = []
  if (c.tiers?.length) parts.push(c.tiers.join('/'))
  if (c.needs?.length) parts.push(c.needs.join('/').toLowerCase())
  if (c.minTotalSpent) parts.push(`spent ≥ J$${c.minTotalSpent.toLocaleString()}`)
  if (c.minOrders) parts.push(`≥${c.minOrders} orders`)
  if (c.lastPurchaseWithinDays) parts.push(`bought within ${c.lastPurchaseWithinDays}d`)
  if (c.neverPurchased) parts.push('never purchased')
  return parts.length ? parts.join(' · ') : 'Everyone'
}

/**
 * Saved, reusable customer filters usable as a campaign audience. Evaluated
 * live against real customer/order data (lib/segments.ts) — no membership
 * list to keep in sync, so the size shown is always current.
 */
export default function SegmentsCard() {
  const [items, setItems] = useState<Segment[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [preview, setPreview] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/segments')
    if (res.ok) setItems((await res.json()).segments)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!open) return
    const criteria = criteriaFromForm(form)
    if (Object.keys(criteria).length === 0) { setPreview(null); return }
    const t = setTimeout(() => {
      fetch('/api/admin/segments/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(criteria),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setPreview(d?.size ?? null))
        .catch(() => setPreview(null))
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form.tiers, form.needs, form.minTotalSpent, form.minOrders, form.lastPurchaseWithinDays, form.neverPurchased])

  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  const create = async () => {
    setError('')
    if (!form.name.trim()) { setError('Give the segment a name.'); return }
    setBusy(true)
    const res = await fetch('/api/admin/segments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, description: form.description || undefined, criteria: criteriaFromForm(form) }),
    })
    setBusy(false)
    if (res.ok) { setForm(emptyForm); setOpen(false); load() }
    else setError((await res.json().catch(() => ({}))).error ?? 'Could not create segment.')
  }

  const remove = async (id: string) => {
    await fetch(`/api/admin/segments/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ ...h3Style, margin: 0 }}>Segments</h3>
        <Button size="sm" variant="primary" onClick={() => { setForm(emptyForm); setError(''); setOpen(true) }} iconRight={<Plus size={14} />}>New segment</Button>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '0 0 12px' }}>
        Saved customer filters — pick one as a campaign's audience instead of emailing everyone.
      </p>

      {items.length === 0 ? (
        <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0 }}>No segments yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((s) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 10 }}>
              <Users size={15} style={{ color: 'var(--ke-green-600)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5 }}>{s.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--color-text-subtle)' }}>{s.description || summarize(s.criteria)}</div>
              </div>
              <Badge tone="neutral">{s.size} customers</Badge>
              <button type="button" onClick={() => remove(s.id)} aria-label={`Delete ${s.name}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex' }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal
          title="New segment"
          onClose={() => setOpen(false)}
          footer={
            <>
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={create}>{busy ? 'Saving…' : 'Create segment'}</Button>
            </>
          }
        >
          {error && <div style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)', borderRadius: 8, padding: '8px 10px', fontSize: 12, marginBottom: 10 }}>{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <TextInput label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="High-value repeat customers" />
            <TextInput label="Description (optional)" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />

            <div>
              <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, marginBottom: 6 }}>Tier</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {TIERS.map((t) => (
                  <Badge key={t} tone={form.tiers.includes(t) ? 'green' : 'neutral'} onClick={() => setForm({ ...form, tiers: toggle(form.tiers, t) })}>{t}</Badge>
                ))}
              </div>
            </div>

            <div>
              <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, marginBottom: 6 }}>Primary need</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {NEEDS.map((n) => (
                  <Badge key={n} tone={form.needs.includes(n) ? 'green' : 'neutral'} onClick={() => setForm({ ...form, needs: toggle(form.needs, n) })}>{n.toLowerCase()}</Badge>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <TextInput label="Min. lifetime spend (J$)" value={form.minTotalSpent} onChange={(v) => setForm({ ...form, minTotalSpent: v })} type="number" />
              <TextInput label="Min. orders" value={form.minOrders} onChange={(v) => setForm({ ...form, minOrders: v })} type="number" />
            </div>
            <TextInput label="Purchased within the last N days" value={form.lastPurchaseWithinDays} onChange={(v) => setForm({ ...form, lastPurchaseWithinDays: v })} type="number" placeholder="e.g. 90 for recently active" />
            <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5, color: 'var(--color-text)', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.neverPurchased} onChange={(e) => setForm({ ...form, neverPurchased: e.target.checked })} />
              Never purchased (leads/signups with no order yet)
            </label>

            <div style={{ background: 'var(--ke-green-50)', color: 'var(--ke-green-700)', borderRadius: 10, padding: '10px 12px', fontSize: 12.5, fontFamily: 'var(--font-display)', fontWeight: 600 }}>
              {preview === null ? 'Pick at least one filter to see the audience size.' : `${preview} customer${preview === 1 ? '' : 's'} match right now`}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
