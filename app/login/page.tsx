'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
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

const OAUTH_ERROR_MESSAGE =
  'Google sign-in isn\'t configured yet. Please use email and password, or try again later.'

const VERIFY_BANNERS: Record<string, { tone: 'ok' | 'err'; text: string }> = {
  success: { tone: 'ok', text: 'Email confirmed — you can sign in now.' },
  expired: { tone: 'err', text: 'That verification link expired. Sign in to request a new one.' },
  invalid: { tone: 'err', text: 'That verification link is invalid. Sign in to request a new one.' },
}

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
  const verifyBanner = searchParams.get('verify')
  const [error, setError] = useState(() => (searchParams.get('error') ? OAUTH_ERROR_MESSAGE : ''))
  const [unverified, setUnverified] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setUnverified(false)
    setSubmitting(true)

    const result = await signIn('credentials', { email, password, redirect: false })

    setSubmitting(false)

    if (result?.error === 'EMAIL_NOT_VERIFIED') {
      setUnverified(true)
    } else if (result?.error) {
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

      {!error && !unverified && verifyBanner && VERIFY_BANNERS[verifyBanner] && (
        <div
          style={
            VERIFY_BANNERS[verifyBanner].tone === 'ok'
              ? { ...authErrorStyle, background: 'var(--ke-green-950, rgba(52,168,83,.12))', color: 'var(--ke-green-400)' }
              : authErrorStyle
          }
        >
          {VERIFY_BANNERS[verifyBanner].text}
        </div>
      )}

      {unverified && (
        <div style={authErrorStyle}>
          Confirm your email before signing in. <ResendVerificationLink email={email} />
        </div>
      )}

      {error && <div style={authErrorStyle}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label style={authLabelStyle}>Email or username</label>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoCapitalize="none"
            autoCorrect="off"
            style={authInputStyle}
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <label style={authLabelStyle}>Password</label>
            <Link href="/forgot-password" style={{ fontSize: 12.5, color: 'var(--ke-green-400)' }}>
              Forgot password?
            </Link>
          </div>
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
