import type { CSSProperties } from 'react'

export const authLabelStyle: CSSProperties = {
  display: 'block',
  fontSize: 12.5,
  fontWeight: 600,
  color: 'var(--ke-dark-text-muted)',
  marginBottom: 6,
}

export const authInputStyle: CSSProperties = {
  width: '100%',
  height: 44,
  padding: '0 14px',
  background: 'rgba(255,255,255,.05)',
  border: '1px solid var(--ke-dark-hairline)',
  borderRadius: 10,
  color: 'var(--ke-dark-text)',
  fontSize: 14,
  outline: 'none',
}

export const authSubmitStyle: CSSProperties = {
  width: '100%',
  height: 46,
  border: 'none',
  borderRadius: 999,
  background: 'var(--color-primary)',
  color: '#fff',
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
  marginTop: 8,
}

export const authErrorStyle: CSSProperties = {
  background: 'var(--color-danger-soft)',
  color: 'var(--color-danger)',
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 12.5,
  marginBottom: 14,
}

export const authDividerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  margin: '18px 0',
  color: 'var(--ke-dark-text-muted)',
  fontSize: 11.5,
}
