'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  KanbanSquare,
  Boxes,
  Users,
  Megaphone,
  Wallet,
  ChartScatter,
  BookOpen,
  Settings,
  ExternalLink,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react'
import { NAV, resolve, type NavGroup } from './nav'

const ICONS: Record<string, typeof LayoutDashboard> = {
  'layout-dashboard': LayoutDashboard,
  'kanban-square': KanbanSquare,
  boxes: Boxes,
  users: Users,
  megaphone: Megaphone,
  wallet: Wallet,
  'chart-scatter': ChartScatter,
  'book-open': BookOpen,
  settings: Settings,
}

export default function Sidebar() {
  const pathname = usePathname()
  const { group: activeGroup } = resolve(pathname)
  const [mobileOpen, setMobileOpen] = useState(false)
  // Groups the user has opened by hand. The group you are inside stays open
  // unless collapsed deliberately, so the menu can never hide the page you are
  // currently looking at.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => setMobileOpen(false), [pathname])

  const isOpen = (g: NavGroup) => (g.id === activeGroup?.id ? expanded[g.id] !== false : Boolean(expanded[g.id]))

  return (
    <>
      {/* Mobile-only hamburger — the sidebar itself is off-canvas below 1000px. */}
      <button
        type="button"
        className="kad-mobile-toggle"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        style={{
          position: 'fixed',
          top: 14,
          left: 14,
          zIndex: 70,
          width: 40,
          height: 40,
          borderRadius: 10,
          border: 'none',
          background: '#0d1714',
          color: '#fff',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(0,0,0,.3)',
        }}
      >
        <Menu size={19} />
      </button>
      <div className={`kad-sidebar-backdrop${mobileOpen ? ' kad-sidebar-open' : ''}`} onClick={() => setMobileOpen(false)} />

      <aside
        className={`kad-sidebar${mobileOpen ? ' kad-sidebar-open' : ''}`}
        style={{
          width: 238,
          flex: 'none',
          background: '#0d1714',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 14px',
          overflowY: 'auto',
        }}
      >
        <div style={{ padding: '6px 8px 20px', display: 'flex', gap: 9, alignItems: 'center' }}>
          <svg viewBox="0 0 200 200" width={24} height={24} style={{ objectFit: 'contain', flexShrink: 0 }}>
            <rect width="200" height="200" fill="#0d1714" />
            <path
              d="M100 52 l38 16 v34 c0 26 -17 42 -38 50 c-21 -8 -38 -24 -38 -50 v-34 z"
              fill="none"
              stroke="#93c93f"
              strokeWidth={7}
            />
            <path d="M104 82 l-16 26 h12 l-4 22 l20 -30 h-13 z" fill="#f7941e" />
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12.5, letterSpacing: '.1em', color: '#fff' }}>
              KINGSTON
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.2em', color: 'var(--ke-green-400)' }}>
              ADMIN&nbsp;CONSOLE
            </span>
          </div>
          <button
            type="button"
            className="kad-mobile-toggle"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.7)', cursor: 'pointer', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={20} />
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {NAV.map((g) => {
            const Icon = ICONS[g.icon]
            const active = g.id === activeGroup?.id
            const open = isOpen(g)

            return (
              <div key={g.id}>
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                  <Link
                    href={g.href}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 11,
                      padding: '10px 12px',
                      borderRadius: g.children ? '11px 0 0 11px' : 11,
                      fontFamily: 'var(--font-display)',
                      fontWeight: 600,
                      fontSize: 13.5,
                      color: active ? '#fff' : 'rgba(255,255,255,.62)',
                      background: active ? 'rgba(147,201,63,.18)' : 'transparent',
                      transition: 'background .16s ease, color .16s ease',
                      minWidth: 0,
                    }}
                  >
                    <Icon size={18} color={active ? 'var(--ke-green-400)' : undefined} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.label}</span>
                  </Link>
                  {g.children && (
                    <button
                      type="button"
                      onClick={() => setExpanded((e) => ({ ...e, [g.id]: !open }))}
                      aria-label={open ? `Collapse ${g.label}` : `Expand ${g.label}`}
                      aria-expanded={open}
                      style={{
                        width: 32,
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: '0 11px 11px 0',
                        background: active ? 'rgba(147,201,63,.18)' : 'transparent',
                        color: active ? '#fff' : 'rgba(255,255,255,.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ChevronDown size={15} style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform .16s ease' }} />
                    </button>
                  )}
                </div>

                {g.children && open && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                      margin: '2px 0 6px 20px',
                      paddingLeft: 10,
                      borderLeft: '1px solid rgba(255,255,255,.12)',
                    }}
                  >
                    {g.children.map((c) => {
                      // Exact match only: the group's landing page and its
                      // children share a prefix, so a prefix test would light up
                      // Overview on every child page.
                      const on = (pathname.replace(/\/+$/, '') || g.href) === c.href
                      return (
                        <Link
                          key={c.href}
                          href={c.href}
                          style={{
                            padding: '7px 10px',
                            borderRadius: 9,
                            fontFamily: 'var(--font-display)',
                            fontWeight: on ? 700 : 500,
                            fontSize: 12.5,
                            color: on ? '#fff' : 'rgba(255,255,255,.55)',
                            background: on ? 'rgba(147,201,63,.14)' : 'transparent',
                            transition: 'background .16s ease, color .16s ease',
                          }}
                        >
                          {c.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 16 }}>
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 10,
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 13,
              color: 'rgba(255,255,255,.6)',
            }}
          >
            <ExternalLink size={17} />
            Back to site
          </Link>
        </div>
      </aside>
    </>
  )
}
