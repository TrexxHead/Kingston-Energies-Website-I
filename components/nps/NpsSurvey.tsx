'use client'

import { useState } from 'react'
import type { NpsSource } from '@/lib/crm'

interface NpsSurveyProps {
  source: NpsSource
  /** Optional order reference to attach to an order survey. */
  orderNo?: string
  /** The prompt shown above the 0–10 scale. */
  question?: string
}

/**
 * IDIC "Interact" — a compact Net Promoter Score survey. Renders a 0–10 scale;
 * selecting a score reveals an optional comment box, then submits to /api/nps.
 * Fails silently (the survey is never allowed to block the customer's flow).
 */
export default function NpsSurvey({ source, orderNo, question }: NpsSurveyProps) {
  const [score, setScore] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const prompt = question ?? 'How likely are you to recommend Kingston Energies to a friend?'

  const submit = async (finalScore: number, finalComment: string) => {
    setSubmitting(true)
    try {
      await fetch('/api/nps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: finalScore,
          comment: finalComment.trim() || undefined,
          source,
          orderNo,
        }),
      })
    } catch {
      // ignore — a failed survey must not disrupt anything
    }
    setSubmitting(false)
    setDone(true)
  }

  if (done) {
    return (
      <div style={wrap}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--color-text)' }}>
          Thanks for the feedback! 🙌
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginTop: 4 }}>
          It helps us serve you better.
        </div>
      </div>
    )
  }

  return (
    <div style={wrap}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--color-text)' }}>
        {prompt}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12, justifyContent: 'center' }}>
        {Array.from({ length: 11 }, (_, n) => {
          const selected = score === n
          return (
            <button
              key={n}
              type="button"
              aria-label={`Score ${n}`}
              aria-pressed={selected}
              onClick={() => setScore(n)}
              style={{
                width: 30,
                height: 34,
                borderRadius: 8,
                cursor: 'pointer',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 13,
                border: `1.5px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: selected ? 'var(--color-primary)' : '#fff',
                color: selected ? '#fff' : 'var(--color-text)',
                transition: 'all var(--dur-fast) var(--ease-standard)',
              }}
            >
              {n}
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--color-text-subtle)', marginTop: 6, padding: '0 2px' }}>
        <span>Not likely</span>
        <span>Very likely</span>
      </div>

      {score !== null && (
        <div style={{ marginTop: 12 }}>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Anything you'd like to add? (optional)"
            rows={2}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1.5px solid var(--color-border)',
              borderRadius: 10,
              fontSize: 13,
              fontFamily: 'var(--font-body)',
              outline: 'none',
              resize: 'vertical',
            }}
          />
          <button
            type="button"
            disabled={submitting}
            onClick={() => submit(score, comment)}
            style={{
              marginTop: 8,
              height: 38,
              padding: '0 20px',
              border: 'none',
              borderRadius: 999,
              background: 'var(--color-primary)',
              color: '#fff',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {submitting ? 'Sending…' : 'Submit feedback'}
          </button>
        </div>
      )}
    </div>
  )
}

const wrap: React.CSSProperties = {
  background: '#fff',
  border: '1px solid var(--color-border)',
  borderRadius: 16,
  padding: '18px 20px',
  textAlign: 'center',
  boxShadow: 'var(--shadow-sm)',
}
