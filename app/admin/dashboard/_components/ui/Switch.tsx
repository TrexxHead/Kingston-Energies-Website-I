'use client'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

export default function Switch({ checked, onChange }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 42,
        height: 24,
        borderRadius: 'var(--radius-pill)',
        border: 'none',
        padding: 3,
        display: 'flex',
        justifyContent: checked ? 'flex-end' : 'flex-start',
        background: checked ? 'var(--color-primary)' : 'var(--ke-gray-300)',
        cursor: 'pointer',
        transition: 'background var(--dur-base) var(--ease-standard)',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#fff',
          transition: 'transform var(--dur-base) var(--ease-standard)',
        }}
      />
    </button>
  )
}
