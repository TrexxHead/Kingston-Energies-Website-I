'use client'

import { useState } from 'react'

export default function ChangePassword() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)

    if (next !== confirm) {
      setMsg({ tone: 'err', text: 'New passwords do not match.' })
      return
    }
    if (next.length < 8) {
      setMsg({ tone: 'err', text: 'New password must be at least 8 characters.' })
      return
    }

    setBusy(true)
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.ok) {
        setMsg({ tone: 'ok', text: 'Password updated.' })
        setCurrent('')
        setNext('')
        setConfirm('')
      } else {
        setMsg({ tone: 'err', text: body.error ?? 'Could not update your password.' })
      }
    } catch {
      setMsg({ tone: 'err', text: 'Something went wrong. Please try again.' })
    }
    setBusy(false)
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
      {msg && (
        <div
          style={{
            fontSize: 12.5,
            padding: '9px 12px',
            borderRadius: 9,
            background: msg.tone === 'ok' ? 'var(--ke-green-50)' : 'var(--color-danger-soft)',
            color: msg.tone === 'ok' ? 'var(--ke-green-700)' : 'var(--color-danger)',
          }}
        >
          {msg.text}
        </div>
      )}
      <Field label="Current password" value={current} onChange={setCurrent} />
      <Field label="New password" value={next} onChange={setNext} />
      <Field label="Confirm new password" value={confirm} onChange={setConfirm} />
      <button
        type="submit"
        disabled={busy}
        style={{
          alignSelf: 'flex-start',
          height: 40,
          padding: '0 20px',
          border: 'none',
          borderRadius: 999,
          background: 'var(--ke-green-500)',
          color: '#fff',
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: 13.5,
          cursor: 'pointer',
        }}
      >
        {busy ? 'Updating…' : 'Update password'}
      </button>
    </form>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ fontSize: 12.5, color: 'var(--color-text-muted)', display: 'block', marginBottom: 5 }}>{label}</span>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        style={{
          width: '100%',
          height: 40,
          padding: '0 12px',
          border: '1px solid var(--color-border)',
          borderRadius: 10,
          fontSize: 14,
          outline: 'none',
        }}
      />
    </label>
  )
}
