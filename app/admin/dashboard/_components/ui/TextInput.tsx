'use client'

import type { CSSProperties, FocusEvent } from 'react'

interface TextInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  options?: string[]
  multiline?: boolean
}

const controlStyle: CSSProperties = {
  width: '100%',
  height: 42,
  padding: '0 13px',
  border: '1.5px solid var(--color-border)',
  borderRadius: 12,
  fontFamily: 'var(--font-body)',
  fontSize: 13.5,
  background: 'var(--color-surface-sunk)',
  color: 'var(--color-text)',
  outline: 'none',
  transition: 'border-color .15s ease, box-shadow .15s ease, background .15s ease',
}

// Green focus ring, iOS-style.
const onFocus = (e: FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = 'var(--ke-green-500)'
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(147,201,63,.18)'
  e.currentTarget.style.background = 'var(--color-surface)'
}
const onBlur = (e: FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = 'var(--color-border)'
  e.currentTarget.style.boxShadow = 'none'
  e.currentTarget.style.background = 'var(--color-surface-sunk)'
}

export default function TextInput({ label, value, onChange, type = 'text', placeholder, options, multiline }: TextInputProps) {
  return (
    <label style={{ display: 'block' }}>
      {label && (
        <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, color: 'var(--color-text)', marginBottom: 6 }}>
          {label}
        </span>
      )}
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          onFocus={onFocus as unknown as (e: FocusEvent<HTMLTextAreaElement>) => void}
          onBlur={onBlur as unknown as (e: FocusEvent<HTMLTextAreaElement>) => void}
          style={{ ...controlStyle, height: 'auto', minHeight: 88, padding: '10px 13px', resize: 'vertical', lineHeight: 1.5 }}
        />
      ) : options ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} onFocus={onFocus} onBlur={onBlur} style={{ ...controlStyle, appearance: 'none' }}>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} onFocus={onFocus} onBlur={onBlur} style={controlStyle} />
      )}
    </label>
  )
}
