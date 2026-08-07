'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  KanbanSquare,
  Boxes,
  Users,
  UserCog,
  Megaphone,
  Wallet,
  ChartScatter,
  BookOpen,
  Settings,
  ExternalLink,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Command,
} from 'lucide-react'
import { NAV, resolve, type NavGroup } from './nav'

const ICONS: Record<string, typeof LayoutDashboard> = {
  'layout-dashboard': LayoutDashboard,
  'kanban-square': KanbanSquare,
  boxes: Boxes,
  users: Users,
  'user-cog': UserCog,
  megaphone: Megaphone,
  wallet: Wallet,
  'chart-scatter': ChartScatter,
  'book-open': BookOpen,
  settings: Settings,
}

const COLLAPSE_KEY = 'ke-admin-sidebar-collapsed'
const RAIL_WIDTH = 64
const PANEL_WIDTH = 226

/**
 * Two-level console navigation: an icon-only rail for switching between the
 * ten top-level sections, and a detail panel listing the active section's
 * subpages. Which group is "active" is derived entirely from the current
 * route (`resolve(pathname)`) rather than kept as separate UI state, so the
 * panel can never drift out of sync with where you actually are — every
 * rail icon is a real link, not a local-state-only toggle.
 */
export default function Sidebar() {
  const pathname = usePathname()
  const { group: activeGroup } = resolve(pathname)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => setMobileOpen(false), [pathname])

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1')
    } catch {
      // Private browsing — default to expanded for this session.
    }
  }, [])

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      } catch {
        // Private browsing — the state still applies for this session.
      }
      return next
    })
  }

  const openCommandPalette = () => {
    // CommandPalette listens globally for ⌘K/Ctrl+K — reuse that listener
    // rather than duplicating its open-state here.
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
  }

  return (
    <>
      <button
        type="button"
        className="kad-mobile-toggle"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        style={{
          position: 'fixed', top: 14, left: 14, zIndex: 70,
          width: 40, height: 40, borderRadius: 10, border: 'none',
          background: '#0d1714', color: '#fff',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(0,0,0,.3)',
        }}
      >
        <Menu size={19} />
      </button>
      <div className={`kad-sidebar-backdrop${mobileOpen ? ' kad-sidebar-open' : ''}`} onClick={() => setMobileOpen(false)} />

      <aside
        className={`kad-sidebar${mobileOpen ? ' kad-sidebar-open' : ''}`}
        style={{
          width: collapsed ? RAIL_WIDTH : RAIL_WIDTH + PANEL_WIDTH,
          flex: 'none',
          display: 'flex',
          overflow: 'hidden',
          transition: 'width .2s var(--ease-standard, ease)',
        }}
      >
        {/* Icon rail — always visible, one button per top-level section. */}
        <div
          className="kad-hide-scrollbar"
          style={{
            width: RAIL_WIDTH,
            flexShrink: 0,
            background: '#0d1714',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '16px 0',
            gap: 4,
            overflowY: 'auto',
          }}
        >
          <Link href="/admin/dashboard" aria-label="Kingston Energies admin" className="kad-rail-logo" style={{ marginBottom: 12 }}>
            <Image src="/images/logo-mark.png" alt="" width={26} height={26} style={{ objectFit: 'contain', display: 'block' }} />
          </Link>

          <button
            type="button"
            className="kad-mobile-toggle kad-rail-util-btn"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            style={{ marginBottom: 8 }}
          >
            <X size={18} />
          </button>

          {NAV.map((g) => {
            const Icon = ICONS[g.icon]
            const active = g.id === activeGroup?.id
            return (
              <Link
                key={g.id}
                href={g.href}
                title={g.label}
                aria-label={g.label}
                aria-current={active ? 'page' : undefined}
                className="kad-rail-icon"
                data-active={active}
              >
                <Icon size={18} />
              </Link>
            )
          })}

          <div style={{ flex: 1 }} />

          <button
            type="button"
            onClick={openCommandPalette}
            title="Search (⌘K)"
            aria-label="Open command palette"
            className="kad-rail-util-btn"
          >
            <Command size={17} />
          </button>

          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="kad-rail-util-btn"
          >
            {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>

          <Link href="/" title="Back to site" aria-label="Back to site" className="kad-rail-util-btn">
            <ExternalLink size={17} />
          </Link>
        </div>

        {/* Detail panel — the active section's subpages. Hidden when collapsed. */}
        {!collapsed && (
          <div
            className="kad-hide-scrollbar"
            style={{
              width: PANEL_WIDTH,
              flexShrink: 0,
              background: '#0d1714',
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              padding: '20px 14px',
              borderLeft: '1px solid rgba(255,255,255,.06)',
              overflowY: 'auto',
            }}
          >
            <Link href="/admin/dashboard" className="kad-panel-brand" style={{ marginBottom: 18 }}>
              <Image src="/images/logo-mark.png" alt="" width={28} height={28} style={{ objectFit: 'contain', flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: '#fff' }}>
                  Kingston Energies
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.2em', color: 'var(--ke-green-400)' }}>
                  ADMIN&nbsp;CONSOLE
                </span>
              </div>
            </Link>

            {activeGroup ? (
              <>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 15,
                    color: '#fff',
                    padding: '0 8px 12px',
                  }}
                >
                  {activeGroup.label}
                </div>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {(activeGroup.children ?? [{ href: activeGroup.href, label: 'Overview', description: activeGroup.description }]).map((c) => {
                    const on = (pathname.replace(/\/+$/, '') || activeGroup.href) === c.href
                    return (
                      <Link key={c.href} href={c.href} className="kad-panel-nav-row" data-active={on}>
                        {c.label}
                      </Link>
                    )
                  })}
                </nav>
              </>
            ) : (
              <div style={{ padding: '0 8px', fontSize: 12.5, color: 'rgba(255,255,255,.5)' }}>
                Pick a section from the rail.
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  )
}
