'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { cardStyle, h3Style } from '../../ui/card'
import Button from '../../ui/Button'
import Badge from '../../ui/Badge'
import TextInput from '../../ui/TextInput'
import { PARISHES } from '@/lib/map/parishes'
import { WINDOW_LABEL, type ServicesConfig, type Service, type BookingWindow } from '@/lib/bookings/config'

interface Booking {
  id: string
  bookingNo: string
  serviceName: string
  date: string
  window: BookingWindow
  customerName: string
  email: string | null
  phone: string
  parish: string
  address: string | null
  notes: string | null
  status: string
  depositAmount: number
  depositStatus: string
  staffNote: string | null
  createdAt: string
}

const muted = { color: 'var(--color-text-muted)', fontSize: 13 } as const
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const STATUS_TONE: Record<string, 'blue' | 'green' | 'orange' | 'neutral'> = { requested: 'orange', confirmed: 'blue', completed: 'green', cancelled: 'neutral' }

/** Service bookings (roadmap W5): the bookings list and the owner-entered services, capacity and deposit terms. */
export default function BookingsSection() {
  const [scope, setScope] = useState<'upcoming' | 'past'>('upcoming')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/bookings?scope=${scope}`)
    if (r.ok) setBookings((await r.json()).bookings)
  }, [scope])
  useEffect(() => {
    load()
  }, [load])

  async function patch(id: string, body: Record<string, string>) {
    const r = await fetch(`/api/admin/bookings/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setMsg(r.ok ? 'Saved.' : (await r.json()).error)
    load()
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <h3 style={{ ...h3Style, margin: 0 }}>Bookings</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['upcoming', 'past'] as const).map((s) => (
              <Button key={s} size="sm" variant={scope === s ? 'primary' : 'outline'} onClick={() => setScope(s)}>{s}</Button>
            ))}
          </div>
        </div>
        <p style={{ ...muted, margin: '8px 0 12px' }}>Online deposits are marked paid only by Fygaro’s signed confirmation. Record a deposit paid another way (bank transfer, cash) with “Deposit received”.</p>
        {msg && <p role="status" style={{ fontSize: 13 }}>{msg}</p>}
        {bookings.length === 0 ? (
          <p style={muted}>No {scope} bookings.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {bookings.map((b) => (
              <div key={b.id} style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13.5, minWidth: 260, flex: 1 }}>
                  <Badge tone={STATUS_TONE[b.status] ?? 'neutral'}>{b.status}</Badge> <strong>{b.date} · {WINDOW_LABEL[b.window]}</strong> — {b.serviceName}
                  <div>{b.customerName} · <a href={`tel:${b.phone}`}>{b.phone}</a>{b.email ? ` · ${b.email}` : ''} · {PARISHES.find((p) => p.id === b.parish)?.name ?? b.parish}</div>
                  {b.address && <div style={muted}>{b.address}</div>}
                  {b.notes && <div style={{ ...muted, whiteSpace: 'pre-wrap' }}>{b.notes}</div>}
                  <div style={muted}>
                    {b.bookingNo} · deposit {b.depositAmount > 0 ? `J$${b.depositAmount.toLocaleString()} — ${b.depositStatus}` : 'none'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'start' }}>
                  {b.status === 'requested' && <Button size="sm" onClick={() => patch(b.id, { status: 'confirmed' })}>Confirm</Button>}
                  {b.status === 'confirmed' && <Button size="sm" onClick={() => patch(b.id, { status: 'completed' })}>Mark done</Button>}
                  {b.depositStatus === 'pending' && <Button size="sm" variant="outline" onClick={() => patch(b.id, { depositStatus: 'paid' })}>Deposit received</Button>}
                  {b.depositStatus === 'paid' && b.status === 'cancelled' && <Button size="sm" variant="outline" onClick={() => patch(b.id, { depositStatus: 'refunded' })}>Deposit refunded</Button>}
                  {b.status !== 'cancelled' && b.status !== 'completed' && <Button size="sm" variant="outline" onClick={() => confirm(`Cancel ${b.bookingNo}?`) && patch(b.id, { status: 'cancelled' })}>Cancel</Button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <ServicesEditor onSaved={setMsg} />
    </div>
  )
}

type SvcDraft = Omit<Service, 'depositJmd'> & { deposit: string }

function ServicesEditor({ onSaved }: { onSaved: (m: string) => void }) {
  const [cfg, setCfg] = useState<ServicesConfig | null>(null)
  const [svcs, setSvcs] = useState<SvcDraft[]>([])
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    fetch('/api/admin/services-config')
      .then((r) => r.json())
      .then((d) => {
        setCfg(d.config)
        setSvcs(d.config.services.map((s: Service) => ({ ...s, deposit: String(s.depositJmd) })))
      })
  }, [])
  if (!cfg) return <div style={cardStyle}><p style={muted}>Loading services…</p></div>
  const setSvc = (i: number, patch: Partial<SvcDraft>) => setSvcs(svcs.map((s, j) => (j === i ? { ...s, ...patch } : s)))

  async function save() {
    setErr(null)
    const body = { ...cfg, services: svcs.map(({ deposit, ...s }) => ({ ...s, depositJmd: Number(deposit.replace(/,/g, '')) || 0 })) }
    const r = await fetch('/api/admin/services-config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const d = await r.json()
    if (!r.ok) return setErr(d.error)
    setCfg(d.config)
    onSaved('Services saved — /book updates straight away.')
  }

  return (
    <div style={{ ...cardStyle, display: 'grid', gap: 12 }}>
      <h3 style={{ ...h3Style, margin: 0 }}>Services, capacity and deposit terms</h3>
      <p style={{ ...muted, margin: 0 }}>What customers can book at /book. Nothing is offered until you add a service and set capacity. State prices the way you quote them (e.g. “Quoted after the visit”).</p>
      {svcs.map((s, i) => (
        <div key={i} style={{ display: 'grid', gap: 8, padding: 10, border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8, alignItems: 'end' }}>
            <TextInput label="Name" value={s.name} onChange={(v) => setSvc(i, { name: v, id: s.id || v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) })} />
            <TextInput label="Id (in links)" value={s.id} onChange={(v) => setSvc(i, { id: v })} />
            <TextInput label="Deposit J$ (0 = none)" value={s.deposit} onChange={(v) => setSvc(i, { deposit: v })} />
            <TextInput label="Price note" value={s.priceNote} onChange={(v) => setSvc(i, { priceNote: v })} placeholder="Quoted after the visit" />
          </div>
          <TextInput label="Description" value={s.description} onChange={(v) => setSvc(i, { description: v })} />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <label style={{ ...muted, display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={s.active} onChange={(e) => setSvc(i, { active: e.target.checked })} /> Bookable
            </label>
            <Button size="sm" variant="outline" ariaLabel={`Remove ${s.name || 'service'}`} onClick={() => setSvcs(svcs.filter((_, j) => j !== i))}><Trash2 size={13} /></Button>
          </div>
        </div>
      ))}
      <div><Button size="sm" variant="outline" onClick={() => setSvcs([...svcs, { id: '', name: '', description: '', priceNote: '', deposit: '0', active: true }])} iconRight={<Plus size={14} />}>Add service</Button></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8 }}>
        <TextInput label="Morning visits per day" value={String(cfg.capacity.morning)} onChange={(v) => setCfg({ ...cfg, capacity: { ...cfg.capacity, morning: Number(v) || 0 } })} />
        <TextInput label="Afternoon visits per day" value={String(cfg.capacity.afternoon)} onChange={(v) => setCfg({ ...cfg, capacity: { ...cfg.capacity, afternoon: Number(v) || 0 } })} />
        <TextInput label="Earliest: days ahead" value={String(cfg.leadDays)} onChange={(v) => setCfg({ ...cfg, leadDays: Number(v) || 0 })} />
        <TextInput label="Latest: days ahead" value={String(cfg.horizonDays)} onChange={(v) => setCfg({ ...cfg, horizonDays: Number(v) || 1 })} />
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', ...muted }}>
        Closed on:
        {DAYS.map((d, i) => (
          <label key={d} style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
            <input type="checkbox" checked={cfg.closedWeekdays.includes(i)} onChange={(e) => setCfg({ ...cfg, closedWeekdays: e.target.checked ? [...cfg.closedWeekdays, i] : cfg.closedWeekdays.filter((x) => x !== i) })} /> {d}
          </label>
        ))}
      </div>
      <TextInput label="Deposit terms shown before paying (refunds, what it covers)" value={cfg.depositTerms} onChange={(v) => setCfg({ ...cfg, depositTerms: v })} multiline />
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Button size="sm" onClick={save}>Save services</Button>
        {err && <span role="alert" style={{ ...muted, color: 'var(--color-danger)' }}>{err}</span>}
      </div>
    </div>
  )
}
