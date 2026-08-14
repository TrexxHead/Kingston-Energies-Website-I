'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { LayoutDashboard, Package, Bell, Settings, ShieldCheck, LogOut } from 'lucide-react'
import { initials } from '@/lib/initials'
import ProfileNavigationMenu, { type ProfileNavigationSection } from '@/components/ui/profile-navigation-menu'

/**
 * Replaces the old top-right AccountMenu on the public marketing site with a
 * foldable, top-center identity control. Real destinations only — the same
 * ones AccountMenu used to link to, since the Hub's own sidebar remains the
 * full nav; this stays a fast way in from any public page, plus sign out.
 * Hidden entirely for signed-out visitors — there's no profile to show yet.
 */
export default function ProfileNav() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  // navigator.platform is browser-only — resolved after mount, rather than
  // during render, so the server/client markup for the shortcut label match
  // and hydration never warns about a mismatch.
  const [shortcutLabel, setShortcutLabel] = useState('Ctrl K')
  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setShortcutLabel('⌘K')
  }, [])

  if (status !== 'authenticated' || !session.user) return null

  const role = session.user.role
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'
  const name = session.user.name ?? 'My account'

  const sections: ProfileNavigationSection[] = [
    {
      items: [
        { href: '/hub', label: 'My Hub', icon: <LayoutDashboard size={16} />, exact: true },
        { href: '/hub/orders', label: 'Orders', icon: <Package size={16} /> },
        { href: '/hub/notifications', label: 'Notifications', icon: <Bell size={16} /> },
        { href: '/hub/settings', label: 'Settings', icon: <Settings size={16} /> },
      ],
    },
  ]

  if (isAdmin) {
    sections.push({
      label: 'Admin',
      items: [{ href: '/admin/dashboard', label: 'Admin dashboard', icon: <ShieldCheck size={16} /> }],
    })
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(var(--ke-ann-h, 0px) + 76px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 55,
        width: 'min(calc(100vw - 24px), 22rem)',
      }}
    >
      <ProfileNavigationMenu
        name={name}
        subtitle={session.user.email ?? ''}
        avatar={
          <span
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--gradient-brand)',
              color: '#0d1714',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {initials(session.user.name ?? session.user.email ?? 'U')}
          </span>
        }
        sections={sections}
        activePathname={pathname}
        shortcutKey="k"
        shortcutLabel={shortcutLabel}
        footer={
          <button
            type="button"
            className="ke-pnav-link"
            onClick={() => signOut({ callbackUrl: '/' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              minHeight: 44,
              padding: '9px 10px',
              background: 'none',
              border: 'none',
              borderRadius: 12,
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 13.5,
              color: '#e88585',
            }}
          >
            <LogOut size={16} />
            Log out
          </button>
        }
      />
    </div>
  )
}
