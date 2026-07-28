'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search, CornerDownLeft } from 'lucide-react'

export interface Command {
  id: string
  label: string
  group: string
  /** Extra words to match on that aren't in the visible label. */
  keywords?: string
  run: () => void
}

/**
 * Cmd/Ctrl-K command palette.
 *
 * With the dashboard now spanning nine sections and Finance alone carrying
 * eleven tabs, hunting through nested navigation is the slow path. This makes
 * every destination reachable in a few keystrokes.
 */
export default function CommandPalette({ commands }: { commands: Command[] }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      // Focus after the dialog paints.
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter((c) => `${c.label} ${c.group} ${c.keywords ?? ''}`.toLowerCase().includes(q))
  }, [commands, query])

  // Keep the highlight inside the result list as it shrinks.
  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, results.length - 1)))
  }, [results.length])

  const runActive = useCallback(() => {
    const cmd = results[active]
    if (!cmd) return
    setOpen(false)
    cmd.run()
  }, [results, active])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => (a + 1) % Math.max(1, results.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (a - 1 + Math.max(1, results.length)) % Math.max(1, results.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      runActive()
    }
  }

  if (!open) return null

  let lastGroup = ''

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0,0,0,.45)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(560px, 92vw)',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 16,
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--color-border)' }}>
          <Search size={16} color="var(--color-text-subtle)" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search sections and actions…"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 14.5,
              fontFamily: 'var(--font-body)',
              color: 'var(--color-text)',
            }}
          />
          <kbd style={kbd}>ESC</kbd>
        </div>

        <div style={{ maxHeight: 380, overflowY: 'auto', padding: 6 }}>
          {results.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '18px 12px', margin: 0, textAlign: 'center' }}>
              Nothing matches “{query}”.
            </p>
          ) : (
            results.map((c, i) => {
              const showGroup = c.group !== lastGroup
              lastGroup = c.group
              return (
                <div key={c.id}>
                  {showGroup && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.12em', color: 'var(--color-text-subtle)', padding: '10px 10px 4px' }}>
                      {c.group.toUpperCase()}
                    </div>
                  )}
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => { setOpen(false); c.run() }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      width: '100%',
                      padding: '9px 10px',
                      borderRadius: 9,
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      background: i === active ? 'var(--color-primary-soft)' : 'transparent',
                      color: 'var(--color-text)',
                      fontFamily: 'var(--font-body)',
                      fontSize: 13.5,
                    }}
                  >
                    {c.label}
                    {i === active && <CornerDownLeft size={13} color="var(--color-text-subtle)" />}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

const kbd = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9.5,
  padding: '3px 6px',
  borderRadius: 5,
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-subtle)',
} as const

/**
 * Every page in the console, as a command.
 *
 * Built from the nav tree rather than a parallel list, so a page cannot exist
 * in the sidebar and be missing from search.
 */
export function navCommands(
  pages: { href: string; label: string; description: string; group: string; keywords?: string }[],
  go: (href: string) => void,
): Command[] {
  return pages.map((p) => ({
    id: `nav-${p.href}`,
    label: p.group === 'Go to' ? p.label : `${p.group} → ${p.label}`,
    group: p.group,
    keywords: [p.description, p.keywords].filter(Boolean).join(' '),
    run: () => go(p.href),
  }))
}
