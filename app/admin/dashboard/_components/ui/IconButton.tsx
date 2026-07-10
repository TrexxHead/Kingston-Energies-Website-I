'use client'

import type { ReactNode } from 'react'

interface IconButtonProps {
  label: string
  children: ReactNode
  onClick?: () => void
}

export default function IconButton({ label, children, onClick }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        width: 36,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        border: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        cursor: 'pointer',
        transition: 'background var(--dur-base) var(--ease-standard)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-sunk)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-surface)')}
    >
      {children}
    </button>
  )
}
