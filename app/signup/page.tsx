'use client'

import { useState } from 'react'
import Link from 'next/link'
import AuthShell from '../_design-system/AuthShell'
import GoogleButton from '../_design-system/GoogleButton'
import ResendVerificationLink from '../_design-system/ResendVerificationLink'
import {
  authLabelStyle,
  authInputStyle,
  authSubmitStyle,
  authErrorStyle,
  authDividerStyle,
} from '../_design-system/authStyles'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sentTo, setSentTo] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })

    setSubmitting(false)

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      setError(body.error ?? 'Something went wrong. Please try again.')
      return
    }

    setSentTo(email)
  }

  if (sentTo) {
    return (
      <AuthShell
        title="Check your inbox"
        subtitle={`We sent a confirmation link to ${sentTo}.`}
        footer={
          <>
            Already confirmed?{' '}
            <Link href="/login" style={{ color: 'var(--ke-green-400)' }}>
              Sign in
            </Link>
          </>
        }
      >
        <p style={{ fontSize: 14, color: 'var(--ke-dark-text-muted)', lineHeight: 1.6 }}>
          Click the link in that email to activate your account, then come back and sign in.
          Didn&apos;t get it? Check spam, or{' '}
          <ResendVerificationLink email={sentTo} />.
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Create account"
      subtitle="Join Kingston Energies for order tracking, device registration and rewards."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--ke-green-400)' }}>
            Sign in
          </Link>
        </>
      }
    >
      <GoogleButton />

      <div style={authDividerStyle}>
        <div style={{ flex: 1, height: 1, background: 'var(--ke-dark-hairline)' }} />
        or
        <div style={{ flex: 1, height: 1, background: 'var(--ke-dark-hairline)' }} />
      </div>

      {error && <div style={authErrorStyle}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label style={authLabelStyle}>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required style={authInputStyle} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={authLabelStyle}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={authInputStyle}
          />
        </div>

        <div>
          <label style={authLabelStyle}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            style={authInputStyle}
          />
        </div>

        <button type="submit" disabled={submitting} style={authSubmitStyle}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  )
}
