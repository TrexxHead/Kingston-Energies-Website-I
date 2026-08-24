'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { deliveryFee, deliveryTimeframe, PICKUP_LOCATIONS, PARISHES, type DeliveryMethod } from '@/lib/delivery'
import { fmt } from '@/lib/catalog'

interface PublicPaymentMethod {
  id: string
  label: string
  gateway: boolean
}

const DELIVERY_METHODS: { id: DeliveryMethod; label: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'express', label: 'Express' },
  { id: 'pickup', label: 'Pickup' },
]

export default function EditDeliveryPaymentButton({
  orderId,
  initialDeliveryMethod,
  initialStreet,
  initialParish,
  initialPickupLocationIndex,
  initialPaymentMethod,
}: {
  orderId: string
  initialDeliveryMethod: DeliveryMethod
  initialStreet: string
  initialParish: string
  initialPickupLocationIndex: number | null
  initialPaymentMethod: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [methods, setMethods] = useState<PublicPaymentMethod[]>([])
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(initialDeliveryMethod)
  const [street, setStreet] = useState(initialStreet)
  const [parish, setParish] = useState(initialParish || 'Kingston')
  const [pickupLocationIndex, setPickupLocationIndex] = useState(initialPickupLocationIndex ?? 0)
  const [paymentMethod, setPaymentMethod] = useState(initialPaymentMethod ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    fetch('/api/payment-methods')
      .then((r) => (r.ok ? r.json() : { methods: [] }))
      .then((d: { methods: PublicPaymentMethod[] }) => setMethods(d.methods.filter((m) => !m.gateway)))
      .catch(() => setMethods([]))
  }, [open])

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, padding: '7px 14px', borderRadius: 999,
          background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', cursor: 'pointer',
        }}
      >
        Edit delivery / payment
      </button>
    )
  }

  async function submit() {
    setBusy(true)
    setError(null)
    const body: Record<string, unknown> = { deliveryMethod }
    if (deliveryMethod === 'pickup') {
      body.pickupLocationIndex = pickupLocationIndex
    } else {
      body.street = street.trim()
      body.parish = parish
    }
    if (paymentMethod) body.paymentMethod = paymentMethod
    try {
      const res = await fetch(`/api/orders/${orderId}/delivery`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Could not update your order. Please try again.')
        setBusy(false)
        return
      }
      setOpen(false)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
      setBusy(false)
    }
  }

  const canSave = deliveryMethod === 'pickup' || street.trim().length > 0

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--ke-gray-50, #fafafa)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 14 }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-display)' }}>Edit delivery &amp; payment</p>

      <div>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-muted)' }}>Delivery method</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {DELIVERY_METHODS.map((m) => (
            <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input type="radio" name="editDelm" checked={deliveryMethod === m.id} onChange={() => setDeliveryMethod(m.id)} />
              {m.label}
              {m.id !== 'pickup' && ` — ${deliveryTimeframe(m.id, parish)} (${deliveryFee(m.id, parish) === 0 ? 'Free' : fmt(deliveryFee(m.id, parish))})`}
            </label>
          ))}
        </div>
      </div>

      {deliveryMethod === 'pickup' ? (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-muted)' }}>Pickup location</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {PICKUP_LOCATIONS.map((loc, i) => (
              <label key={loc.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="radio" name="editPickup" checked={pickupLocationIndex === i} onChange={() => setPickupLocationIndex(i)} />
                {loc.name}
              </label>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder="Delivery address"
            style={{ fontSize: 13, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--color-border)', fontFamily: 'inherit' }}
          />
          <select value={parish} onChange={(e) => setParish(e.target.value)} style={{ fontSize: 13, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--color-border)', fontFamily: 'inherit' }}>
            {PARISHES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
      )}

      {methods.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-muted)' }}>Payment method</div>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ fontSize: 13, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--color-border)', fontFamily: 'inherit', width: '100%' }}>
            <option value="">Keep current</option>
            {methods.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>
      )}

      {error ? <p style={{ margin: 0, fontSize: 12, color: 'var(--ke-red-600, #dc2626)' }}>{error}</p> : null}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={submit}
          disabled={busy || !canSave}
          style={{
            fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, padding: '8px 16px', borderRadius: 999,
            background: 'var(--ke-green-600)', border: 'none', color: '#fff', cursor: busy || !canSave ? 'default' : 'pointer', opacity: busy || !canSave ? 0.6 : 1,
          }}
        >
          {busy ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null) }}
          disabled={busy}
          style={{
            fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, padding: '8px 16px', borderRadius: 999,
            background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
