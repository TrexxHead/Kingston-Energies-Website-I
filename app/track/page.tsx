'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Truck } from 'lucide-react'
import CommerceShell from '@/components/shop/CommerceShell'
import { Button, FeatureIcon } from '@/components/shop/ui'
import { useToast } from '@/components/cart/ToastContext'

const STAGES = ['Confirmed', 'Packed', 'Out for delivery', 'Delivered']
const STAGE_TIMES = ['Just now', '12 min', 'Today, 2pm', 'Today, 4pm']
const HEADLINES = ['Order confirmed', 'Packed and ready', 'On the way', 'Delivered']
const ETAS = ['We\'re preparing your order.', 'Your order is boxed and labelled.', 'Your Kingston courier is en route.', 'Enjoy — thanks for choosing Kingston Energies.']
const ADVANCE_MS = 4000

export default function TrackPage() {
  const router = useRouter()
  const { pushToast } = useToast()
  const [stage, setStage] = useState(0)
  const [orderNo, setOrderNo] = useState('KE-1042')
  const [rating, setRating] = useState(0)
  const [feedbackDone, setFeedbackDone] = useState(false)

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('ke-last-order')
      if (stored) setOrderNo(stored)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (stage >= STAGES.length - 1) return
    const id = setTimeout(() => setStage((s) => s + 1), ADVANCE_MS)
    return () => clearTimeout(id)
  }, [stage])

  const delivered = stage === STAGES.length - 1
  const live = !delivered

  const submitFeedback = () => {
    setFeedbackDone(true)
    pushToast('star', 'Thanks for the feedback', 'Your 50 points have been added')
  }

  return (
    <CommerceShell>
      <section style={{ maxWidth: 680, margin: '0 auto', padding: '56px 32px 96px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.3em', color: 'var(--ke-green-600)' }}>ORDER&nbsp;{orderNo}</div>
          {live && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--ke-green-50)', borderRadius: 999, padding: '6px 14px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.2em', color: 'var(--ke-green-700)' }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--ke-green-500)', animation: 'kePulse 1.6s var(--ease-standard) infinite' }} />
              LIVE&nbsp;—&nbsp;UPDATES&nbsp;AUTOMATICALLY
            </div>
          )}
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(38px,6vw,52px)', letterSpacing: '-.025em', lineHeight: 1, margin: '14px 0 0' }}>
          {HEADLINES[stage]}
        </h1>
        <p style={{ fontSize: 15, color: 'var(--color-text-muted)', margin: '12px 0 0' }}>{ETAS[stage]}</p>

        <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 22, padding: 30, marginTop: 28, boxShadow: 'var(--shadow-md)' }}>
          {STAGES.map((label, i) => {
            const done = i <= stage
            const current = i === stage
            const hasLine = i < STAGES.length - 1
            return (
              <div key={label} style={{ display: 'flex', gap: 18 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      flexShrink: 0,
                      background: done ? 'var(--ke-green-500)' : '#fff',
                      border: done ? 'none' : '2px solid var(--color-border-strong)',
                      color: '#fff',
                      fontSize: 11,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      animation: current && live ? 'kePulse 1.6s var(--ease-standard) infinite' : undefined,
                    }}
                  >
                    {done && '✓'}
                  </div>
                  {hasLine && <div style={{ width: 2, flex: 1, minHeight: 30, background: i < stage ? 'var(--ke-green-500)' : 'var(--color-border)' }} />}
                </div>
                <div style={{ paddingBottom: 22, flex: 1, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: done ? 700 : 600, fontSize: 15, color: done ? 'var(--color-text)' : 'var(--color-text-muted)' }}>{label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.1em', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{done ? STAGE_TIMES[i] : '—'}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#fff', border: '1px solid var(--color-border)', borderRadius: 18, padding: '18px 22px', marginTop: 16 }}>
          <FeatureIcon tone="teal">
            <Truck size={20} />
          </FeatureIcon>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Kingston courier</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>Hand-delivered by the team — call us anytime.</div>
          </div>
          <a href="tel:+18763389958"><Button size="sm" variant="outline">Call</Button></a>
        </div>

        {delivered && (
          <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 18, padding: 24, marginTop: 16, boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>How was it?</div>
            {feedbackDone ? (
              <div style={{ background: 'var(--color-success-soft)', color: 'var(--ke-green-700)', borderRadius: 12, padding: '12px 14px', marginTop: 12, fontSize: 13.5 }}>
                Thanks for the feedback — your 50 points have been added.
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 2 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" aria-label={`Rate ${n}`} onClick={() => setRating(n)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: n <= rating ? '#f7941e' : 'var(--ke-gray-300)' }}>
                      ★
                    </button>
                  ))}
                </div>
                <Button size="sm" onClick={submitFeedback}>Send — earn 50 pts</Button>
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <button type="button" onClick={() => router.push('/hub')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.2em', color: 'var(--ke-green-700)' }}>
            ←&nbsp;ALL&nbsp;MY&nbsp;ORDERS
          </button>
        </div>
      </section>
    </CommerceShell>
  )
}
