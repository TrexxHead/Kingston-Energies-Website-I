'use client'

type Tone = 'green' | 'blue' | 'sun'

interface ProgressBarProps {
  value: number
  max?: number
  label: string
  tone?: Tone
  showValue?: boolean
}

const TONE_FILL: Record<Tone, string> = {
  green: 'var(--ke-green-500)',
  blue: 'var(--ke-blue-400)',
  sun: 'var(--ke-sun-400)',
}

export default function ProgressBar({ value, max = 100, label, tone = 'green', showValue = false }: ProgressBarProps) {
  const pct = Math.min(100, (value / max) * 100)

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>
        <span>{label}</span>
        {showValue && <span>{value}%</span>}
      </div>
      <div style={{ height: 9, borderRadius: 'var(--radius-pill)', background: 'var(--ke-gray-100)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: TONE_FILL[tone], borderRadius: 'var(--radius-pill)' }} />
      </div>
    </div>
  )
}
