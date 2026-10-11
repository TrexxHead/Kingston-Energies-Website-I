'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, ChevronLeft } from 'lucide-react'
import ProfileNav from '@/components/ProfileNav'

interface TopbarProps {
  title: string
  subtitle: string
}

type Connection = 'checking' | 'online' | 'offline'

export default function Topbar({ title, subtitle }: TopbarProps) {
  const router = useRouter()

  // A real signal, not decoration: the device's own connectivity (instant,
  // matters most exactly when this area is most useful — mid-outage) plus
  // one reachability check against the API on mount.
  const [connection, setConnection] = useState<Connection>('checking')

  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setConnection('offline')
    } else {
      fetch('/api/health', { cache: 'no-store' })
        .then((r) => setConnection(r.ok ? 'online' : 'offline'))
        .catch(() => setConnection('offline'))
    }
    const onOnline = () => setConnection('online')
    const onOffline = () => setConnection('offline')
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return (
    <div
      className="kad-header"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid var(--color-border)',
        background: '#fff',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          style={{
            width: 36,
            height: 36,
            flex: 'none',
            borderRadius: 10,
            border: '1px solid var(--color-border)',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--color-text)',
          }}
        >
          <ChevronLeft size={18} />
        </button>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ font: 'var(--text-h3)', margin: 0, color: 'var(--color-text)' }}>{title}</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--color-text-muted)' }}>{subtitle}</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          className="kad-hide-sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: connection === 'offline' ? 'var(--color-danger-soft)' : 'var(--ke-green-50)',
            borderRadius: 999,
            padding: '6px 12px',
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: connection === 'offline' ? 'var(--color-danger)' : 'var(--ke-green-500)',
              opacity: connection === 'checking' ? 0.5 : 1,
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 12.5,
              color: connection === 'offline' ? 'var(--color-danger)' : 'var(--ke-green-700)',
            }}
          >
            {connection === 'offline' ? 'No connection' : connection === 'checking' ? 'Checking…' : 'Connected'}
          </span>
        </div>

        <button
          type="button"
          aria-label="Notifications"
          className="kad-hide-sm"
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

        <ProfileNav tone="light" />
      </div>
    </div>
  )
}
