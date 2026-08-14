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
  /** Display-only shortcut hint shown in the panel header, e.g. "⌘K". */
  shortcutLabel?: string
  /** Optional keyboard key (without modifier) that opens the panel — checked
   *  against Meta on Mac / Ctrl elsewhere. Omit if the site already owns
   *  that shortcut. */
  shortcutKey?: string
  footer?: ReactNode
  className?: string
  /** Panel width in px — kept fixed regardless of trigger width. */
  panelWidth?: number
}

const isActive = (href: string, pathname: string, exact?: boolean) =>
  exact ? pathname === href : href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

// One consistent spring for everything — the trigger's press feedback and
// the panel's open/close both settle on the same physical curve, rather
// than mixing a spring here with a duration-based ease there.
const SPRING = { type: 'spring' as const, stiffness: 380, damping: 32, mass: 0.6 }

/**
 * A disclosure — not an ARIA menu/listbox — anchored to its trigger like a
 * standard dropdown: a compact pill in the navbar unfolds a panel beneath
 * it, without pushing surrounding layout around (the panel is positioned
 * absolute, off the document flow). Trigger is a plain button; destinations
 * are plain links inside a labelled <nav>, so Tab moves through them
 * naturally and nothing traps focus. See the W3C disclosure pattern:
 * https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
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
  panelWidth = 264,
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

  const panelTransition = reduceMotion ? { duration: 0.15 } : SPRING

  return (
    <div ref={rootRef} className={className} style={{ position: 'relative', display: 'inline-flex' }}>
      <motion.button
        ref={triggerRef}
        type="button"
        className="ke-pnav-trigger"
        id={`${panelId}-trigger`}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Close profile navigation' : 'Open profile navigation'}
        onClick={() => setOpen((v) => !v)}
        whileTap={reduceMotion ? undefined : { scale: 0.94 }}
        transition={SPRING}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          height: 36,
          padding: '0 6px 0 4px',
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,.14)',
          background: open ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.05)',
          cursor: 'pointer',
          maxWidth: 160,
        }}
      >
        <span style={{ flex: 'none', width: 28, height: 28, borderRadius: '50%', overflow: 'hidden' }} aria-hidden="true">
          {avatar}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 12.5,
            color: '#fff',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            id={panelId}
            role="region"
            aria-labelledby={`${panelId}-trigger`}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -6 }}
            transition={panelTransition}
            style={{
              position: 'absolute',
              top: 'calc(100% + 10px)',
              right: 0,
              width: panelWidth,
              transformOrigin: 'top right',
              background: 'rgba(20,31,27,.92)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              border: '1px solid rgba(255,255,255,.1)',
              borderRadius: 18,
              boxShadow: '0 24px 56px rgba(0,0,0,.45)',
              overflow: 'hidden',
              zIndex: 60,
            }}
          >
            {/* Identity header — repeats name + subtitle in full, since the
                collapsed trigger truncates the name to fit the navbar. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px 10px' }}>
              <span style={{ flex: 'none', width: 34, height: 34, borderRadius: '50%', overflow: 'hidden' }} aria-hidden="true">
                {avatar}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: 'block',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 13.5,
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
                    fontSize: 11,
                    color: 'rgba(255,255,255,.5)',
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
                    fontSize: 10.5,
                    color: 'rgba(255,255,255,.4)',
                    border: '1px solid rgba(255,255,255,.14)',
                    borderRadius: 6,
                    padding: '2px 6px',
                  }}
                >
                  {shortcutLabel}
                </span>
              )}
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', padding: '6px 8px 8px', maxHeight: 'min(60dvh, 30rem)', overflowY: 'auto', overscrollBehavior: 'contain' }}>
              {sections.map((section, i) => (
                <nav key={section.label ?? i} aria-label={section.label ?? 'Profile navigation'} style={{ padding: '4px 0' }}>
                  {section.label && (
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        letterSpacing: '.18em',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,.35)',
                        padding: '2px 6px 6px',
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
                              minHeight: 40,
                              padding: '8px 8px',
                              borderRadius: 10,
                              fontFamily: 'var(--font-display)',
                              fontWeight: 600,
                              fontSize: 13,
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
                                <span style={{ display: 'block', fontSize: 10.5, fontWeight: 500, color: 'rgba(255,255,255,.4)' }}>{item.description}</span>
                              )}
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </nav>
              ))}

              {footer && <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', marginTop: 4, paddingTop: 6 }}>{footer}</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
