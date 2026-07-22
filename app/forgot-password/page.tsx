'use client'

import { useState } from 'react'
import Link from 'next/link'
import AuthShell from '../_design-system/AuthShell'
import { authLabelStyle, authInputStyle, authSubmitStyle, authErrorStyle } from '../_design-system/authStyles'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setSent(true)
      } else {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setSubmitting(false)
  }

  if (sent) {
    return (
      <AuthShell
        title="Check your inbox"
        subtitle={`If an account exists for ${email}, we've sent a reset link.`}
        footer={
          <>
            Remembered it?{' '}
            <Link href="/login" style={{ color: 'var(--ke-green-400)' }}>
              Back to sign in
            </Link>
          </>
        }
      >
        <p style={{ fontSize: 14, color: 'var(--ke-dark-text-muted)', lineHeight: 1.6 }}>
          Click the link in that email to choose a new password. It expires in 1 hour. Check spam if it doesn&apos;t arrive shortly.
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Forgot password"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <>
          Remembered it?{' '}
          <Link href="/login" style={{ color: 'var(--ke-green-400)' }}>
            Back to sign in
          </Link>
        </>
      }
    >
      {error && <div style={authErrorStyle}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label style={authLabelStyle}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoCapitalize="none"
            autoCorrect="off"
            style={authInputStyle}
          />
        </div>

        <button type="submit" disabled={submitting} style={authSubmitStyle}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </AuthShell>
  )
}
