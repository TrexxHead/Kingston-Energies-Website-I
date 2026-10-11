'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Topbar from '../_components/Topbar'
import SignOutButton from '../profile/_components/SignOutButton'
import ChangePassword from './_components/ChangePassword'
import DeleteAccount from './_components/DeleteAccount'
import { hubScreen, hubCard, hubH3 } from '../_components/ui'
import { NOTIFICATION_PREF_DEFS } from '@/lib/notificationPrefs'

export default function SettingsPage() {
  const { data: session } = useSession()
  // Starts from the defaults so the page never flashes "all off" before the
  // real saved values load; the GET below overwrites it with what's
  // actually on this account.
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NOTIFICATION_PREF_DEFS.map((d) => [d.key, d.defaultOn]))
  )
  const [savingKey, setSavingKey] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/hub/notification-prefs')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { prefs: Record<string, boolean> } | null) => {
        if (d?.prefs) setPrefs(d.prefs)
      })
      .catch(() => {})
  }, [])

  const toggle = async (key: string) => {
    const nextOn = !prefs[key]
    setPrefs((prev) => ({ ...prev, [key]: nextOn })) // optimistic
    setSavingKey(key)
    const res = await fetch('/api/hub/notification-prefs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, on: nextOn }),
    })
    setSavingKey(null)
    if (!res.ok) setPrefs((prev) => ({ ...prev, [key]: !nextOn })) // roll back on failure
  }

  return (
    <>
      <Topbar title="Settings" subtitle="Preferences, notifications and security" />
      <div className="ke-screen" style={hubScreen}>
        {/* Notifications */}
        <div style={{ ...hubCard, marginBottom: 16 }}>
          <h3 style={hubH3}>Notifications</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {NOTIFICATION_PREF_DEFS.map((p, i) => {
              const on = prefs[p.key] ?? p.defaultOn
              return (
                <div
                  key={p.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 0',
                    borderTop: i === 0 ? 'none' : '1px solid var(--color-border)',
                    opacity: savingKey === p.key ? 0.6 : 1,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>{p.label}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginTop: 2 }}>{p.detail}</div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={`Toggle ${p.label}`}
                    disabled={savingKey === p.key}
                    onClick={() => toggle(p.key)}
                    style={{
                      width: 44,
                      height: 26,
                      borderRadius: 999,
                      border: 'none',
                      cursor: savingKey === p.key ? 'default' : 'pointer',
                      padding: 3,
                      flexShrink: 0,
                      background: on ? 'var(--ke-green-500)' : 'var(--color-border-strong, #cbd3ce)',
                      transition: 'background var(--dur-base) var(--ease-standard)',
                      display: 'flex',
                      justifyContent: on ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--color-surface)' }} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Account & security */}
        <div style={{ ...hubCard, marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ ...hubH3, margin: 0 }}>Account &amp; security</h3>
            <SignOutButton />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Signed in as" value={session?.user?.email ?? 'N/A'} />
            <Field label="Name" value={session?.user?.name ?? 'N/A'} />
          </div>

          <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--color-border)' }}>
            <h3 style={{ ...hubH3, fontSize: 14 }}>Change password</h3>
            <ChangePassword />
          </div>

          <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--color-border)' }}>
            <h3 style={{ ...hubH3, fontSize: 14 }}>Delete account</h3>
            <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '0 0 12px', lineHeight: 1.6 }}>
              Permanently lose access to your login. Your order history and account records stay with us.
            </p>
            <DeleteAccount />
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
