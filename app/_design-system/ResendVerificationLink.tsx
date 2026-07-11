'use client'

import { useState } from 'react'

export default function ResendVerificationLink({ email }: { email: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')

  const handleResend = async () => {
    if (!email) return
    setState('sending')
    await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setState('sent')
  }

  if (state === 'sent') return <span style={{ color: 'var(--ke-green-400)' }}>sent — check your inbox</span>

  return (
    <button
      type="button"
      onClick={handleResend}
      disabled={state === 'sending' || !email}
      style={{ background: 'none', border: 'none', padding: 0, color: 'var(--ke-green-400)', cursor: 'pointer', font: 'inherit', textDecoration: 'underline' }}
    >
      {state === 'sending' ? 'sending…' : 'resend the email'}
    </button>
  )
}
