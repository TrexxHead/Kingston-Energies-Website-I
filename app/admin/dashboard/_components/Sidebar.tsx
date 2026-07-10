'use client'

import {
  LayoutDashboard,
  KanbanSquare,
  Boxes,
  Users,
  Megaphone,
  Wallet,
  ChartScatter,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { NAV_ITEMS, type SectionId } from './mockData'

const ICONS: Record<string, typeof LayoutDashboard> = {
  'layout-dashboard': LayoutDashboard,
  'kanban-square': KanbanSquare,
  boxes: Boxes,
  users: Users,
  megaphone: Megaphone,
  wallet: Wallet,
  'chart-scatter': ChartScatter,
}

interface SidebarProps {
  section: SectionId
  onSelect: (section: SectionId) => void
}

export default function Sidebar({ section, onSelect }: SidebarProps) {
  return (
    <aside
      className="kad-hide-sm"
      style={{
        width: 238,
        flex: 'none',
        background: '#0d1714',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 14px',
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
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12.5, letterSpacing: '.1em', color: '#fff' }}>
            KINGSTON
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.2em', color: 'var(--ke-green-400)' }}>
            ADMIN&nbsp;CONSOLE
          </span>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.icon]
          const active = item.id === section
          return (
            <div
              key={item.id}
              onClick={() => onSelect(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '10px 12px',
                borderRadius: 10,
                cursor: 'pointer',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 13.5,
                color: active ? '#fff' : 'rgba(255,255,255,.65)',
                background: active ? 'rgba(147,201,63,.16)' : 'transparent',
                boxShadow: active ? 'inset 3px 0 0 var(--ke-green-400)' : 'none',
              }}
            >
              <Icon size={18} />
              {item.label}
            </div>
          )
        })}
      </nav>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)' }}>Signed in as</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, marginTop: 2 }}>Ops Admin</div>
        </div>
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
