'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import TextInput from '../ui/TextInput'
import { cardStyle, h3Style } from '../ui/card'
import { fmt } from '../mockData'
import { PIPELINE, stageEmailsOnMove } from '@/lib/pipeline'

type OrderStatus = 'PENDING' | 'PACKED' | 'OUT' | 'DONE' | 'CANCELLED'

type OrderChannel = 'WEBSITE' | 'WHATSAPP' | 'INSTAGRAM' | 'FACE_TO_FACE' | 'PHONE' | 'OTHER'

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
  delayed: boolean
  delayReason: string | null
  delayedAt: string | null
  events: { id: string; type: string; label: string | null; note: string | null; adminOnly: boolean; at: string }[]
  paymentMethod: string | null
  paid: boolean
  invoiced: boolean
  hasProofOfPayment: boolean
  total: number
  itemCount: number
  date: string
  createdAt: string
  items: { id: string; productId: string | null; name: string; qty: number; price: number }[]
}

const PAYMENT_LABEL: Record<string, string> = {
  bank: 'Bank transfer', lynk: 'Lynk', paypal: 'PayPal', card: 'Card', cod: 'Cash on delivery',
}

const CHANNEL: Record<OrderChannel, { label: string; tone: 'green' | 'grey' | 'blue' | 'orange' } | null> = {
  WEBSITE: null,
  WHATSAPP: { label: 'WhatsApp', tone: 'green' },
  INSTAGRAM: { label: 'Instagram', tone: 'grey' },
  FACE_TO_FACE: { label: 'Face to face', tone: 'blue' },
  PHONE: { label: 'Phone call', tone: 'orange' },
  OTHER: { label: 'Other', tone: 'grey' },
}

const SOURCE_OPTIONS: { id: OrderChannel; label: string }[] = [
  { id: 'WEBSITE', label: 'Website' },
  { id: 'INSTAGRAM', label: 'Instagram' },
  { id: 'WHATSAPP', label: 'WhatsApp' },
  { id: 'FACE_TO_FACE', label: 'Face to face' },
  { id: 'PHONE', label: 'Phone call' },
  { id: 'OTHER', label: 'Other' },
]

