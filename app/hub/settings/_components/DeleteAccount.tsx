'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'

const CONFIRM_WORD = 'DELETE'

export default function DeleteAccount() {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const close = () => {
    if (busy) return
    setOpen(false)
    setTyped('')
    setError('')
  }

  const confirmDelete = async () => {
    if (typed !== CONFIRM_WORD) {
      setError(`Type ${CONFIRM_WORD} exactly as shown to confirm.`)
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      if (res.ok) {
        await signOut({ callbackUrl: '/' })
        return
      }
      setError((await res.json().catch(() => ({}))).error ?? 'Could not delete your account. Please try again.')
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setBusy(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          height: 40,
          padding: '0 18px',
          border: '1px solid var(--color-danger, #dc2626)',
          borderRadius: 999,
          background: 'transparent',
          color: 'var(--color-danger, #dc2626)',
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: 13.5,
          cursor: 'pointer',
        }}
      >
        Delete account
      </button>

      {open && (
        <div
          onClick={close}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 90,
            background: 'rgba(13,23,20,.45)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 420,
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              borderRadius: 20,
              boxShadow: '0 24px 60px -12px rgba(16,24,20,.35)',
              padding: 22,
            }}
          >
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, margin: '0 0 8px' }}>
              Delete your account?
            </h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6, margin: '0 0 6px' }}>
              You&apos;ll no longer be able to sign in, and we&apos;ll stop reaching out to you automatically —
              no order updates, promotions or reminders.
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6, margin: '0 0 16px' }}>
              Your purchase history, orders and account value stay on record with us; nothing is erased.
            </p>

            <label style={{ display: 'block', marginBottom: 16 }}>
              <span style={{ fontSize: 12.5, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>
                Type <strong style={{ color: 'var(--color-text)' }}>{CONFIRM_WORD}</strong> to confirm
              </span>
              <input
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                style={{
                  width: '100%',
                  height: 42,
                  padding: '0 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </label>

            {error && (
              <div
                style={{
                  fontSize: 12.5,
                  padding: '9px 12px',
                  borderRadius: 9,
                  background: 'var(--color-danger-soft)',
                  color: 'var(--color-danger)',
                  marginBottom: 14,
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={close}
                disabled={busy}
                style={{
                  height: 40,
                  padding: '0 16px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 999,
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 13.5,
                  cursor: busy ? 'default' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={busy || typed !== CONFIRM_WORD}
                style={{
                  height: 40,
                  padding: '0 18px',
                  border: 'none',
                  borderRadius: 999,
                  background: 'var(--color-danger, #dc2626)',
                  color: '#fff',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 13.5,
                  cursor: busy || typed !== CONFIRM_WORD ? 'default' : 'pointer',
                  opacity: busy || typed !== CONFIRM_WORD ? 0.6 : 1,
                }}
              >
                {busy ? 'Deleting…' : 'Delete my account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
