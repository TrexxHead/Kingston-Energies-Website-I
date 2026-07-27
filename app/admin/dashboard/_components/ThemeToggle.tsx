'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const KEY = 'ke-admin-theme'

/**
 * Inline script that sets the theme before first paint.
 *
 * Rendered in the dashboard shell so the correct theme is applied during HTML
 * parsing — without it there's a visible flash of the light theme on every
 * load for dark-mode users.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${KEY}');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const current = (document.documentElement.getAttribute('data-theme') as 'light' | 'dark' | null) ?? 'light'
    setTheme(current)
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // Private browsing — the theme still applies for this session.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        width: 34,
        height: 34,
        borderRadius: 999,
        border: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        color: 'var(--color-text-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  )
}