const COLUMNS: { id: OrderStatus; label: string }[] = [
  { id: 'PENDING', label: 'Pending' },
  { id: 'PACKED', label: 'Packed' },
  { id: 'OUT', label: 'Out for delivery' },
  { id: 'DONE', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' },
]

// A column only shows this many cards before folding the rest behind
// "View all" — otherwise a column with hundreds of completed orders grows
// the whole board instead of staying a fixed-height glance.
const COLUMN_CARD_LIMIT = 6

function monthKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

/** Groups the order-detail modal into named sections instead of one long stack of rows. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--color-text-subtle)' }}>
      {children}
    </span>
  )
}

export default function OrdersSection() {
  const [orders, setOrders] = useState<Order[]>([])
  const [dragId, setDragId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Order | null>(null)
  const [customerNote, setCustomerNote] = useState('')
  const [internalNote, setInternalNote] = useState('')
  const [stageBusy, setStageBusy] = useState(false)
  const [expandedColumn, setExpandedColumn] = useState<OrderStatus | null>(null)
  const [refundMonth, setRefundMonth] = useState<string>('ALL')
  const [noteDraft, setNoteDraft] = useState('')
  const [noteBusy, setNoteBusy] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [newBusy, setNewBusy] = useState(false)
  const [newError, setNewError] = useState('')
  const [newOrder, setNewOrder] = useState({
    customerName: '', contact: '', email: '', phone: '', shippingAddress: '',
    source: 'FACE_TO_FACE' as OrderChannel, paymentMethod: '', paid: false,
  })
  const [newItems, setNewItems] = useState([{ name: '', price: '', qty: '1' }])
  const [products, setProducts] = useState<{ id: string; name: string; price: number; salePrice: number | null }[]>([])
  const [suggestFor, setSuggestFor] = useState<number | null>(null)
  const [delayBusy, setDelayBusy] = useState(false)
  const [delayReasonDraft, setDelayReasonDraft] = useState('')
  const [showDelayForm, setShowDelayForm] = useState(false)
  const [swapForItem, setSwapForItem] = useState<string | null>(null)
  const [swapQuery, setSwapQuery] = useState('')
  const [swapBusy, setSwapBusy] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/orders')
    if (res.ok) setOrders((await res.json()).orders)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Loaded once, on demand, when the "New order" form's item picker is first
  // needed — the same catalog Inventory manages, so a manual order always
  // reflects real products and their current price.
  const loadProducts = useCallback(async () => {
    if (products.length) return
    const res = await fetch('/api/admin/products')
    if (res.ok) setProducts((await res.json()).products)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (newOpen) loadProducts()
  }, [newOpen, loadProducts])

  useEffect(() => {
    if (detail) loadProducts()
    setShowDelayForm(false)
    setDelayReasonDraft('')
    setSwapForItem(null)
    setSwapQuery('')
  }, [detail, loadProducts])

  const refreshDetail = useCallback(async (id: string) => {
    const res = await fetch('/api/admin/orders')
    if (!res.ok) return
    const d = await res.json()
    setOrders(d.orders)
    setDetail(d.orders.find((o: Order) => o.id === id) ?? null)
  }, [])

  const setDelay = async (id: string, delayed: boolean, reason?: string) => {
    setDelayBusy(true)
    const res = await fetch(`/api/admin/orders/${id}/delay`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delayed, reason }),
    })
    setDelayBusy(false)
    if (res.ok) {
      setShowDelayForm(false)
      setDelayReasonDraft('')
      refreshDetail(id)
    }
  }

  const swapItem = async (orderId: string, itemId: string, productId: string) => {
    setSwapBusy(true)
    const res = await fetch(`/api/admin/orders/${orderId}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    })
    setSwapBusy(false)
    if (res.ok) {
      setSwapForItem(null)
      setSwapQuery('')
      refreshDetail(orderId)
    } else {
      const d = await res.json().catch(() => ({}))
      window.alert(d.error ?? 'Could not swap that item.')
    }
  }

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
  const [paidBusy, setPaidBusy] = useState(false)

  const sendInvoice = async (id: string) => {
    setInvoiceMsg('Sending…')
    const res = await fetch(`/api/admin/orders/${id}/invoice`, { method: 'POST' })
    if (res.ok) {
      const { sent, to } = await res.json()
      setInvoiceMsg(sent ? `Invoice emailed to ${to}` : to ? 'Email provider not configured: use View invoice' : 'No email on file: use View invoice to share it')
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, invoiced: true } : o)))
      setDetail((d) => (d && d.id === id ? { ...d, invoiced: true } : d))
    } else {
      setInvoiceMsg('Could not send invoice')
    }
  }

  const setPaid = async (id: string, paid: boolean) => {
    // Payment state is high-impact — marking paid emails the customer an
    // invoice, and unmarking it reopens a closed payment. Confirm both ways,
    // and guard against a double-click firing the mutation twice.
    if (paidBusy) return
    const verb = paid ? 'Mark this order as paid? This emails the customer an invoice.' : 'Mark this order as unpaid?'
    if (!confirm(verb)) return
    setPaidBusy(true)
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
      if (invoice?.sent) setInvoiceMsg(`Paid: invoice emailed to ${invoice.to}`)
      else if (invoice) setInvoiceMsg('Paid: invoice ready (View invoice to share)')
    }
    setPaidBusy(false)
    load()
  }

  const resetNewOrder = () => {
    setNewOrder({ customerName: '', contact: '', email: '', phone: '', shippingAddress: '', source: 'FACE_TO_FACE', paymentMethod: '', paid: false })
    setNewItems([{ name: '', price: '', qty: '1' }])
    setNewError('')
  }

  const createOrder = async () => {
    setNewError('')
    const items = newItems
      .filter((i) => i.name.trim())
      .map((i) => ({ name: i.name.trim(), price: Number(i.price) || 0, qty: Math.max(1, Number(i.qty) || 1) }))
    if (!newOrder.customerName.trim()) return setNewError('Enter the customer’s name.')
    if (items.length === 0) return setNewError('Add at least one item.')

    setNewBusy(true)
    const res = await fetch('/api/admin/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: newOrder.customerName.trim(),
        contact: newOrder.contact.trim() || undefined,
        email: newOrder.email.trim() || undefined,
        phone: newOrder.phone.trim() || undefined,
        shippingAddress: newOrder.shippingAddress.trim() || undefined,
        source: newOrder.source,
        paymentMethod: newOrder.paymentMethod || undefined,
        paid: newOrder.paid,
        items,
      }),
    })
    const data = await res.json().catch(() => ({}))
    setNewBusy(false)
    if (!res.ok) {
      setNewError(data.error ?? 'Could not create the order.')
      return
    }
    setNewOpen(false)
    resetNewOrder()
    load()
  }

  const deleteOrder = async (id: string, orderNo: string) => {
    if (!confirm(`Permanently delete order ${orderNo}? This removes it from all reports. Prefer cancelling (drag to Cancelled) unless this is an erroneous or duplicate entry.`)) return
    const res = await fetch(`/api/admin/orders/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setOrders((prev) => prev.filter((o) => o.id !== id))
      setDetail(null)
    }
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

  const openDetail = (card: Order) => {
    setInvoiceMsg('')
    setCustomerNote('')
    setInternalNote('')
    setNoteDraft('')
    setDetail(card)
  }

  const addNote = async (id: string) => {
    const note = noteDraft.trim()
    if (!note) return
    setNoteBusy(true)
    const res = await fetch(`/api/admin/orders/${id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    })
    setNoteBusy(false)
    if (res.ok) {
      setNoteDraft('')
      const fresh = await fetch('/api/admin/orders')
      if (fresh.ok) {
        const next: Order[] = (await fresh.json()).orders
        setOrders(next)
        setDetail((d) => (d ? next.find((o) => o.id === d.id) ?? null : d))
      }
    }
  }

  const cancelled = orders.filter((o) => o.status === 'CANCELLED')
  const cancelledMonths = Array.from(new Set(cancelled.map((o) => monthKey(o.createdAt)))).sort().reverse()
  const visibleCancelled = refundMonth === 'ALL' ? cancelled : cancelled.filter((o) => monthKey(o.createdAt) === refundMonth)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
          Drag a card to move it between stages. Click a card for details.
        </p>
        <Button size="sm" variant="primary" onClick={() => setNewOpen(true)} iconRight={<Plus size={14} />}>
          New order
        </Button>
      </div>

      <div className="kad-kanban" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, alignItems: 'start' }}>
        {COLUMNS.map((col) => {
          const cards = orders.filter((o) => o.status === col.id)
          const visible = cards.slice(0, COLUMN_CARD_LIMIT)
          const hiddenCount = cards.length - visible.length
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
                {visible.map((card) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={() => setDragId(card.id)}
                    onClick={() => openDetail(card)}
                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 11, padding: '11px 12px', cursor: 'grab', boxShadow: 'var(--shadow-sm)' }}
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
                {hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setExpandedColumn(col.id)}
                    style={{
                      width: '100%', textAlign: 'center', padding: '9px 10px', borderRadius: 11, border: '1px dashed var(--color-border-strong)',
                      background: 'transparent', color: 'var(--color-text-muted)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    View all {cards.length} ({hiddenCount} more)
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ ...cardStyle, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <h3 style={{ ...h3Style, margin: 0 }}>Refunds &amp; returns</h3>
          {cancelledMonths.length > 0 && (
            <select
              value={refundMonth}
              onChange={(e) => setRefundMonth(e.target.value)}
              style={{ height: 32, padding: '0 10px', border: '1px solid var(--color-border)', borderRadius: 9, fontSize: 12.5, background: 'var(--color-surface)', color: 'var(--color-text)' }}
            >
              <option value="ALL">All time ({cancelled.length})</option>
              {cancelledMonths.map((m) => (
                <option key={m} value={m}>{monthLabel(m)} ({cancelled.filter((o) => monthKey(o.createdAt) === m).length})</option>
              ))}
            </select>
          )}
        </div>
        {visibleCancelled.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '10px 0 0' }}>
            {cancelled.length === 0 ? 'No cancelled orders right now.' : 'Nothing cancelled in this month.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            {visibleCancelled.map((o) => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13 }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', width: 70 }}>{o.orderNo}</span>
                <span style={{ flex: 1, cursor: 'pointer' }} onClick={() => openDetail(o)}>{o.customerName} · {fmt(o.total)}</span>
                <Badge tone="orange">Cancelled</Badge>
                <Button variant="outline" size="sm" onClick={() => setStatus(o.id, 'PENDING')}>Restore</Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {expandedColumn && (
        <Modal
          title={`${COLUMNS.find((c) => c.id === expandedColumn)?.label} (${orders.filter((o) => o.status === expandedColumn).length})`}
          onClose={() => setExpandedColumn(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '60vh', overflowY: 'auto' }}>
            {orders.filter((o) => o.status === expandedColumn).map((o) => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', border: '1px solid var(--color-border)', borderRadius: 10 }}>
                <span
                  style={{ flex: 1, minWidth: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
                  onClick={() => { setExpandedColumn(null); openDetail(o) }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--color-text-muted)', width: 68, flexShrink: 0 }}>{o.orderNo}</span>
                  <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.customerName}</span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-subtle)', flexShrink: 0 }}>{o.date}</span>
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12.5, flexShrink: 0 }}>{fmt(o.total)}</span>
                <select
                  value={o.status}
                  onChange={(e) => setStatus(o.id, e.target.value as OrderStatus)}
                  style={{ height: 30, padding: '0 8px', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 11.5, background: 'var(--color-surface)', flexShrink: 0 }}
                >
                  {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {detail && (
        <Modal title={`Order ${detail.orderNo}`} onClose={() => setDetail(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SectionLabel>Order</SectionLabel>
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
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
            <SectionLabel>Customer</SectionLabel>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{detail.customerName}</span>
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
          </div>
          {detail.delayed && (
            <div style={{ background: 'var(--ke-sun-50,#fff7e6)', border: '1px solid var(--ke-sun-300,#fdb813)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: 'var(--ke-sun-700,#8a5a00)' }}>
                <Badge tone="orange" dot>Exception · Delayed</Badge>
              </span>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ke-sun-700,#8a5a00)' }}>{detail.delayReason}</p>
              <div>
                <Button size="sm" variant="outline" onClick={() => setDelay(detail.id, false)} disabled={delayBusy}>
                  {delayBusy ? 'Saving…' : 'Mark delay resolved'}
                </Button>
              </div>
            </div>
          )}
          {!detail.delayed && detail.status !== 'CANCELLED' && (
            <div>
              {showDelayForm ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <textarea
                    value={delayReasonDraft}
                    onChange={(e) => setDelayReasonDraft(e.target.value)}
                    placeholder="Reason for the delay — shown to the customer (e.g. out of stock, awaiting supplier)"
                    rows={2}
                    maxLength={400}
                    style={{ width: '100%', resize: 'vertical', fontSize: 12.5, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--color-border)', fontFamily: 'inherit' }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button size="sm" onClick={() => setDelay(detail.id, true, delayReasonDraft.trim())} disabled={delayBusy || !delayReasonDraft.trim()}>
                      {delayBusy ? 'Saving…' : 'Confirm delay'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowDelayForm(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setShowDelayForm(true)}>Defer this order</Button>
              )}
            </div>
          )}
          {detail.status === 'CANCELLED' && detail.cancelReason && (
            <div style={{ background: 'var(--color-danger-bg, #fdf1f0)', border: '1px solid var(--color-danger)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Badge tone="grey" dot>Exception · Cancelled</Badge>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--color-danger)' }}>{detail.cancelReason}</p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
            <SectionLabel>Payment</SectionLabel>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{detail.paymentMethod ? PAYMENT_LABEL[detail.paymentMethod] ?? detail.paymentMethod : 'N/A'}</span>
              {detail.paid ? <Badge tone="green" dot>Paid</Badge> : <Badge tone="orange" dot>Unpaid</Badge>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a href={`/api/admin/orders/${detail.id}/invoice`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                  <Button size="sm" variant="outline">View invoice</Button>
                </a>
                <Button size="sm" variant="outline" onClick={() => sendInvoice(detail.id)}>
                  {detail.invoiced ? 'Resend invoice' : 'Send invoice'}
                </Button>
                {detail.hasProofOfPayment && (
                  <a href={`/api/admin/orders/${detail.id}/proof`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                    <Button size="sm" variant="outline">View proof of payment</Button>
                  </a>
                )}
              </span>
              <Button size="sm" variant={detail.paid ? 'outline' : 'primary'} onClick={() => setPaid(detail.id, !detail.paid)} disabled={paidBusy}>
                {paidBusy ? 'Saving…' : detail.paid ? 'Mark as unpaid' : 'Mark as paid'}
              </Button>
            </div>
            {invoiceMsg && (
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'right' }}>{invoiceMsg}</div>
            )}
          </div>
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SectionLabel>Items</SectionLabel>
            {detail.items.map((it) => {
              const matches = swapForItem === it.id && swapQuery.trim()
                ? products.filter((p) => p.name.toLowerCase().includes(swapQuery.trim().toLowerCase()) && p.id !== it.productId).slice(0, 6)
                : []
              return (
                <div key={it.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, gap: 8 }}>
                    <span>{it.name}{it.qty > 1 ? ` × ${it.qty}` : ''}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600 }}>{fmt(it.price * it.qty)}</span>
                      {detail.status !== 'CANCELLED' && (
                        <button
                          type="button"
                          onClick={() => { setSwapForItem(swapForItem === it.id ? null : it.id); setSwapQuery('') }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--ke-green-700,#15803d)', padding: 0 }}
                        >
                          Swap
                        </button>
                      )}
                    </span>
                  </div>
                  {swapForItem === it.id && (
                    <div style={{ position: 'relative', marginTop: 6 }}>
                      <input
                        autoFocus
                        value={swapQuery}
                        onChange={(e) => setSwapQuery(e.target.value)}
                        placeholder="Type a product name to swap to…"
                        disabled={swapBusy}
                        style={{ width: '100%', height: 32, padding: '0 10px', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                      />
                      {matches.length > 0 && (
                        <div style={{ marginTop: 4, border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
                          {matches.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => swapItem(detail.id, it.id, p.id)}
                              disabled={swapBusy}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%', padding: '8px 10px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 12 }}
                            >
                              <span>{p.name}</span>
                              <span style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>{fmt(p.salePrice ?? p.price)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
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
                placeholder={
                  stageEmailsOnMove(Math.min(detail.stage + 1, PIPELINE.length - 1))
                    ? 'Customer-facing update (optional): shown on their tracking page & emailed'
                    : 'Customer-facing update (optional): shown on their tracking page (not emailed for this stage)'
                }
                rows={2}
                maxLength={400}
                style={{ width: '100%', resize: 'vertical', fontSize: 12.5, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--color-border)', fontFamily: 'inherit' }}
              />
              <textarea
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Internal note (admin only): never shown to the customer"
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
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5 }}>Notes</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Leave a note on this order (admin only — works regardless of status)"
                rows={2}
                maxLength={400}
                style={{ flex: 1, resize: 'vertical', fontSize: 12.5, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--color-border)', fontFamily: 'inherit', background: 'var(--ke-gray-50,#fafafa)' }}
              />
            </div>
            <div>
              <Button size="sm" variant="outline" onClick={() => addNote(detail.id)} disabled={noteBusy || !noteDraft.trim()}>
                {noteBusy ? 'Saving…' : 'Add note'}
              </Button>
            </div>

            {detail.events.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                {[...detail.events].reverse().map((e) => (
                  <div key={e.id} style={{ display: 'flex', gap: 8, fontSize: 11.5, alignItems: 'baseline' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(e.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                    {e.adminOnly && <Badge tone="grey">Internal</Badge>}
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      <strong style={{ color: 'var(--color-text)', fontWeight: 600 }}>{e.label}</strong>
                      {e.note ? `: ${e.note}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
            <Button size="sm" variant="outline" onClick={() => deleteOrder(detail.id, detail.orderNo)}>
              Delete order permanently
            </Button>
          </div>
        </Modal>
      )}

      {newOpen && (
        <Modal
          title="Record a manual order"
          onClose={() => { setNewOpen(false); resetNewOrder() }}
          footer={
            <>
              <Button size="sm" variant="outline" onClick={() => { setNewOpen(false); resetNewOrder() }}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={createOrder} disabled={newBusy}>{newBusy ? 'Creating…' : 'Create order'}</Button>
            </>
          }
        >
          <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '0 0 12px' }}>
            For sales that happened outside checkout: Instagram DM, a phone call, face to face, etc. It joins the normal
            pipeline (status, invoicing, delivery tracking) like any other order, but never creates a customer account or earns loyalty points.
          </p>
          <TextInput label="Customer name" value={newOrder.customerName} onChange={(v) => setNewOrder({ ...newOrder, customerName: v })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <TextInput label="Phone (optional)" value={newOrder.phone} onChange={(v) => setNewOrder({ ...newOrder, phone: v })} />
            <TextInput label="Email (optional)" value={newOrder.email} onChange={(v) => setNewOrder({ ...newOrder, email: v })} type="email" />
          </div>
          <TextInput label="IG handle / contact (optional)" value={newOrder.contact} onChange={(v) => setNewOrder({ ...newOrder, contact: v })} />
          <TextInput label="Delivery address (optional)" value={newOrder.shippingAddress} onChange={(v) => setNewOrder({ ...newOrder, shippingAddress: v })} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
            <label style={{ display: 'block' }}>
              <span style={overline}>ORIGIN</span>
              <select value={newOrder.source} onChange={(e) => setNewOrder({ ...newOrder, source: e.target.value as OrderChannel })} style={detailSelect}>
                {SOURCE_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
            <label style={{ display: 'block' }}>
              <span style={overline}>PAYMENT METHOD</span>
              <select value={newOrder.paymentMethod} onChange={(e) => setNewOrder({ ...newOrder, paymentMethod: e.target.value })} style={detailSelect}>
                <option value="">Not specified</option>
                {Object.entries(PAYMENT_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0 4px', fontSize: 13 }}>
            <input type="checkbox" checked={newOrder.paid} onChange={(e) => setNewOrder({ ...newOrder, paid: e.target.checked })} />
            Already paid
          </label>

          <div style={{ marginTop: 12 }}>
            <span style={overline}>ITEMS</span>
            {newItems.map((item, i) => {
              const query = item.name.trim().toLowerCase()
              const matches = query && suggestFor === i
                ? products.filter((p) => p.name.toLowerCase().includes(query)).slice(0, 6)
                : []
              return (
              <div key={i} style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center', position: 'relative' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    value={item.name}
                    onChange={(e) => setNewItems((prev) => prev.map((p, pi) => (pi === i ? { ...p, name: e.target.value } : p)))}
                    onFocus={() => setSuggestFor(i)}
                    onBlur={() => setTimeout(() => setSuggestFor((cur) => (cur === i ? null : cur)), 120)}
                    placeholder="Item name: start typing to pick a product"
                    style={{ width: '100%', height: 34, padding: '0 10px', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12.5 }}
                  />
                  {matches.length > 0 && (
                    <div
                      style={{
                        position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 20,
                        background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10,
                        boxShadow: '0 12px 28px rgba(0,0,0,.14)', overflow: 'hidden',
                      }}
                    >
                      {matches.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault() // fire before the input's onBlur closes this
                            const effectivePrice = p.salePrice ?? p.price
                            setNewItems((prev) => prev.map((row, pi) => (pi === i ? { ...row, name: p.name, price: String(effectivePrice) } : row)))
                            setSuggestFor(null)
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%',
                            padding: '8px 10px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 12.5,
                          }}
                        >
                          <span style={{ color: 'var(--color-text)' }}>{p.name}</span>
                          <span style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>{fmt(p.salePrice ?? p.price)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  value={item.price}
                  onChange={(e) => setNewItems((prev) => prev.map((p, pi) => (pi === i ? { ...p, price: e.target.value } : p)))}
                  placeholder="Price"
                  type="number"
                  style={{ width: 90, height: 34, padding: '0 10px', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12.5 }}
                />
                <input
                  value={item.qty}
                  onChange={(e) => setNewItems((prev) => prev.map((p, pi) => (pi === i ? { ...p, qty: e.target.value } : p)))}
                  placeholder="Qty"
                  type="number"
                  style={{ width: 56, height: 34, padding: '0 10px', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12.5 }}
                />
                <button
                  type="button"
                  onClick={() => setNewItems((prev) => prev.filter((_, pi) => pi !== i))}
                  disabled={newItems.length === 1}
                  style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: newItems.length === 1 ? 'default' : 'pointer', padding: 4 }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
              )
            })}
            <button
              type="button"
              onClick={() => setNewItems((prev) => [...prev, { name: '', price: '', qty: '1' }])}
              style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--ke-green-700)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              <Plus size={13} /> Add item
            </button>
          </div>

          {newError && <p style={{ fontSize: 12.5, color: 'var(--color-danger)', marginTop: 10 }}>{newError}</p>}
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
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  outline: 'none',
  appearance: 'none',
} as const
