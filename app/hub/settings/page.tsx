'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Topbar from '../_components/Topbar'
import SignOutButton from '../profile/_components/SignOutButton'
import { hubScreen, hubCard, hubH3 } from '../_components/ui'

interface Pref {
  key: string
  label: string
  detail: string
  on: boolean
}

const INITIAL_PREFS: Pref[] = [
  { key: 'orders', label: 'Order updates', detail: 'Confirmations, packing and delivery status', on: true },
  { key: 'delivery', label: 'Delivery alerts', detail: 'A heads-up when your driver is nearby', on: true },
  { key: 'promos', label: 'Promotions & offers', detail: 'Discount codes and seasonal deals', on: false },
  { key: 'tips', label: 'Product tips', detail: 'Care guides and upgrade suggestions', on: false },
]

export default function SettingsPage() {
  const { data: session } = useSession()
  const [prefs, setPrefs] = useState<Pref[]>(INITIAL_PREFS)

  const toggle = (key: string) => setPrefs((prev) => prev.map((p) => (p.key === key ? { ...p, on: !p.on } : p)))

  return (
    <>
      <Topbar title="Settings" subtitle="Preferences, notifications and security" />
      <div className="ke-screen" style={hubScreen}>
        {/* Notifications */}
        <div style={{ ...hubCard, marginBottom: 16 }}>
          <h3 style={hubH3}>Notifications</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {prefs.map((p, i) => (
              <div
                key={p.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 0',
                  borderTop: i === 0 ? 'none' : '1px solid var(--color-border)',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>{p.label}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginTop: 2 }}>{p.detail}</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={p.on}
                  aria-label={`Toggle ${p.label}`}
                  onClick={() => toggle(p.key)}
                  style={{
                    width: 44,
                    height: 26,
                    borderRadius: 999,
                    border: 'none',
                    cursor: 'pointer',
                    padding: 3,
                    flexShrink: 0,
                    background: p.on ? 'var(--ke-green-500)' : 'var(--color-border-strong, #cbd3ce)',
                    transition: 'background var(--dur-base) var(--ease-standard)',
                    display: 'flex',
                    justifyContent: p.on ? 'flex-end' : 'flex-start',
                  }}
                >
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff' }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Account & security */}
        <div style={{ ...hubCard, marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ ...hubH3, margin: 0 }}>Account &amp; security</h3>
            <SignOutButton />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Signed in as" value={session?.user?.email ?? '—'} />
            <Field label="Name" value={session?.user?.name ?? '—'} />
            <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>
              To change your password, sign out and use &ldquo;Forgot password&rdquo; on the sign-in screen.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 10,
        border: '1px solid var(--color-border)',
      }}
    >
      <span style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5 }}>{value}</span>
    </div>
  )
}
