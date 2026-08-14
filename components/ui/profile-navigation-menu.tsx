'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

export type ProfileNavigationItem = {
  label: string
  href: string
  icon?: ReactNode
  description?: string
  exact?: boolean
}

export type ProfileNavigationSection = {
  label?: string
  items: ProfileNavigationItem[]
}

export interface ProfileNavigationMenuProps {
  name: string
  subtitle: string
  avatar?: ReactNode
  sections: ProfileNavigationSection[]
  /** Current pathname, used to mark the active link (`aria-current="page"`). */
  activePathname: string
  /** Display-only shortcut hint shown on the collapsed pill, e.g. "⌘K". */
  shortcutLabel?: string
  /** Optional keyboard key (without modifier) that opens the panel — checked
   *  against Meta on Mac / Ctrl elsewhere. Omit if the site already owns
   *  that shortcut. */
  shortcutKey?: string
  footer?: ReactNode
  className?: string
}

const isActive = (href: string, pathname: string, exact?: boolean) =>
  exact ? pathname === href : href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

/**
 * A disclosure — not an ARIA menu/listbox — that unfolds a compact identity
 * pill into a short list of real navigation links. Trigger is a plain
 * button; destinations are plain links inside a labelled <nav>, so Tab moves
 * through them naturally and nothing traps focus. See the W3C disclosure
 * pattern: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
 */
export default function ProfileNavigationMenu({
  name,
  subtitle,
  avatar,
  sections,
  activePathname,
  shortcutLabel,
  shortcutKey,
  footer,
  className,
}: ProfileNavigationMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const reduceMotion = useReducedMotion()

  useEffect(() => setOpen(false), [activePathname])

  // Outside pointer interaction closes the panel — scoped to this component's
  // own ref, never a document-wide selector query.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // Escape closes and restores focus to the trigger.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // Optional global shortcut to open — only wired if the caller supplies a
  // key, so this never fights a shortcut the site already owns elsewhere.
  useEffect(() => {
    if (!shortcutKey) return
    const onKey = (e: KeyboardEvent) => {
      const modifier = /Mac|iPhone|iPad/.test(navigator.platform) ? e.metaKey : e.ctrlKey
      if (modifier && e.key.toLowerCase() === shortcutKey.toLowerCase()) {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shortcutKey])

  const collapseTransition = reduceMotion ? { duration: 0.15 } : { type: 'spring' as const, stiffness: 420, damping: 36, mass: 0.6 }
  const contentTransition = reduceMotion ? { duration: 0.15 } : { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }

  return (
    <div ref={rootRef} className={className} style={{ position: 'relative', width: '100%' }}>
      <motion.div
        layout={!reduceMotion}
        transition={collapseTransition}
        style={{
          width: '100%',
          borderRadius: open ? 22 : 999,
          background: 'rgba(20,31,27,.74)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          border: '1px solid rgba(255,255,255,.1)',
          boxShadow: open ? '0 24px 56px rgba(0,0,0,.4)' : '0 8px 24px rgba(0,0,0,.25)',
          overflow: 'hidden',
        }}
      >
        <button
          ref={triggerRef}
          type="button"
          className="ke-pnav-trigger"
          id={`${panelId}-trigger`}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? 'Close profile navigation' : 'Open profile navigation'}
          onClick={() => setOpen((v) => !v)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 14px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            minHeight: 64,
          }}
        >
          <span style={{ flex: 'none', width: 40, height: 40, borderRadius: '50%', overflow: 'hidden' }} aria-hidden="true">
            {avatar}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                display: 'block',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 14,
                color: '#fff',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {name}
            </span>
            <span
              style={{
                display: 'block',
                fontSize: 12,
                color: 'rgba(255,255,255,.55)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {subtitle}
            </span>
          </span>
          {shortcutLabel && (
            <span
              style={{
                flex: 'none',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'rgba(255,255,255,.4)',
                border: '1px solid rgba(255,255,255,.14)',
                borderRadius: 7,
                padding: '3px 7px',
              }}
            >
              {shortcutLabel}
            </span>
          )}
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="panel"
              id={panelId}
              role="region"
              aria-labelledby={`${panelId}-trigger`}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={contentTransition}
              style={{
                borderTop: '1px solid rgba(255,255,255,.08)',
                padding: '6px 8px 10px',
                maxHeight: 'min(70dvh, 36rem)',
                overflowY: 'auto',
                overscrollBehavior: 'contain',
              }}
            >
              {sections.map((section, i) => (
                <nav key={section.label ?? i} aria-label={section.label ?? 'Profile navigation'} style={{ padding: '6px 0' }}>
                  {section.label && (
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        letterSpacing: '.18em',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,.35)',
                        padding: '2px 8px 6px',
                      }}
                    >
                      {section.label}
                    </div>
                  )}
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {section.items.map((item) => {
                      const active = isActive(item.href, activePathname, item.exact)
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className="ke-pnav-link"
                            aria-current={active ? 'page' : undefined}
                            onClick={() => setOpen(false)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              minHeight: 44,
                              padding: '9px 10px',
                              borderRadius: 12,
                              fontFamily: 'var(--font-display)',
                              fontWeight: 600,
                              fontSize: 13.5,
                              textDecoration: 'none',
                              color: active ? '#fff' : 'rgba(255,255,255,.78)',
                              background: active ? 'rgba(147,201,63,.18)' : 'transparent',
                            }}
                          >
                            {item.icon && (
                              <span style={{ flex: 'none', display: 'flex', color: active ? 'var(--ke-green-400,#93c93f)' : 'rgba(255,255,255,.5)' }} aria-hidden="true">
                                {item.icon}
                              </span>
                            )}
                            <span style={{ flex: 1, minWidth: 0 }}>
                              {item.label}
                              {item.description && (
                                <span style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,.4)' }}>{item.description}</span>
                              )}
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </nav>
              ))}

              {footer && <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', marginTop: 6, paddingTop: 8 }}>{footer}</div>}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
