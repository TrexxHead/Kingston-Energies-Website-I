'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ProfileFormProps {
  initialName: string
  initialEmail: string
}

export default function ProfileForm({ initialName, initialEmail }: ProfileFormProps) {
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaved(false)
    setSubmitting(true)

    const response = await fetch('/api/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    })

    setSubmitting(false)

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      setError(body.error ?? 'Could not save your changes')
      return
    }

    setSaved(true)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 420 }}>
      {error && (
        <div
          style={{
            background: 'var(--color-danger-soft)',
            color: 'var(--color-danger)',
            borderRadius: 10,
            padding: '10px 12px',
            fontSize: 12.5,
            marginBottom: 14,
          }}
        >
          {error}
        </div>
      )}
      {saved && (
        <div
          style={{
            background: 'var(--color-success-soft)',
            color: 'var(--color-primary-hover)',
            borderRadius: 10,
            padding: '10px 12px',
            fontSize: 12.5,
            marginBottom: 14,
          }}
        >
          Profile updated
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>
          Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{
            width: '100%',
            height: 44,
            padding: '0 14px',
            border: '1.5px solid var(--color-border)',
            borderRadius: 10,
            fontSize: 14,
            outline: 'none',
          }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: '100%',
            height: 44,
            padding: '0 14px',
            border: '1.5px solid var(--color-border)',
            borderRadius: 10,
            fontSize: 14,
            outline: 'none',
          }}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        style={{
          height: 44,
          padding: '0 24px',
          border: 'none',
          borderRadius: 999,
          background: 'var(--color-primary)',
          color: '#fff',
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: 13.5,
          cursor: 'pointer',
        }}
      >
        {submitting ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}
