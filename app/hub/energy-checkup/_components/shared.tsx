'use client'

import type { CSSProperties } from 'react'
import { Minus, Plus } from 'lucide-react'

export function PillGroup({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string
  hint?: string
  options: { value: string; label: string }[]
  value: string | undefined
  onChange: (v: string) => void
}) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5, color: 'var(--color-text)' }}>{label}</span>
        {hint && <span style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>{hint}</span>}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => {
          const selected = value === o.value
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              style={{
                padding: '9px 15px',
                borderRadius: 999,
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 13,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                border: selected ? '1.5px solid var(--ke-green-500)' : '1.5px solid var(--color-border)',
                background: selected ? 'var(--ke-green-50)' : '#fff',
                color: selected ? 'var(--ke-green-700)' : 'var(--color-text-muted)',
              }}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 20,
}: {
  label?: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
}) {
  const btn: CSSProperties = {
    width: 26,
    height: 26,
    borderRadius: '50%',
    border: '1px solid var(--color-border)',
    background: '#fff',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {label && <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{label}</span>}
      <button type="button" style={btn} onClick={() => onChange(Math.max(min, value - 1))} aria-label="Decrease">
        <Minus size={13} />
      </button>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, minWidth: 26, textAlign: 'center' }}>{value}</span>
      <button type="button" style={btn} onClick={() => onChange(Math.min(max, value + 1))} aria-label="Increase">
        <Plus size={13} />
      </button>
    </div>
  )
}

export const wizardCard: CSSProperties = {
  background: '#fff',
  border: '1px solid var(--color-border)',
  borderRadius: 20,
  padding: 26,
}

export const stepHeading: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: 20,
  margin: '0 0 4px',
}

export const stepSubhead: CSSProperties = {
  fontSize: 14,
  color: 'var(--color-text-muted)',
  margin: '0 0 20px',
}
