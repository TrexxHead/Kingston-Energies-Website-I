'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  Smartphone,
  Award,
  UserRound,
  Activity,
  Wifi,
  ExternalLink,
} from 'lucide-react'
import { HUB_NAV_ITEMS } from './hubNav'

const ICONS: Record<string, typeof LayoutDashboard> = {
  'layout-dashboard': LayoutDashboard,
  package: Package,
  smartphone: Smartphone,
  award: Award,
  'user-round': UserRound,
  activity: Activity,
  wifi: Wifi,
}

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="kad-hide-sm"
      style={{
        width: 248,
        flex: 'none',
        background: 'var(--ke-dark-bg)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 14px',
      }}
    >
      <div style={{ padding: '6px 8px 20px', display: 'flex', gap: 9, alignItems: 'center' }}>
        <svg viewBox="0 0 200 200" width={24} height={24} style={{ flexShrink: 0 }}>
          <rect width="200" height="200" fill="#0d1714" />
          <path
            d="M100 52 l38 16 v34 c0 26 -17 42 -38 50 c-21 -8 -38 -24 -38 -50 v-34 z"
            fill="none"
            stroke="#93c93f"
            strokeWidth={7}
          />
          <path d="M104 82 l-16 26 h12 l-4 22 l20 -30 h-13 z" fill="#f7941e" />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12.5, letterSpacing: '.1em' }}>
            KINGSTON
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.2em', color: 'var(--ke-green-400)' }}>
            ENERGY&nbsp;HUB
          </span>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {HUB_NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.icon]
          const active = item.href !== null && pathname === item.href
          const disabled = item.href === null

          const rowStyle = {
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            padding: '10px 12px',
            borderRadius: 10,
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 13.5,
            color: active ? '#fff' : disabled ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.65)',
            background: active ? 'rgba(147,201,63,.16)' : 'transparent',
            boxShadow: active ? 'inset 3px 0 0 var(--ke-green-400)' : 'none',
          } as const

          if (disabled) {
            return (
              <div key={item.route} style={rowStyle}>
                <Icon size={18} />
                {item.label}
                <span
                  style={{
                    marginLeft: 'auto',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    letterSpacing: '.08em',
                    color: 'rgba(255,255,255,.3)',
                  }}
                >
                  SOON
                </span>
              </div>
            )
          }

          return (
            <Link key={item.route} href={item.href as string} style={rowStyle}>
              <Icon size={18} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div style={{ marginTop: 'auto' }}>
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
  )
}
