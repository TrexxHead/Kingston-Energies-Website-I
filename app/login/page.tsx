'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AuthShell from '../_design-system/AuthShell'
import GoogleButton from '../_design-system/GoogleButton'
import {
  authLabelStyle,
  authInputStyle,
  authSubmitStyle,
  authErrorStyle,
  authDividerStyle,
} from '../_design-system/authStyles'

const OAUTH_ERROR_MESSAGE =
  'Google sign-in isn\'t configured yet. Please use email and password, or try again later.'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const searchParams = useSearchParams()
  const [error, setError] = useState(() => (searchParams.get('error') ? OAUTH_ERROR_MESSAGE : ''))
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const result = await signIn('credentials', { email, password, redirect: false })

    setSubmitting(false)

    if (result?.error) {
      setError('Invalid email or password')
    } else {
      router.push('/hub')
    }
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back to your Kingston Energies account."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={{ color: 'var(--ke-green-400)' }}>
            Create one
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
            style={authInputStyle}
          />
        </div>

        <button type="submit" disabled={submitting} style={authSubmitStyle}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  )
}
