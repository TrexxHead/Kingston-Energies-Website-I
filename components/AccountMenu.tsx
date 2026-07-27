'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { LogOut, LayoutDashboard, Package, Bell, ShieldCheck } from 'lucide-react'
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
            width: 218,
            background: 'var(--ke-dark-bg, #0d1714)',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,.08)',
            boxShadow: '0 16px 40px rgba(0,0,0,.35)',
            padding: 8,
            zIndex: 60,
            overflow: 'hidden',
          }}
        >
          <div style={{ background: 'var(--gradient-brand)', margin: -8, marginBottom: 8, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, color: '#0d1714', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {session.user?.name ?? 'My account'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(13,23,20,.68)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {session.user?.email}
            </div>
          </div>

          {/* Shown only to signed-in admins — the public site still carries no
              admin entry point, so this reveals nothing to a normal visitor. */}
          {isAdmin && (
            <Link
              href="/admin/dashboard"
              role="menuitem"
              onClick={() => setOpen(false)}
              style={{ ...rowStyle, color: 'var(--ke-green-400, #93c93f)', background: 'rgba(147,201,63,.12)', marginBottom: 4 }}
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
              gap: 9,
              width: '100%',
              marginTop: 4,
              padding: '10px 10px 8px',
              borderTop: '1px solid rgba(255,255,255,.08)',
              background: 'none',
              border: 'none',
              borderRadius: 9,
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 13.5,
              color: '#e88585',
              textAlign: 'left',
            }}
          >
            <LogOut size={16} />
            Sign out
          </button>
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
