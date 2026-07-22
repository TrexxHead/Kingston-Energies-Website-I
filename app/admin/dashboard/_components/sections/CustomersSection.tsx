'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import Badge from '../ui/Badge'
import Pill from '../ui/Pill'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import TextInput from '../ui/TextInput'
import { cardStyle, h3Style } from '../ui/card'
import { fmt } from '../mockData'
import { initials } from '@/lib/initials'
import { CUSTOMER_NEEDS, customerNeedLabel, type CustomerNeed } from '@/lib/crm'

type Segment = 'VIP' | 'REPEAT' | 'NEW'
type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'

interface CustomerRow {
  id: string
  name: string
  email: string
  phone: string | null
  segment: Segment | null
  loyaltyTier: string | null
  primaryNeed: CustomerNeed | null
  since: number
  orderCount: number
  ltv: number
}

interface CustomerDetail extends CustomerRow {
  orders: { orderNo: string; status: string; total: number; date: string; items: string[] }[]
  tickets: { id: string; subject: string; status: TicketStatus }[]
}

const SEGMENT_PILLS: { id: 'all' | Segment; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'VIP', label: 'VIP' },
  { id: 'REPEAT', label: 'Repeat' },
  { id: 'NEW', label: 'New' },
]

const SEGMENT_TONE: Record<Segment, 'green' | 'blue' | 'orange'> = { VIP: 'green', REPEAT: 'blue', NEW: 'orange' }
const SEGMENT_LABEL: Record<Segment, string> = { VIP: 'VIP', REPEAT: 'Repeat', NEW: 'New' }
const TICKET_STAGES: Record<TicketStatus, { label: string; tone: 'orange' | 'blue' | 'green' }> = {
  OPEN: { label: 'Open', tone: 'orange' },
  IN_PROGRESS: { label: 'In progress', tone: 'blue' },
  RESOLVED: { label: 'Resolved', tone: 'green' },
}
const NEXT_STATUS: Record<TicketStatus, TicketStatus> = { OPEN: 'IN_PROGRESS', IN_PROGRESS: 'RESOLVED', RESOLVED: 'OPEN' }
const avatarGradient = { background: 'var(--gradient-brand)' }

