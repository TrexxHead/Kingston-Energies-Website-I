'use client'

import { usePathname, useRouter } from 'next/navigation'
import NotificationsBell from './NotificationsBell'
import ThemeToggle from './ThemeToggle'
import { titleFor } from './nav'
import { hrefForSection } from './sectionHref'

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { title, subtitle, breadcrumb } = titleFor(pathname)

  return (
    <div
      className="kad-header"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px 28px',
        borderBottom: '1px solid rgba(16,24,20,.06)',
        background: 'rgba(255,255,255,.72)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      <div style={{ minWidth: 0 }}>
        {/* Says where you are within the section, so a subsection page never
            reads as though it were the whole of Finance. */}
        {breadcrumb && (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9.5,
              letterSpacing: '.12em',
              textTransform: 'uppercase',
              color: 'var(--color-text-subtle)',
              marginBottom: 2,
            }}
          >
            {breadcrumb}
          </div>
        )}
        <h1 style={{ font: 'var(--text-h3)', margin: 0, color: 'var(--color-text)' }}>{title}</h1>
        <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--color-text-muted)' }}>{subtitle}</p>
      </div>

      <span
        title="Press Cmd/Ctrl + K"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9.5,
          letterSpacing: '.06em',
          color: 'var(--color-text-subtle)',
          border: '1px solid var(--color-border)',
          borderRadius: 6,
          padding: '4px 7px',
          whiteSpace: 'nowrap',
        }}
      >
        ⌘K
      </span>
      <ThemeToggle />
      <NotificationsBell onNavigate={(section) => router.push(hrefForSection(section))} />
    </div>
  )
}
