'use client'

import { useSession } from 'next-auth/react'
import { Bell } from 'lucide-react'
import { initials } from '@/lib/initials'

interface TopbarProps {
  title: string
  subtitle: string
}

export default function Topbar({ title, subtitle }: TopbarProps) {
  const { data: session } = useSession()
  const name = session?.user?.name ?? session?.user?.email ?? 'Account'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px 28px',
        borderBottom: '1px solid var(--color-border)',
        background: '#fff',
      }}
    >
      <div>
        <h1 style={{ font: 'var(--text-h3)', margin: 0, color: 'var(--color-text)' }}>{title}</h1>
        <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--color-text-muted)' }}>{subtitle}</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          className="kad-hide-sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--ke-green-50)',
            borderRadius: 999,
            padding: '6px 12px',
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ke-green-500)' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, color: 'var(--ke-green-700)' }}>
            System online
          </span>
        </div>

        <button
          type="button"
          aria-label="Notifications"
          style={{
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 10,
            border: '1px solid var(--color-border)',
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          <Bell size={17} />
        </button>

        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'var(--gradient-brand)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          {initials(name)}
        </div>
      </div>
    </div>
  )
}
