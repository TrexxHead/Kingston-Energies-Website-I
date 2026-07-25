'use client'

import { useCallback, useEffect, useState } from 'react'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import { cardStyle, h3Style } from '../ui/card'
import { fmt } from '../mockData'
import { PIPELINE } from '@/lib/pipeline'

type OrderStatus = 'PENDING' | 'PACKED' | 'OUT' | 'DONE' | 'CANCELLED'

type OrderChannel = 'WEBSITE' | 'WHATSAPP' | 'INSTAGRAM'

interface Order {
  id: string
  orderNo: string
  customerName: string
  status: OrderStatus
  source: OrderChannel
  contact: string | null
  registered: boolean
  email: string | null
  phone: string | null
  shippingAddress: string | null
  cancelReason: string | null
  stage: number
  estimatedDelivery: string | null
  events: { id: string; type: string; label: string | null; note: string | null; adminOnly: boolean; at: string }[]
  paymentMethod: string | null
  paid: boolean
  invoiced: boolean
  total: number
  itemCount: number
  date: string
  items: { name: string; qty: number; price: number }[]
}

const PAYMENT_LABEL: Record<string, string> = {
  bank: 'Bank transfer', lynk: 'Lynk', paypal: 'PayPal', card: 'Card', cod: 'Cash on delivery',
}

const CHANNEL: Record<OrderChannel, { label: string; tone: 'green' | 'grey' } | null> = {
  WEBSITE: null,
  WHATSAPP: { label: 'WhatsApp', tone: 'green' },
  INSTAGRAM: { label: 'Instagram', tone: 'grey' },
}

