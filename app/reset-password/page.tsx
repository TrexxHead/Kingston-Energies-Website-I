'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthShell from '../_design-system/AuthShell'
import { authLabelStyle, authInputStyle, authSubmitStyle, authErrorStyle } from '../_design-system/authStyles'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  )
}

function ResetForm() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') ?? ''
  const email = params.get('email') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const invalidLink = !token || !email

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, newPassword: password }),
      })
      if (res.ok) {
        setDone(true)
        setTimeout(() => router.push('/login?verify=success'), 1500)
      } else {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Could not reset your password.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setSubmitting(false)
  }

  if (invalidLink) {
    return (
      <AuthShell
        title="Invalid link"
        subtitle="This reset link is missing information."
        footer={
          <Link href="/forgot-password" style={{ color: 'var(--ke-green-400)' }}>
            Request a new link
          </Link>
        }
      >
        <p style={{ fontSize: 14, color: 'var(--ke-dark-text-muted)', lineHeight: 1.6 }}>
          Please request a fresh password-reset email and use the most recent link.
        </p>
      </AuthShell>
    )
  }

  if (done) {
    return (
      <AuthShell title="Password reset" subtitle="You're all set." footer={<Link href="/login" style={{ color: 'var(--ke-green-400)' }}>Sign in</Link>}>
        <p style={{ fontSize: 14, color: 'var(--ke-dark-text-muted)', lineHeight: 1.6 }}>
          Your password has been updated. Redirecting you to sign in…
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle={`Resetting the password for ${email}.`}
      footer={
        <Link href="/login" style={{ color: 'var(--ke-green-400)' }}>
          Back to sign in
        </Link>
      }
    >
      {error && <div style={authErrorStyle}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label style={authLabelStyle}>New password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} style={authInputStyle} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={authLabelStyle}>Confirm new password</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} style={authInputStyle} />
        </div>
        <button type="submit" disabled={submitting} style={authSubmitStyle}>
          {submitting ? 'Resetting…' : 'Reset password'}
        </button>
      </form>
    </AuthShell>
  )
}
