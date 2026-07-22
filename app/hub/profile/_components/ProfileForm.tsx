'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CUSTOMER_NEEDS, type CustomerNeed } from '@/lib/crm'

interface ProfileFormProps {
  initialName: string
  initialUsername: string
  initialEmail: string
  initialNeed: CustomerNeed | null
}

export default function ProfileForm({ initialName, initialUsername, initialEmail, initialNeed }: ProfileFormProps) {
  const [name, setName] = useState(initialName)
  const [username, setUsername] = useState(initialUsername)
  const [email, setEmail] = useState(initialEmail)
  const [need, setNeed] = useState<CustomerNeed | ''>(initialNeed ?? '')
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
      body: JSON.stringify({ name, username: username.trim(), email, primaryNeed: need === '' ? null : need }),
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

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>
          Username <span style={{ fontWeight: 400 }}>(optional — sign in with this or your email)</span>
        </label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g. jowayne876"
          autoCapitalize="none"
          autoCorrect="off"
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

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>
          What do you mainly need power for?
        </label>
        <select
          value={need}
          onChange={(e) => setNeed(e.target.value as CustomerNeed | '')}
          style={{
            width: '100%',
            height: 44,
            padding: '0 14px',
            border: '1.5px solid var(--color-border)',
            borderRadius: 10,
            fontSize: 14,
            outline: 'none',
            background: '#fff',
            appearance: 'none',
          }}
        >
          <option value="">Prefer not to say</option>
          {CUSTOMER_NEEDS.map((n) => (
            <option key={n.id} value={n.id}>
              {n.label} — {n.detail}
            </option>
          ))}
        </select>
        <p style={{ fontSize: 11.5, color: 'var(--color-text-muted)', margin: '6px 0 0' }}>
          Helps us recommend the right gear and tailor offers to how you use it.
        </p>
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
