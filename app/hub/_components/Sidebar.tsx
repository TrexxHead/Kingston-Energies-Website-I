'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  BatteryCharging,
  Gift,
  UserRound,
  LifeBuoy,
  Settings,
  Leaf,
  ExternalLink,
} from 'lucide-react'
import { formatCo2 } from '@/lib/impact'
import { HUB_MAIN_NAV, HUB_FOOTER_NAV, type HubNavItem } from './hubNav'

const ICONS: Record<string, typeof LayoutDashboard> = {
  'layout-dashboard': LayoutDashboard,
  package: Package,
  'battery-charging': BatteryCharging,
  gift: Gift,
  'user-round': UserRound,
  'life-buoy': LifeBuoy,
  settings: Settings,
}

export default function Sidebar() {
  const pathname = usePathname()
  const [co2, setCo2] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/hub/summary')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setCo2(formatCo2(Number(d.co2Kg) || 0))
      })
      .catch(() => {
        if (!cancelled) setCo2(formatCo2(0))
      })
    return () => {
      cancelled = true
    }
  }, [])

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
        overflowY: 'auto',
      }}
    >
      {/* Wordmark */}
      <div style={{ padding: '6px 8px 22px', display: 'flex', gap: 9, alignItems: 'center' }}>
        <svg viewBox="0 0 200 200" width={26} height={26} style={{ flexShrink: 0 }}>
          <rect width="200" height="200" rx="44" fill="#0d1714" />
          <path
            d="M100 52 l38 16 v34 c0 26 -17 42 -38 50 c-21 -8 -38 -24 -38 -50 v-34 z"
            fill="none"
            stroke="#93c93f"
            strokeWidth={7}
          />
          <path d="M104 82 l-16 26 h12 l-4 22 l20 -30 h-13 z" fill="#f7941e" />
        </svg>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, letterSpacing: '.02em' }}>
          KINGSTON <span style={{ color: 'var(--ke-green-400)' }}>ENERGIES</span>
        </span>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {HUB_MAIN_NAV.map((item) => (
          <NavRow key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      {/* CO2 saved card — proportional to items purchased */}
      <div
        style={{
          margin: '18px 4px',
          padding: '16px 16px 18px',
          borderRadius: 14,
          background: 'linear-gradient(160deg, rgba(147,201,63,.16), rgba(147,201,63,.04))',
          border: '1px solid rgba(147,201,63,.22)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'rgba(255,255,255,.7)' }}>
          <Leaf size={14} color="var(--ke-green-400)" />
          <span style={{ fontSize: 11.5 }}>
            Lifetime CO<sub>2</sub> saved
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, marginTop: 6 }}>
          {co2 ?? '—'}
        </div>
        <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.45)', marginTop: 4 }}>Estimated from your orders</div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {HUB_FOOTER_NAV.map((item) => (
          <NavRow key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: 12 }}>
        <Link href="/" style={{ ...rowBase, color: 'rgba(255,255,255,.6)' }}>
          <ExternalLink size={17} />
          Back to site
        </Link>
      </div>
    </aside>
  )
}

const rowBase = {
  display: 'flex',
  alignItems: 'center',
  gap: 11,
  padding: '10px 12px',
  borderRadius: 10,
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  fontSize: 13.5,
  textDecoration: 'none',
} as const

function NavRow({ item, pathname }: { item: HubNavItem; pathname: string }) {
  const Icon = ICONS[item.icon]
  // Exact match for /hub (Overview); prefix match for the sub-routes.
  const active = item.href === '/hub' ? pathname === '/hub' : pathname.startsWith(item.href)

  return (
    <Link
      href={item.href}
      style={{
        ...rowBase,
        color: active ? '#fff' : 'rgba(255,255,255,.65)',
        background: active ? 'rgba(147,201,63,.16)' : 'transparent',
        boxShadow: active ? 'inset 3px 0 0 var(--ke-green-400)' : 'none',
      }}
    >
      <Icon size={18} />
      {item.label}
    </Link>
  )
}
