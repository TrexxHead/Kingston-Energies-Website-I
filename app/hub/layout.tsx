'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Sidebar from './_components/Sidebar'
import { keFontVariables } from '../_design-system/fonts'
import '../_design-system/tokens.css'

export default function HubLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (status !== 'authenticated') {
    return null
  }

  return (
    <div
      className={`${keFontVariables} ke-root`}
      style={{
        fontFamily: 'var(--font-body)',
        color: 'var(--color-text)',
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--color-bg-subtle)',
      }}
    >
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  )
}
