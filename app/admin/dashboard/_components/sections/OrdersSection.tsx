'use client'

import { useCallback, useEffect, useState } from 'react'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import { cardStyle, h3Style } from '../ui/card'
import { fmt } from '../mockData'

type OrderStatus = 'PENDING' | 'PACKED' | 'OUT' | 'DONE' | 'CANCELLED'

type OrderChannel = 'WEBSITE' | 'WHATSAPP' | 'INSTAGRAM'

interface Order {
  id: string
  orderNo: string
  customerName: string
  status: OrderStatus
  source: OrderChannel
  contact: string | null
  total: number
  itemCount: number
  date: string
  items: { name: string; qty: number; price: number }[]
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
                    onClick={() => setDetail(card)}
                    style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 11, padding: '11px 12px', cursor: 'grab', boxShadow: 'var(--shadow-sm)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12.5 }}>{card.orderNo}</span>
                      {CHANNEL[card.source] && <Badge tone={CHANNEL[card.source]!.tone}>{CHANNEL[card.source]!.label}</Badge>}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 3 }}>{card.customerName}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--color-text-muted)' }}>{card.itemCount} items</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13 }}>{fmt(card.total)}</span>
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
          {detail.contact && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Contact</span>
              <span style={{ fontWeight: 600 }}>{detail.contact}</span>
            </div>
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
        </Modal>
      )}
    </div>
  )
}
