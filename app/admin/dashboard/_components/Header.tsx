'use client'

import { Bell } from 'lucide-react'
import IconButton from './ui/IconButton'
import { TITLES, type SectionId } from './mockData'

interface HeaderProps {
  section: SectionId
}

export default function Header({ section }: HeaderProps) {
  const [title, subtitle] = TITLES[section]

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px 28px',
        borderBottom: '1px solid var(--color-border)',
        background: '#fff',
      }}
    >
      <div>
        <h1 style={{ font: 'var(--text-h3)', margin: 0, color: 'var(--color-text)' }}>{title}</h1>
        <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--color-text-muted)' }}>{subtitle}</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          className="kad-hide-sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--ke-green-50)',
            borderRadius: 999,
            padding: '6px 12px',
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ke-green-500)' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, color: 'var(--ke-green-700)' }}>
            All systems normal
          </span>
        </div>
        <IconButton label="Notifications">
          <Bell size={17} />
        </IconButton>
      </div>
    </div>
  )
}