export default function CustomersSection() {
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [seg, setSeg] = useState<'all' | Segment>('all')
  const [search, setSearch] = useState('')
  const [selId, setSelId] = useState<string | null>(null)
  const [detail, setDetail] = useState<CustomerDetail | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', segment: 'NEW', loyaltyTier: 'Bronze' })
  const [ticketOpen, setTicketOpen] = useState(false)
  const [ticketSubject, setTicketSubject] = useState('')
  const [busy, setBusy] = useState(false)

  const loadCustomers = useCallback(async () => {
    const res = await fetch('/api/admin/customers')
    if (res.ok) {
      const list: CustomerRow[] = (await res.json()).customers
      setCustomers(list)
      setSelId((prev) => prev ?? list[0]?.id ?? null)
    }
  }, [])

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/customers/${id}`)
    if (res.ok) setDetail((await res.json()).customer)
  }, [])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  useEffect(() => {
    if (selId) loadDetail(selId)
  }, [selId, loadDetail])

  const rows = customers.filter((c) => {
    if (seg !== 'all' && c.segment !== seg) return false
    if (search && !`${c.name} ${c.email}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const patchDetail = async (data: Record<string, string | null>) => {
    if (!detail) return
    await fetch(`/api/admin/customers/${detail.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    loadDetail(detail.id)
    loadCustomers()
  }

  const createCustomer = async () => {
    setBusy(true)
    const res = await fetch('/api/admin/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, segment: form.segment as Segment }),
    })
    setBusy(false)
    if (res.ok) {
      setAddOpen(false)
      setForm({ name: '', email: '', phone: '', segment: 'NEW', loyaltyTier: 'Bronze' })
      const created = await res.json()
      await loadCustomers()
      setSelId(created.id)
    }
  }

  const createTicket = async () => {
    if (!detail) return
    setBusy(true)
    const res = await fetch('/api/admin/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: detail.id, customerName: detail.name, subject: ticketSubject }),
    })
    setBusy(false)
    if (res.ok) {
      setTicketOpen(false)
      setTicketSubject('')
      loadDetail(detail.id)
    }
  }

  const cycleTicket = async (id: string, status: TicketStatus) => {
    await fetch(`/api/admin/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: NEXT_STATUS[status] }),
    })
    if (detail) loadDetail(detail.id)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SEGMENT_PILLS.map((p) => (
              <Pill key={p.id} label={p.label} selected={seg === p.id} onClick={() => setSeg(p.id)} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 11, top: 10, color: 'var(--color-text-subtle)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                style={{ height: 34, padding: '0 12px 0 32px', border: '1px solid var(--color-border)', borderRadius: 999, fontSize: 12.5, outline: 'none', fontFamily: 'var(--font-body)' }}
              />
            </div>
            <Button size="sm" variant="primary" onClick={() => setAddOpen(true)} iconRight={<Plus size={14} />}>Add</Button>
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          {rows.map((c) => {
            const isSelected = c.id === selId
            return (
              <div
                key={c.id}
                onClick={() => setSelId(c.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderTop: '1px solid var(--color-border)', cursor: 'pointer', background: isSelected ? 'var(--ke-green-50)' : 'transparent' }}
              >
                <div style={{ width: 34, height: 34, borderRadius: '50%', ...avatarGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                  {initials(c.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5 }}>{c.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>
                    {c.orderCount} orders · since {c.since}
                    {c.primaryNeed ? ` · ${customerNeedLabel(c.primaryNeed)}` : ''}
                  </div>
                </div>
                {c.segment && <Badge tone={SEGMENT_TONE[c.segment]}>{SEGMENT_LABEL[c.segment]}</Badge>}
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13.5, width: 60, textAlign: 'right' }}>{fmt(Math.round(c.ltv))}</span>
              </div>
            )
          })}
          {rows.length === 0 && (
            <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>No customers match.</div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {detail && (
          <>
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', ...avatarGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                  {initials(detail.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>{detail.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{detail.email}{detail.phone ? ` · ${detail.phone}` : ''} · CLV {fmt(Math.round(detail.ltv))}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <label style={{ flex: 1 }}>
                  <span style={overline}>SEGMENT</span>
                  <select value={detail.segment ?? 'NEW'} onChange={(e) => patchDetail({ segment: e.target.value })} style={detailSelect}>
                    <option value="VIP">VIP</option>
                    <option value="REPEAT">Repeat</option>
                    <option value="NEW">New</option>
                  </select>
                </label>
                <label style={{ flex: 1 }}>
                  <span style={overline}>LOYALTY TIER</span>
                  <select value={detail.loyaltyTier ?? 'Bronze'} onChange={(e) => patchDetail({ loyaltyTier: e.target.value })} style={detailSelect}>
                    <option>Gold</option>
                    <option>Silver</option>
                    <option>Bronze</option>
                  </select>
                </label>
              </div>

              <label style={{ display: 'block', marginBottom: 14 }}>
                <span style={overline}>PRIMARY NEED</span>
                <select value={detail.primaryNeed ?? ''} onChange={(e) => patchDetail({ primaryNeed: e.target.value === '' ? null : e.target.value })} style={detailSelect}>
                  <option value="">Unknown</option>
                  {CUSTOMER_NEEDS.map((n) => (
                    <option key={n.id} value={n.id}>{n.label}</option>
                  ))}
                </select>
              </label>

              <div style={overline}>PURCHASE HISTORY</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {detail.orders.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>No orders yet.</div>}
                {detail.orders.map((o) => (
                  <div key={o.orderNo} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>{o.orderNo}</span> · {o.items.join(', ')}
                    </span>
                    <span style={{ whiteSpace: 'nowrap' }}>{fmt(o.total)} · {o.date}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ ...h3Style, margin: 0 }}>Support tickets</h3>
                <Button size="sm" variant="outline" onClick={() => setTicketOpen(true)} iconRight={<Plus size={13} />}>New</Button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {detail.tickets.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>No tickets.</div>}
                {detail.tickets.map((t) => {
                  const stage = TICKET_STAGES[t.status]
                  return (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ flex: 1, fontSize: 12.5 }}>{t.subject}</span>
                      <Badge tone={stage.tone} dot onClick={() => cycleTicket(t.id, t.status)}>{stage.label}</Badge>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {addOpen && (
        <Modal
          title="Add customer"
          onClose={() => setAddOpen(false)}
          footer={
            <>
              <Button size="sm" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={createCustomer}>{busy ? 'Saving…' : 'Add'}</Button>
            </>
          }
        >
          <TextInput label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <TextInput label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
          <TextInput label="Phone (optional)" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <TextInput label="Segment" value={form.segment} onChange={(v) => setForm({ ...form, segment: v })} options={['VIP', 'REPEAT', 'NEW']} />
            <TextInput label="Loyalty tier" value={form.loyaltyTier} onChange={(v) => setForm({ ...form, loyaltyTier: v })} options={['Gold', 'Silver', 'Bronze']} />
          </div>
        </Modal>
      )}

      {ticketOpen && (
        <Modal
          title="New support ticket"
          onClose={() => setTicketOpen(false)}
          footer={
            <>
              <Button size="sm" variant="outline" onClick={() => setTicketOpen(false)}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={createTicket}>{busy ? 'Saving…' : 'Create'}</Button>
            </>
          }
        >
          <TextInput label="Subject" value={ticketSubject} onChange={setTicketSubject} placeholder="Describe the issue" />
        </Modal>
      )}
    </div>
  )
}

const overline = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '.14em',
  color: 'var(--color-text-muted)',
  display: 'block',
  marginBottom: 6,
} as const

const detailSelect = {
  width: '100%',
  height: 36,
  padding: '0 10px',
  border: '1.5px solid var(--color-border)',
  borderRadius: 9,
  fontFamily: 'var(--font-body)',
  fontSize: 13,
  background: '#fff',
  color: 'var(--color-text)',
  outline: 'none',
  appearance: 'none',
} as const