const COLUMNS: { id: OrderStatus; label: string }[] = [
  { id: 'PENDING', label: 'Pending' },
  { id: 'PACKED', label: 'Packed' },
  { id: 'OUT', label: 'Out for delivery' },
  { id: 'DONE', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' },
]

export default function OrdersSection() {
  const [orders, setOrders] = useState<Order[]>([])
  const [dragId, setDragId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Order | null>(null)
  const [customerNote, setCustomerNote] = useState('')
  const [internalNote, setInternalNote] = useState('')
  const [stageBusy, setStageBusy] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/orders')
    if (res.ok) setOrders((await res.json()).orders)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const setStatus = async (id: string, status: OrderStatus) => {
    // optimistic update
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)))
    await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    load()
  }

  const [invoiceMsg, setInvoiceMsg] = useState('')

  const sendInvoice = async (id: string) => {
    setInvoiceMsg('Sending…')
    const res = await fetch(`/api/admin/orders/${id}/invoice`, { method: 'POST' })
    if (res.ok) {
      const { sent, to } = await res.json()
      setInvoiceMsg(sent ? `Invoice emailed to ${to}` : to ? 'Email provider not configured — use View invoice' : 'No email on file — use View invoice to share it')
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, invoiced: true } : o)))
      setDetail((d) => (d && d.id === id ? { ...d, invoiced: true } : d))
    } else {
      setInvoiceMsg('Could not send invoice')
    }
  }

  const setPaid = async (id: string, paid: boolean) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, paid } : o)))
    setDetail((d) => (d && d.id === id ? { ...d, paid } : d))
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paid }),
    })
    // Surface the auto-issued invoice result when marking paid.
    if (res.ok && paid) {
      const { invoice } = await res.json().catch(() => ({}))
      if (invoice?.sent) setInvoiceMsg(`Paid — invoice emailed to ${invoice.to}`)
      else if (invoice) setInvoiceMsg('Paid — invoice ready (View invoice to share)')
    }
    load()
  }

  const updateStage = async (id: string, body: { stage?: number; advance?: boolean; customerNote?: string; internalNote?: string }) => {
    setStageBusy(true)
    const res = await fetch(`/api/admin/orders/${id}/stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setStageBusy(false)
    if (res.ok) {
      setCustomerNote('')
      setInternalNote('')
      const fresh = await fetch('/api/admin/orders')
      if (fresh.ok) {
        const next: Order[] = (await fresh.json()).orders
        setOrders(next)
        setDetail((d) => (d ? next.find((o) => o.id === d.id) ?? null : d))
      }
    }
  }

  const handleDrop = (target: OrderStatus) => {
    if (dragId) {
      const dragged = orders.find((o) => o.id === dragId)
      if (dragged && dragged.status !== target) setStatus(dragId, target)
    }
    setDragId(null)
  }

  const cancelled = orders.filter((o) => o.status === 'CANCELLED')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
        Drag a card to move it between stages. Click a card for details.
      </p>

      <div className="kad-kanban" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, alignItems: 'start' }}>
        {COLUMNS.map((col) => {
          const cards = orders.filter((o) => o.status === col.id)
          return (
            <div
              key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(col.id)}
              style={{ background: 'var(--ke-gray-50,#f5f7f5)', borderRadius: 14, padding: 12, minHeight: 120 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 4px 10px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12.5 }}>{col.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>{cards.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cards.map((card) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={() => setDragId(card.id)}
                    onClick={() => { setInvoiceMsg(''); setCustomerNote(''); setInternalNote(''); setDetail(card) }}
                    style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 11, padding: '11px 12px', cursor: 'grab', boxShadow: 'var(--shadow-sm)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12.5 }}>{card.orderNo}</span>
                      {CHANNEL[card.source] && <Badge tone={CHANNEL[card.source]!.tone}>{CHANNEL[card.source]!.label}</Badge>}
                      <Badge tone={card.registered ? 'blue' : 'grey'}>{card.registered ? 'Registered' : 'Guest'}</Badge>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 3 }}>{card.customerName}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--color-text-muted)' }}>{card.itemCount} items</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {!card.paid && card.status !== 'CANCELLED' && <Badge tone="orange">Unpaid</Badge>}
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13 }}>{fmt(card.total)}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ ...cardStyle, marginTop: 6 }}>
        <h3 style={h3Style}>Refunds &amp; returns</h3>
        {cancelled.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>No cancelled orders right now.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cancelled.map((o) => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13 }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', width: 70 }}>{o.orderNo}</span>
                <span style={{ flex: 1 }}>{o.customerName} · {fmt(o.total)}</span>
                <Badge tone="orange">Cancelled</Badge>
                <Button variant="outline" size="sm" onClick={() => setStatus(o.id, 'PENDING')}>Restore</Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {detail && (
        <Modal title={`Order ${detail.orderNo}`} onClose={() => setDetail(null)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Customer</span>
            <span style={{ fontWeight: 600 }}>{detail.customerName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Placed</span>
            <span style={{ fontWeight: 600 }}>{detail.date}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Status</span>
            <span style={{ fontWeight: 600 }}>{COLUMNS.find((c) => c.id === detail.status)?.label}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Source</span>
            <span style={{ fontWeight: 600 }}>{CHANNEL[detail.source]?.label ?? 'Website'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Customer</span>
            <Badge tone={detail.registered ? 'blue' : 'grey'} dot>{detail.registered ? 'Registered' : 'Guest'}</Badge>
          </div>
          {detail.email && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Email</span>
              <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail.email}</span>
            </div>
          )}
          {(detail.phone || detail.contact) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Phone</span>
              <span style={{ fontWeight: 600 }}>{detail.phone ?? detail.contact}</span>
            </div>
          )}
          {detail.shippingAddress && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Ship to</span>
              <span style={{ fontWeight: 600, textAlign: 'right' }}>{detail.shippingAddress}</span>
            </div>
          )}
          {detail.status === 'CANCELLED' && detail.cancelReason && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Cancel reason</span>
              <span style={{ fontWeight: 600, textAlign: 'right', color: 'var(--color-danger)' }}>{detail.cancelReason}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Payment</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 600 }}>{detail.paymentMethod ? PAYMENT_LABEL[detail.paymentMethod] ?? detail.paymentMethod : '—'}</span>
              {detail.paid ? <Badge tone="green" dot>Paid</Badge> : <Badge tone="orange" dot>Unpaid</Badge>}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', gap: 8 }}>
              <a href={`/api/admin/orders/${detail.id}/invoice`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <Button size="sm" variant="outline">View invoice</Button>
              </a>
              <Button size="sm" variant="outline" onClick={() => sendInvoice(detail.id)}>
                {detail.invoiced ? 'Resend invoice' : 'Send invoice'}
              </Button>
            </span>
            <Button size="sm" variant={detail.paid ? 'outline' : 'primary'} onClick={() => setPaid(detail.id, !detail.paid)}>
              {detail.paid ? 'Mark as unpaid' : 'Mark as paid'}
            </Button>
          </div>
          {invoiceMsg && (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'right' }}>{invoiceMsg}</div>
          )}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {detail.items.map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span>{it.name}{it.qty > 1 ? ` × ${it.qty}` : ''}</span>
                <span style={{ fontWeight: 600 }}>{fmt(it.price * it.qty)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Total</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>{fmt(detail.total)}</span>
          </div>

          {detail.status !== 'CANCELLED' && (
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5 }}>Delivery pipeline</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>{detail.stage + 1}/{PIPELINE.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {PIPELINE.map((s, i) => {
                  const done = i <= detail.stage
                  const current = i === detail.stage
                  return (
                    <button
                      key={s.key}
                      type="button"
                      disabled={stageBusy}
                      onClick={() => updateStage(detail.id, { stage: i, customerNote: customerNote.trim() || undefined, internalNote: internalNote.trim() || undefined })}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                        padding: '6px 10px', borderRadius: 8, cursor: stageBusy ? 'default' : 'pointer',
                        background: current ? 'var(--ke-green-50,#eef7ee)' : 'transparent',
                        border: current ? '1px solid var(--ke-green-500)' : '1px solid transparent',
                      }}
                    >
                      <span style={{ width: 14, height: 14, borderRadius: 999, flexShrink: 0, background: done ? 'var(--ke-green-500)' : '#fff', border: done ? 'none' : '2px solid var(--color-border-strong)', color: '#fff', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{done ? '✓' : ''}</span>
                      <span style={{ fontSize: 12.5, fontWeight: current ? 700 : 500, color: done ? 'var(--color-text)' : 'var(--color-text-muted)' }}>{s.label}</span>
                    </button>
                  )
                })}
              </div>
              <textarea
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                placeholder="Customer-facing update (optional) — shown on their tracking page & emailed"
                rows={2}
                maxLength={400}
                style={{ width: '100%', resize: 'vertical', fontSize: 12.5, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--color-border)', fontFamily: 'inherit' }}
              />
              <textarea
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Internal note (admin only) — never shown to the customer"
                rows={2}
                maxLength={400}
                style={{ width: '100%', resize: 'vertical', fontSize: 12.5, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--color-border)', fontFamily: 'inherit', background: 'var(--ke-gray-50,#fafafa)' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <Button size="sm" onClick={() => updateStage(detail.id, { advance: true, customerNote: customerNote.trim() || undefined, internalNote: internalNote.trim() || undefined })} disabled={stageBusy || detail.stage >= PIPELINE.length - 1}>
                  {stageBusy ? 'Saving…' : 'Advance to next stage'}
                </Button>
                {(customerNote.trim() || internalNote.trim()) && (
                  <Button size="sm" variant="outline" onClick={() => updateStage(detail.id, { customerNote: customerNote.trim() || undefined, internalNote: internalNote.trim() || undefined })} disabled={stageBusy}>
                    Add note only
                  </Button>
                )}
              </div>

              {detail.events.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                  {detail.events.map((e) => (
                    <div key={e.id} style={{ display: 'flex', gap: 8, fontSize: 11.5, alignItems: 'baseline' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(e.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                      {e.adminOnly && <Badge tone="grey">Internal</Badge>}
                      <span style={{ color: 'var(--color-text-muted)' }}>
                        <strong style={{ color: 'var(--color-text)', fontWeight: 600 }}>{e.label}</strong>
                        {e.note ? ` — ${e.note}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
