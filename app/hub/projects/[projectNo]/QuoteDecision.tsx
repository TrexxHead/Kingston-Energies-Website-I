'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/** Accept or decline a sent quote. Accepting moves the project on; staff are told either way. */
export default function QuoteDecision({ projectNo }: { projectNo: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmAccept, setConfirmAccept] = useState(false)
  async function decide(action: 'accept' | 'decline') {
    setBusy(true)
    setError('')
    const res = await fetch(`/api/hub/projects/${projectNo}/quote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) }).catch(() => null)
    setBusy(false)
    if (!res?.ok) return setError((await res?.json().catch(() => ({})))?.error ?? 'That didn’t go through — please try again.')
    router.refresh()
  }
  return (
    <div style={{ display: 'grid', gap: 8, marginTop: 16 }}>
      {confirmAccept ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 14 }}>Accept this quote? We’ll be in touch about the deposit and start approvals.</span>
          <button type="button" disabled={busy} onClick={() => decide('accept')} style={btn(true)}>Yes, accept</button>
          <button type="button" disabled={busy} onClick={() => setConfirmAccept(false)} style={btn(false)}>Not yet</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" disabled={busy} onClick={() => setConfirmAccept(true)} style={btn(true)}>Accept quote</button>
          <button type="button" disabled={busy} onClick={() => decide('decline')} style={btn(false)}>Decline</button>
        </div>
      )}
      {error && <p role="alert" style={{ margin: 0, color: 'var(--color-danger)', fontSize: 13.5 }}>{error}</p>}
    </div>
  )
}

const btn = (primary: boolean) =>
  ({
    padding: '10px 18px',
    borderRadius: 999,
    border: primary ? 0 : '1px solid var(--color-border-strong)',
    background: primary ? 'var(--color-primary)' : 'transparent',
    color: primary ? 'var(--color-primary-contrast)' : 'var(--color-text)',
    fontWeight: 700,
    cursor: 'pointer',
  }) as const
