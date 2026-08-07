'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { LogOut, LayoutDashboard, Package, Bell, ShieldCheck, Settings } from 'lucide-react'
import { initials } from '@/lib/initials'

// Just the essentials — everything else lives one click away in the Hub's own
// sidebar (app/hub/_components/Sidebar.tsx), so this menu doesn't duplicate it.
const ESSENTIALS = [
  { href: '/hub', label: 'My Hub', icon: LayoutDashboard },
  { href: '/hub/orders', label: 'Orders', icon: Package },
  { href: '/hub/notifications', label: 'Notifications', icon: Bell },
]

/**
 * The account avatar + dropdown menu, shared by the marketing navbar and the
 * in-hub top bar. Kept deliberately short — the Hub's own sidebar is the full
 * nav; this is just a fast way in, from any page, plus sign out.
 */
export default function AccountMenu({ size = 34 }: { size?: number }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const role = session?.user?.role
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  if (status !== 'authenticated') {
    return (
      <Link href="/login" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, color: 'inherit' }}>
        Sign in
      </Link>
    )
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Account menu"
        aria-label="Open account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        style={{
          width: size,
          height: size,
          borderRadius: 999,
          background: 'var(--gradient-brand)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 12,
          flex: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        {initials(session.user?.name ?? session.user?.email ?? 'U')}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: 236,
            background: '#141f1b',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,.08)',
            boxShadow: '0 20px 48px rgba(0,0,0,.45)',
            padding: 8,
            zIndex: 60,
            overflow: 'hidden',
          }}
        >
          {/* Profile row — plain surface, not a bright colour strip, so the
              menu reads as one muted dark object rather than two stacked
              blocks. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px 12px' }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: 999, flex: 'none',
                background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#0d1714', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11.5,
              }}
            >
              {initials(session.user?.name ?? session.user?.email ?? 'U')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {session.user?.name ?? 'My account'}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {session.user?.email}
              </div>
            </div>
            <Link
              href="/hub/settings"
              role="menuitem"
              aria-label="Account settings"
              onClick={() => setOpen(false)}
              style={{ width: 28, height: 28, borderRadius: 8, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.5)' }}
            >
              <Settings size={15} />
            </Link>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', margin: '0 0 6px' }} />

          {/* Shown only to signed-in admins — the public site still carries no
              admin entry point, so this reveals nothing to a normal visitor. */}
          {isAdmin && (
            <Link
              href="/admin/dashboard"
              role="menuitem"
              onClick={() => setOpen(false)}
              style={{ ...rowStyle, color: 'var(--ke-green-400, #93c93f)' }}
            >
              <ShieldCheck size={16} />
              Admin dashboard
            </Link>
          )}

          {ESSENTIALS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} role="menuitem" onClick={() => setOpen(false)} style={rowStyle}>
              <Icon size={16} />
              {label}
            </Link>
          ))}

          <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', margin: '6px 0 6px' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '2px 2px 0' }}>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                signOut({ callbackUrl: '/' })
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 10px',
                background: 'none',
                border: 'none',
                borderRadius: 9,
                cursor: 'pointer',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 13,
                color: '#e88585',
              }}
            >
              <LogOut size={15} />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  padding: '9px 10px',
  borderRadius: 9,
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  fontSize: 13.5,
  color: 'rgba(255,255,255,.85)',
  textDecoration: 'none',
} as const
