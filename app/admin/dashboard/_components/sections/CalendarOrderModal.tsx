'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import TextInput from '../ui/TextInput'

type Source = 'WEBSITE' | 'WHATSAPP' | 'INSTAGRAM' | 'FACE_TO_FACE' | 'PHONE' | 'OTHER'

const SOURCES: { value: Source; label: string }[] = [
  { value: 'FACE_TO_FACE', label: 'Face to face' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'OTHER', label: 'Other' },
]

const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: '', label: 'Not set' },
  { value: 'bank', label: 'Bank transfer' },
  { value: 'lynk', label: 'Lynk' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'cod', label: 'Cash on delivery' },
  { value: 'card', label: 'Card' },
]

interface Row {
  name: string
  price: string
  qty: string
}

/**
 * A focused "new order" form scoped to the Finance → Calendar view — pins the
 * order's estimatedDelivery to the day the admin clicked so it shows up as a
 * chip there, then posts through the same /api/admin/orders endpoint
 * OrdersSection uses, so it lands in the normal pipeline identically.
 */
export default function CalendarOrderModal({ defaultDate, onClose, onCreated }: { defaultDate: string; onClose: () => void; onCreated: () => void }) {
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [source, setSource] = useState<Source>('FACE_TO_FACE')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paid, setPaid] = useState(false)
  const [rows, setRows] = useState<Row[]>([{ name: '', price: '', qty: '1' }])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const setRow = (i: number, patch: Partial<Row>) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const addRow = () => setRows((prev) => [...prev, { name: '', price: '', qty: '1' }])
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i))

  const total = rows.reduce((sum, r) => sum + (Number(r.price) || 0) * (Number(r.qty) || 0), 0)

  const submit = async () => {
    setError('')
    if (!customerName.trim()) return setError('Customer name is required.')
    if (!phone.trim()) return setError('A contact number is required.')
    const items = rows
      .filter((r) => r.name.trim())
      .map((r) => ({ name: r.name.trim(), price: Number(r.price) || 0, qty: Math.max(1, Number(r.qty) || 1) }))
    if (items.length === 0) return setError('Add at least one item.')

    setBusy(true)
    const res = await fetch('/api/admin/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: customerName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        shippingAddress: shippingAddress.trim() || undefined,
        source,
        paymentMethod: paymentMethod || undefined,
        paid,
        estimatedDelivery: date,
        items,
      }),
    })
    setBusy(false)
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || 'Could not create this order.')
    onCreated()
  }

  return (
    <Modal
      title="New order"
      width={520}
      onClose={onClose}
      footer={
        <>
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" onClick={submit} disabled={busy}>
            {busy ? 'Creating…' : `Create order · J$${total.toLocaleString()}`}
          </Button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <TextInput label="Customer name" value={customerName} onChange={setCustomerName} />
        <TextInput label="Contact number" value={phone} onChange={setPhone} type="tel" />
        <TextInput label="Email (optional)" value={email} onChange={setEmail} type="email" />
        <label style={{ display: 'block' }}>
          <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, color: 'var(--color-text)', marginBottom: 6 }}>
            Scheduled date
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: '100%', height: 42, padding: '0 13px', border: '1.5px solid var(--color-border)', borderRadius: 12, fontFamily: 'var(--font-body)', fontSize: 13.5, background: 'var(--color-surface-sunk)', color: 'var(--color-text)', outline: 'none' }}
          />
        </label>
        <TextInput label="Delivery address (optional)" value={shippingAddress} onChange={setShippingAddress} />
        <TextInput label="Source" value={SOURCES.find((s) => s.value === source)?.label ?? ''} onChange={(label) => setSource(SOURCES.find((s) => s.label === label)?.value ?? 'FACE_TO_FACE')} options={SOURCES.map((s) => s.label)} />
        <TextInput
          label="Payment method"
          value={PAYMENT_METHODS.find((p) => p.value === paymentMethod)?.label ?? 'Not set'}
          onChange={(label) => setPaymentMethod(PAYMENT_METHODS.find((p) => p.label === label)?.value ?? '')}
          options={PAYMENT_METHODS.map((p) => p.label)}
        />
      </div>

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
        <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
        Already paid
      </label>

      <div>
        <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, color: 'var(--color-text)', marginBottom: 6 }}>
          Items
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((r, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 60px 28px', gap: 6, alignItems: 'center' }}>
              <input
                value={r.name}
                onChange={(e) => setRow(i, { name: e.target.value })}
                placeholder="Item name"
                style={{ height: 38, padding: '0 10px', border: '1.5px solid var(--color-border)', borderRadius: 10, fontSize: 13, background: 'var(--color-surface-sunk)' }}
              />
              <input
                value={r.price}
                onChange={(e) => setRow(i, { price: e.target.value })}
                placeholder="Price"
                type="number"
                style={{ height: 38, padding: '0 10px', border: '1.5px solid var(--color-border)', borderRadius: 10, fontSize: 13, background: 'var(--color-surface-sunk)' }}
              />
              <input
                value={r.qty}
                onChange={(e) => setRow(i, { qty: e.target.value })}
                placeholder="Qty"
                type="number"
                style={{ height: 38, padding: '0 10px', border: '1.5px solid var(--color-border)', borderRadius: 10, fontSize: 13, background: 'var(--color-surface-sunk)' }}
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                disabled={rows.length === 1}
                style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'none', cursor: rows.length === 1 ? 'default' : 'pointer', opacity: rows.length === 1 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addRow}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: 'var(--ke-green-700,#15803d)', padding: 0 }}
        >
          <Plus size={13} /> Add item
        </button>
      </div>

      {error && <div style={{ color: 'var(--color-danger,#dc2626)', fontSize: 13 }}>{error}</div>}
    </Modal>
  )
}
