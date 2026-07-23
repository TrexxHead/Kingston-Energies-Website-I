'use client'

import NotificationsBell from './NotificationsBell'
import { TITLES, type SectionId } from './mockData'

interface HeaderProps {
  section: SectionId
  onNavigate?: (tab: SectionId) => void
}

export default function Header({ section, onNavigate }: HeaderProps) {
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

      <NotificationsBell onNavigate={onNavigate} />
    </div>
  )
}
