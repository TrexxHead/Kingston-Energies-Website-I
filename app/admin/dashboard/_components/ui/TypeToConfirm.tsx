'use client'

import { useState } from 'react'

interface TypeToConfirmProps {
  /** The exact word the admin must type (case-insensitive). */
  word: string
  label: string
  onConfirm: () => void
  disabled?: boolean
  busyLabel?: string
}

/**
 * A second gesture for an action that's reversible in principle but easy to
 * fat-finger and annoying to notice went wrong — backdating an order,
 * say. Unlike HoldToConfirm (a deliberate hold, good for an instant
 * irreversible delete), this makes the admin type a specific word, which
 * forces a half-second of actually reading what they're about to do rather
 * than just holding a button down on reflex.
 */
export default function TypeToConfirm({ word, label, onConfirm, disabled, busyLabel }: TypeToConfirmProps) {
  const [typed, setTyped] = useState('')
  const ready = typed.trim().toLowerCase() === word.toLowerCase()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ display: 'block' }}>
        <span style={{ display: 'block', fontSize: 11.5, color: 'var(--color-text-muted)', marginBottom: 4 }}>
          Type <strong>{word}</strong> to confirm
        </span>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={word}
          autoComplete="off"
          style={{
            width: '100%', height: 34, padding: '0 10px', borderRadius: 8,
            border: `1.5px solid ${ready ? 'var(--color-danger)' : 'var(--color-border)'}`,
            fontSize: 13, background: 'var(--color-surface-sunk, var(--color-surface))',
          }}
        />
      </label>
      <button
        type="button"
        disabled={!ready || disabled}
        onClick={() => {
          onConfirm()
          setTyped('')
        }}
        style={{
          height: 32, borderRadius: 8, border: 'none', fontSize: 12.5, fontWeight: 700,
          cursor: ready && !disabled ? 'pointer' : 'default',
          background: 'var(--color-danger)', color: 'var(--color-text-inverse)',
          opacity: ready && !disabled ? 1 : 0.4,
        }}
      >
        {disabled ? (busyLabel ?? 'Saving…') : label}
      </button>
    </div>
  )
}
