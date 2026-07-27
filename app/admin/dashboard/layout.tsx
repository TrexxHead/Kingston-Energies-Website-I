'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { keFontVariables } from '../../_design-system/fonts'
import Sidebar from './_components/Sidebar'
import Header from './_components/Header'
import CommandPalette, { navCommands } from './_components/CommandPalette'
import { themeInitScript } from './_components/ThemeToggle'
import { allPages } from './_components/nav'
import '../../_design-system/tokens.css'

/**
 * The console shell.
 *
 * It stays mounted across navigations, so moving between subsections swaps only
 * the page body — the sidebar keeps its scroll position and expanded state
 * instead of rebuilding itself every time you click.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  // Heartbeat so Settings can show which admins are currently active.
  useEffect(() => {
    const ping = () => {
      void fetch('/api/admin/heartbeat', { method: 'POST' })
    }
    ping()
    const id = setInterval(ping, 60_000)
    return () => clearInterval(id)
  }, [])

  const commands = navCommands(allPages(), (href) => router.push(href))

  return (
    <div
      className={`${keFontVariables} ke-root`}
      style={{
        fontFamily: 'var(--font-body)',
        color: 'var(--color-text)',
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--color-bg-subtle)',
      }}
    >
      {/* Sets the theme during HTML parsing so dark-mode users never see a
          flash of the light theme. */}
      <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      <CommandPalette commands={commands} />
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Keyed on the path so each page animates in, rather than the new
              screen appearing mid-scroll of the old one. */}
          <div key={pathname} className="ke-screen kad-section" style={{ padding: 28 }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
