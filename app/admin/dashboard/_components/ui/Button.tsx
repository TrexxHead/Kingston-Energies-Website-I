'use client'

import type { ReactNode } from 'react'

interface ButtonProps {
  variant?: 'primary' | 'outline'
  size?: 'sm' | 'lg'
  block?: boolean
  onClick?: () => void
  iconRight?: ReactNode
  children: ReactNode
}

export default function Button({
  variant = 'primary',
  size = 'lg',
  block = false,
  onClick,
  iconRight,
  children,
}: ButtonProps) {
  const isPrimary = variant === 'primary'
  const isSm = size === 'sm'

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: block ? '100%' : undefined,
        height: isSm ? 32 : 52,
        padding: isSm ? '0 14px' : '0 24px',
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: isSm ? 12.5 : 15,
        borderRadius: 'var(--radius-pill)',
        border: isPrimary ? 'none' : '1.5px solid var(--color-border)',
        background: isPrimary ? 'var(--color-primary)' : 'var(--color-surface)',
        color: isPrimary ? 'var(--color-primary-contrast)' : 'var(--color-text)',
        boxShadow: isPrimary && !isSm ? 'var(--shadow-green)' : 'none',
        cursor: 'pointer',
        transition: 'background var(--dur-base) var(--ease-standard), border-color var(--dur-base) var(--ease-standard)',
      }}
      onMouseEnter={(e) => {
        if (isPrimary) e.currentTarget.style.background = 'var(--color-primary-hover)'
        else e.currentTarget.style.borderColor = 'var(--color-border-strong)'
      }}
      onMouseLeave={(e) => {
        if (isPrimary) e.currentTarget.style.background = 'var(--color-primary)'
        else e.currentTarget.style.borderColor = 'var(--color-border)'
      }}
    >
      {children}
      {iconRight}
    </button>
  )
}
