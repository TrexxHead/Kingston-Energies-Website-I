'use client'

import { signOut } from 'next-auth/react'

export default function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/' })}
      style={{
        height: 40,
        padding: '0 18px',
        border: '1.5px solid var(--color-border)',
        borderRadius: 999,
        background: '#fff',
        color: 'var(--color-text)',
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: 13,
        cursor: 'pointer',
      }}
    >
      Sign out
    </button>
  )
}
