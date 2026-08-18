'use client'

import { useCallback, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface HoldToConfirmProps {
  label: string
  holdingLabel?: string
  onConfirm: () => void
  tone?: 'default' | 'danger'
  disabled?: boolean
  /** Hold duration in ms before onConfirm fires. */
  durationMs?: number
  size?: 'sm' | 'md'
}

const TONES = {
  default: { border: 'var(--ke-green-600,#15803d)', text: 'var(--ke-green-700,#15803d)', fill: 'var(--ke-green-500)' },
  danger: { border: 'var(--color-danger)', text: 'var(--color-danger)', fill: 'var(--color-danger)' },
} as const

/**
 * A destructive or hard-to-reverse action doesn't get a click — it gets a
 * hold. The fill sweeping left-to-right *is* the confirmation UI; there's no
 * separate dialog to accidentally dismiss or approve on autopilot. Releasing
 * before the fill completes cancels cleanly, no matter how far it got.
 */
export default function HoldToConfirm({ label, holdingLabel, onConfirm, tone = 'default', disabled, durationMs = 850, size = 'sm' }: HoldToConfirmProps) {
  const prefersReducedMotion = useReducedMotion()
  const [holding, setHolding] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const start = useCallback(() => {
    if (disabled || timerRef.current) return
    setHolding(true)
    // Reduced motion still requires the hold — it just skips the visible
    // sweep, so the gesture stays a deliberate press-and-wait either way.
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      setHolding(false)
      onConfirm()
    }, durationMs)
  }, [disabled, durationMs, onConfirm])

  const cancel = useCallback(() => {
    setHolding(false)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const isSm = size === 'sm'
  const colors = TONES[tone]

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
          e.preventDefault()
          start()
        }
      }}
      onKeyUp={(e) => {
        if (e.key === 'Enter' || e.key === ' ') cancel()
      }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        height: isSm ? 30 : 38,
        padding: isSm ? '0 14px' : '0 18px',
        borderRadius: 999,
        border: `1.5px solid ${colors.border}`,
        background: '#fff',
        fontSize: isSm ? 11.5 : 13,
        fontWeight: 700,
        cursor: disabled ? 'default' : 'pointer',
        userSelect: 'none',
        touchAction: 'none',
        opacity: disabled ? 0.5 : 1,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <motion.span
        aria-hidden
        initial={false}
        animate={{ scaleX: holding && !prefersReducedMotion ? 1 : 0 }}
        transition={holding ? { duration: durationMs / 1000, ease: 'linear' } : { duration: 0.12 }}
        style={{ position: 'absolute', inset: 0, transformOrigin: 'left', background: colors.fill }}
      />
      <span style={{ position: 'relative', color: holding ? '#fff' : colors.text, transition: 'color .12s ease' }}>
        {holding ? (holdingLabel ?? 'Keep holding…') : label}
      </span>
    </button>
  )
}
