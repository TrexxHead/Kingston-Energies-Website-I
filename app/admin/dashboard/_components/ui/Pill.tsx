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
        background: selected ? '#0d1714' : '#fff',
        color: selected ? '#fff' : 'var(--color-text)',
        border: selected ? '1.5px solid #0d1714' : '1.5px solid var(--color-border)',
      }}
    >
      {label}
    </button>
  )
}
