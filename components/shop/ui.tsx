'use client'

import type { CSSProperties, ReactNode } from 'react'

type BadgeTone = 'green' | 'blue' | 'orange' | 'neutral'

const BADGE_TONES: Record<BadgeTone, { bg: string; text: string }> = {
  green: { bg: 'var(--ke-green-50)', text: 'var(--ke-green-700)' },
  blue: { bg: 'var(--ke-blue-50)', text: 'var(--ke-blue-600)' },
  orange: { bg: 'var(--ke-sun-50)', text: 'var(--ke-sun-500)' },
  neutral: { bg: 'var(--ke-gray-100)', text: 'var(--ke-gray-600)' },
}

export function Badge({ tone = 'neutral', dot = false, children }: { tone?: BadgeTone; dot?: boolean; children: ReactNode }) {
  const { bg, text } = BADGE_TONES[tone]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 22,
        padding: '2px 9px',
        borderRadius: 999,
        fontFamily: 'var(--font-display)',
        fontSize: 11,
        fontWeight: 600,
        background: bg,
        color: text,
      }}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: text }} />}
      {children}
    </span>
  )
}

type FeatureTone = 'green' | 'blue' | 'teal' | 'orange'

const FEATURE_TONES: Record<FeatureTone, { bg: string; fg: string }> = {
  green: { bg: 'var(--ke-green-50)', fg: 'var(--ke-green-600)' },
  blue: { bg: 'var(--ke-blue-50)', fg: 'var(--ke-blue-600)' },
  teal: { bg: 'var(--ke-teal-100)', fg: 'var(--ke-teal-700)' },
  orange: { bg: 'var(--ke-sun-50)', fg: 'var(--ke-sun-500)' },
}

export function FeatureIcon({ tone = 'green', size = 48, children }: { tone?: FeatureTone; size?: number; children: ReactNode }) {
  const { bg, fg } = FEATURE_TONES[tone]
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: size / 3,
        background: bg,
        color: fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  )
}

interface ButtonProps {
  variant?: 'primary' | 'outline' | 'ghost'
  size?: 'sm' | 'lg'
  block?: boolean
  onClick?: () => void
  disabled?: boolean
  iconRight?: ReactNode
  iconLeft?: ReactNode
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'lg',
  block = false,
  onClick,
  disabled = false,
  iconRight,
  iconLeft,
  children,
}: ButtonProps) {
  const isSm = size === 'sm'
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: block ? '100%' : undefined,
    height: isSm ? 34 : 52,
    padding: isSm ? '0 16px' : '0 24px',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: isSm ? 13 : 15,
    borderRadius: 999,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'transform .18s cubic-bezier(.16,1,.3,1), box-shadow .22s ease, background .22s ease, border-color .22s ease',
    border: 'none',
  }
  const variants: Record<string, CSSProperties> = {
    primary: { background: 'var(--color-primary)', color: '#fff', boxShadow: isSm ? 'none' : 'var(--shadow-green)' },
    outline: { background: '#fff', color: 'var(--color-text)', border: '1.5px solid var(--color-border)' },
    ghost: { background: 'transparent', color: 'var(--color-text)' },
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{ ...base, ...variants[variant] }}
      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.transform = 'translateY(-2px)'; if (variant === 'primary') e.currentTarget.style.boxShadow = '0 12px 26px -8px rgba(31,107,69,.55)' } }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = variant === 'primary' && !isSm ? 'var(--shadow-green)' : 'none' }}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--color-text)', marginBottom: 8 }}>
        {label}
      </span>
      {children}
    </label>
  )
}

export const inputStyle: CSSProperties = {
  width: '100%',
  height: 46,
  padding: '0 14px',
  border: '1.5px solid var(--color-border)',
  borderRadius: 12,
  fontFamily: 'var(--font-body)',
  fontSize: 14,
  background: '#fff',
  color: 'var(--color-text)',
  outline: 'none',
}

export function Radio({ name, label, checked, onChange }: { name: string; label: string; checked: boolean; onChange: () => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: 'var(--color-text)' }}>
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          border: `2px solid ${checked ? 'var(--color-primary)' : 'var(--color-border-strong)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {checked && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)' }} />}
      </span>
      <input type="radio" name={name} checked={checked} onChange={onChange} style={{ display: 'none' }} />
      {label}
    </label>
  )
}

export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: 'var(--color-text)' }}>
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 6,
          border: `2px solid ${checked ? 'var(--color-primary)' : 'var(--color-border-strong)'}`,
          background: checked ? 'var(--color-primary)' : '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: '#fff',
          fontSize: 12,
        }}
      >
        {checked && '✓'}
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ display: 'none' }} />
      {label}
    </label>
  )
}
