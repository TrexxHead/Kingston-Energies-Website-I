'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { LogOut } from 'lucide-react'
import { initials } from '@/lib/initials'
import { HUB_MAIN_NAV, HUB_FOOTER_NAV } from '@/app/hub/_components/hubNav'

/**
 * The account avatar + dropdown menu, shared by the marketing navbar and the
 * in-hub top bar so a signed-in customer can reach every dashboard area and
 * sign out from any page (including on mobile, where the hub sidebar is hidden).
 */
export default function AccountMenu({ size = 34 }: { size?: number }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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
            width: 224,
            background: '#fff',
            borderRadius: 14,
            border: '1px solid rgba(0,0,0,.06)',
            boxShadow: '0 12px 32px rgba(0,0,0,.18)',
            padding: 8,
            zIndex: 60,
          }}
        >
          <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid var(--color-border, #eee)', marginBottom: 6 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, color: '#1c2a25' }}>
              {session.user?.name ?? 'My account'}
            </div>
            <div style={{ fontSize: 11.5, color: '#6b746f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {session.user?.email}
            </div>
          </div>

          {[...HUB_MAIN_NAV, ...HUB_FOOTER_NAV].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              style={{ display: 'block', padding: '9px 10px', borderRadius: 9, fontSize: 13.5, color: '#1c2a25', textDecoration: 'none' }}
            >
              {item.label}
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
              gap: 8,
              width: '100%',
              marginTop: 6,
              padding: '10px 10px 6px',
              borderTop: '1px solid var(--color-border, #eee)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13.5,
              color: 'var(--color-danger, #c0392b)',
              fontFamily: 'inherit',
              textAlign: 'left',
            }}
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
