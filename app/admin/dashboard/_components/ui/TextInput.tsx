'use client'

import type { CSSProperties } from 'react'

interface TextInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  options?: string[]
}

const controlStyle: CSSProperties = {
  width: '100%',
  height: 40,
  padding: '0 12px',
  border: '1.5px solid var(--color-border)',
  borderRadius: 10,
  fontFamily: 'var(--font-body)',
  fontSize: 13.5,
  background: '#fff',
  color: 'var(--color-text)',
  outline: 'none',
}

export default function TextInput({ label, value, onChange, type = 'text', placeholder, options }: TextInputProps) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, color: 'var(--color-text)', marginBottom: 6 }}>
        {label}
      </span>
      {options ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...controlStyle, appearance: 'none' }}>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={controlStyle} />
      )}
    </label>
  )
}
