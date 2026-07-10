'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Check, Tag, X, Star } from 'lucide-react'

export type ToastIcon = 'check' | 'tag' | 'x' | 'star'

interface Toast {
  id: number
  icon: ToastIcon
  title: string
  sub: string
}

interface ToastContextValue {
  pushToast: (icon: ToastIcon, title: string, sub: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ICONS = { check: Check, tag: Tag, x: X, star: Star }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const pushToast = useCallback((icon: ToastIcon, title: string, sub: string) => {
    counter.current += 1
    const id = counter.current
    setToasts((prev) => [...prev, { id, icon, title, sub }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200)
  }, [])

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.icon]
          return (
            <div
              key={t.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'var(--ke-dark-card)',
                border: '1px solid var(--ke-dark-hairline)',
                borderRadius: 14,
                padding: '12px 16px',
                boxShadow: 'var(--shadow-lg)',
                minWidth: 240,
                animation: 'keUp .3s var(--ease-out)',
              }}
            >
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: 'rgba(147,201,63,.16)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={16} color="var(--ke-green-400)" />
              </span>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, color: 'var(--ke-dark-text)' }}>
                  {t.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ke-dark-text-muted)', marginTop: 2 }}>{t.sub}</div>
              </div>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
