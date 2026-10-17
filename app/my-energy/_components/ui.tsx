'use client'

import type { CSSProperties, ReactNode } from 'react'
import { CircleCheck, CircleX, CircleHelp, TriangleAlert } from 'lucide-react'
import { BASIS_LABEL, type EvidenceBasis } from '@/lib/energy/engine/basis'

export const card: CSSProperties = {
  background: 'var(--ke-dark-card)',
  border: '1px solid var(--ke-dark-hairline)',
  borderRadius: 20,
  padding: 24,
}

export const label: CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  fontSize: 13,
  color: 'var(--ke-dark-text)',
  marginBottom: 6,
}

export const input: CSSProperties = {
  width: '100%',
  height: 40,
  padding: '0 12px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,.16)',
  background: 'rgba(255,255,255,.04)',
  color: 'var(--ke-dark-text)',
  fontSize: 14,
}

export const muted: CSSProperties = { color: 'var(--ke-dark-text-muted)', fontSize: 13.5, lineHeight: 1.55 }

export const h2: CSSProperties = { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: '#fff', margin: 0 }

export function Btn({
  children,
  onClick,
  variant = 'primary',
  disabled,
  type = 'button',
  ariaLabel,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'danger'
  disabled?: boolean
  type?: 'button' | 'submit'
  ariaLabel?: string
}) {
  const styles: Record<string, CSSProperties> = {
    primary: { background: 'var(--ke-green-500)', color: '#0d1714', border: '1px solid var(--ke-green-500)' },
    ghost: { background: 'transparent', color: 'var(--ke-dark-text)', border: '1px solid rgba(255,255,255,.2)' },
    danger: { background: 'transparent', color: '#f6a5a5', border: '1px solid rgba(246,165,165,.4)' },
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        ...styles[variant],
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        height: 38,
        padding: '0 14px',
        borderRadius: 10,
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: 13.5,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {children}
    </button>
  )
}

const BASIS_TONE: Record<EvidenceBasis, string> = {
  measured: 'var(--ke-green-400)',
  manufacturer: 'var(--ke-blue-300)',
  customer_entered: 'var(--ke-sun-300)',
  assumed: 'var(--ke-gray-400)',
}

/** Evidence basis chip — always a word, never colour alone. */
export function BasisChip({ basis }: { basis: EvidenceBasis }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 22,
        padding: '0 9px',
        borderRadius: 999,
        border: `1px solid ${BASIS_TONE[basis]}`,
        color: BASIS_TONE[basis],
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        letterSpacing: '.04em',
        whiteSpace: 'nowrap',
      }}
    >
      {BASIS_LABEL[basis]}
    </span>
  )
}

export type StatusWord = 'pass' | 'fail' | 'needs_review' | 'marginal' | 'unknown'

const STATUS_META: Record<StatusWord, { label: string; color: string; Icon: typeof CircleCheck }> = {
  pass: { label: 'Pass', color: 'var(--ke-green-400)', Icon: CircleCheck },
  fail: { label: 'Does not meet', color: '#f6a5a5', Icon: CircleX },
  needs_review: { label: 'Needs review', color: 'var(--ke-sun-300)', Icon: TriangleAlert },
  marginal: { label: 'Borderline', color: 'var(--ke-sun-300)', Icon: TriangleAlert },
  unknown: { label: 'Unknown', color: 'var(--ke-gray-400)', Icon: CircleHelp },
}

export function StatusTag({ status }: { status: StatusWord }) {
  const m = STATUS_META[status]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: m.color, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>
      <m.Icon size={16} aria-hidden /> {m.label}
    </span>
  )
}

export const BASIS_OPTIONS: { value: EvidenceBasis; label: string }[] = [
  { value: 'measured', label: 'Measured with a meter' },
  { value: 'manufacturer', label: 'From the label / manual' },
  { value: 'customer_entered', label: 'My estimate' },
  { value: 'assumed', label: 'Assumed (typical figure)' },
]

export function fmt(n: number, digits = 1): string {
  return n.toLocaleString('en-JM', { maximumFractionDigits: digits, minimumFractionDigits: 0 })
}
