'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Stages past which cancellation is no longer possible — mirrors the API guard
// so the button can hide itself and show a clear reason instead.
const CANCELLABLE = new Set(['PENDING', 'PACKED'])

const BLOCKED_REASON: Record<string, string> = {
  OUT: 'This order is already out for delivery and can no longer be cancelled.',
  DONE: 'This order has already been delivered and can no longer be cancelled.',
  CANCELLED: 'This order has been cancelled.',
}

export default function CancelOrderButton({
  orderId,
  status,
  cancelReason,
}: {
  orderId: string
  status: string
  cancelReason?: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Not cancellable — explain why, plainly.
  if (!CANCELLABLE.has(status)) {
    const note = status === 'CANCELLED' && cancelReason ? `Cancelled — ${cancelReason}` : BLOCKED_REASON[status]
    if (!note) return null
    return (
      <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{note}</span>
    )
  }

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Could not cancel this order. Please try again.')
        setBusy(false)
        return
      }
      setOpen(false)
      router.refresh()
    } catch {
      setError('Network error — please try again.')
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: 12.5,
          padding: '7px 14px',
          borderRadius: 999,
          background: 'transparent',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-muted)',
          cursor: 'pointer',
        }}
      >
        Cancel order
      </button>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: '100%',
        background: 'var(--ke-gray-50, #fafafa)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: 12,
      }}
    >
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-display)' }}>Cancel this order?</p>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>
        We&apos;ll restore the stock and email you a confirmation. Any payment made will be refunded.
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional) — helps us improve"
        rows={2}
        maxLength={300}
        style={{
          width: '100%',
          resize: 'vertical',
          fontSize: 13,
          padding: '8px 10px',
          borderRadius: 8,
          border: '1px solid var(--color-border)',
          fontFamily: 'inherit',
        }}
      />
      {error ? <p style={{ margin: 0, fontSize: 12, color: 'var(--ke-red-600, #dc2626)' }}>{error}</p> : null}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 12.5,
            padding: '8px 16px',
            borderRadius: 999,
            background: 'var(--ke-red-600, #dc2626)',
            border: 'none',
            color: '#fff',
            cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? 'Cancelling…' : 'Confirm cancellation'}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setError(null)
          }}
          disabled={busy}
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 12.5,
            padding: '8px 16px',
            borderRadius: 999,
            background: 'transparent',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
          }}
        >
          Keep order
        </button>
      </div>
    </div>
  )
}
