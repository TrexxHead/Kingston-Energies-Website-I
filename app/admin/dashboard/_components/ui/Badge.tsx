'use client'

import type { ReactNode } from 'react'

type Tone = 'green' | 'blue' | 'orange' | 'neutral'

interface BadgeProps {
  tone?: Tone
  dot?: boolean
  children: ReactNode
  onClick?: () => void
}

const TONE_STYLES: Record<Tone, { bg: string; text: string }> = {
  green: { bg: 'var(--ke-green-50)', text: 'var(--ke-green-700)' },
  blue: { bg: 'var(--ke-blue-50)', text: 'var(--ke-blue-600)' },
  orange: { bg: 'var(--ke-sun-50)', text: 'var(--ke-sun-500)' },
  neutral: { bg: 'var(--ke-gray-100)', text: 'var(--ke-gray-600)' },
}

export default function Badge({ tone = 'neutral', dot = false, children, onClick }: BadgeProps) {
  const { bg, text } = TONE_STYLES[tone]
  const Tag = onClick ? 'button' : 'span'

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 20,
        padding: '2px 8px',
        borderRadius: 'var(--radius-pill)',
        fontFamily: 'var(--font-display)',
        fontSize: 11,
        fontWeight: 600,
        background: bg,
        color: text,
        border: 'none',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: text,
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </Tag>
  )
}
