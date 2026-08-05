'use client'

interface PillProps {
  label: string
  selected: boolean
  onClick: () => void
}

export default function Pill({ label, selected, onClick }: PillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 15px',
        borderRadius: 999,
        cursor: 'pointer',
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: 12.5,
        background: selected ? 'var(--color-primary)' : 'var(--color-surface)',
        color: selected ? 'var(--color-primary-contrast)' : 'var(--color-text)',
        border: selected ? '1.5px solid var(--color-primary)' : '1.5px solid var(--color-border)',
        transition: 'background .18s ease, border-color .18s ease, color .18s ease',
      }}
    >
      {label}
    </button>
  )
}
