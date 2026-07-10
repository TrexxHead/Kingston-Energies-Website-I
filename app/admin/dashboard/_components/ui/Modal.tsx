'use client'

import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: number
}

export default function Modal({ title, onClose, children, footer, width = 440 }: ModalProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        background: 'rgba(13,23,20,.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        animation: 'keFade .2s var(--ease-out)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 18,
          width: '100%',
          maxWidth: width,
          maxHeight: '88vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-xl)',
          color: 'var(--color-text)',
          animation: 'keUp .25s var(--ease-out)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--color-border)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, margin: 0 }}>{title}</h3>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid var(--color-border)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={15} />
          </button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
        {footer && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 20px', borderTop: '1px solid var(--color-border)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
