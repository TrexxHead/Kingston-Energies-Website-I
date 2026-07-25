'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Truck } from 'lucide-react'
import CommerceShell from '@/components/shop/CommerceShell'
import { Button, FeatureIcon } from '@/components/shop/ui'
import { useToast } from '@/components/cart/ToastContext'

interface StageDto {
  key: string
  label: string
  headline: string
  blurb: string
  done: boolean
  current: boolean
  at: string | null
}
interface TrackDto {
  orderNo: string
  cancelled: boolean
  stage: number
  lastStage: number
  estimatedDelivery: string | null
  placedAt: string
  items: { name: string; qty: number }[]
  stages: StageDto[]
  updates: { label: string | null; note: string | null; at: string }[]
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  const t = d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })
  return sameDay ? `Today, ${t}` : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + `, ${t}`
}

function TrackInner() {
  const router = useRouter()
  const params = useSearchParams()
  const { pushToast } = useToast()
  const [data, setData] = useState<TrackDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [rating, setRating] = useState(0)
  const [feedbackDone, setFeedbackDone] = useState(false)

  const load = useCallback(async () => {
    let no = params.get('no')?.trim() ?? ''
    if (!no) {
      try {
        no = sessionStorage.getItem('ke-last-order') ?? ''
      } catch {
        // ignore
      }
    }
    const res = await fetch(`/api/orders/track${no ? `?no=${encodeURIComponent(no)}` : ''}`)
    if (res.ok) {
      setData(await res.json())
      setNotFound(false)
    } else {
      setNotFound(true)
    }
    setLoading(false)
  }, [params])

  useEffect(() => {
    load()
  }, [load])

  // Live refresh while the order is still in transit.
  useEffect(() => {
    if (!data || data.cancelled || data.stage >= data.lastStage) return
    const id = setInterval(load, 20000)
    return () => clearInterval(id)
  }, [data, load])

  const submitFeedback = () => {
    setFeedbackDone(true)
    pushToast('star', 'Thanks for the feedback', 'Your 50 points have been added')
  }

  if (loading) {
    return (
      <CommerceShell>
        <section style={{ maxWidth: 680, margin: '0 auto', padding: '80px 32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Loading your order…
        </section>
      </CommerceShell>
    )
  }

  if (notFound || !data) {
    return (
      <CommerceShell>
        <section style={{ maxWidth: 680, margin: '0 auto', padding: '80px 32px', textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, margin: '0 0 10px' }}>Order not found</h1>
          <p style={{ fontSize: 14.5, color: 'var(--color-text-muted)', margin: '0 0 20px' }}>
            We couldn&apos;t find that order number. Check your confirmation email or view all your orders.
          </p>
          <Button onClick={() => router.push('/hub/orders')}>My orders</Button>
        </section>
      </CommerceShell>
    )
  }

  const current = data.stages[data.stage]
  const delivered = data.stage >= data.lastStage
  const live = !delivered && !data.cancelled

  return (
    <CommerceShell>
      <section style={{ maxWidth: 680, margin: '0 auto', padding: '56px 32px 96px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.3em', color: 'var(--ke-green-600)' }}>ORDER&nbsp;{data.orderNo}</div>
          {live && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--ke-green-50)', borderRadius: 999, padding: '6px 14px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.2em', color: 'var(--ke-green-700)' }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--ke-green-500)', animation: 'kePulse 1.6s var(--ease-standard) infinite' }} />
              LIVE&nbsp;—&nbsp;UPDATES&nbsp;AUTOMATICALLY
            </div>
          )}
        </div>

        {data.cancelled ? (
          <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(34px,6vw,48px)', letterSpacing: '-.025em', lineHeight: 1, margin: '14px 0 0' }}>Order cancelled</h1>
            <p style={{ fontSize: 15, color: 'var(--color-text-muted)', margin: '12px 0 0' }}>This order was cancelled. Any payment made will be refunded.</p>
          </>
        ) : (
          <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(38px,6vw,52px)', letterSpacing: '-.025em', lineHeight: 1, margin: '14px 0 0' }}>
              {current.headline}
            </h1>
            <p style={{ fontSize: 15, color: 'var(--color-text-muted)', margin: '12px 0 0' }}>{current.blurb}</p>
            {data.estimatedDelivery && !delivered && (
              <p style={{ fontSize: 13, color: 'var(--ke-green-700)', margin: '8px 0 0', fontWeight: 600 }}>
                Estimated delivery: {fmtTime(data.estimatedDelivery)}
              </p>
            )}
          </>
        )}

        {!data.cancelled && (
          <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 22, padding: 30, marginTop: 28, boxShadow: 'var(--shadow-md)' }}>
            {data.stages.map((s, i) => {
              const hasLine = i < data.stages.length - 1
              return (
                <div key={s.key} style={{ display: 'flex', gap: 18 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 999,
                        flexShrink: 0,
                        background: s.done ? 'var(--ke-green-500)' : '#fff',
                        border: s.done ? 'none' : '2px solid var(--color-border-strong)',
                        color: '#fff',
                        fontSize: 11,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: s.current && live ? 'kePulse 1.6s var(--ease-standard) infinite' : undefined,
                      }}
                    >
                      {s.done && '✓'}
                    </div>
                    {hasLine && <div style={{ width: 2, flex: 1, minHeight: 26, background: i < data.stage ? 'var(--ke-green-500)' : 'var(--color-border)' }} />}
                  </div>
                  <div style={{ paddingBottom: 18, flex: 1, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: s.done ? 700 : 600, fontSize: 15, color: s.done ? 'var(--color-text)' : 'var(--color-text-muted)' }}>{s.label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.05em', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{s.done ? fmtTime(s.at) : '—'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {data.updates.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 18, padding: 22, marginTop: 16 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Updates from the team</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.updates.map((u, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, fontSize: 13.5 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', paddingTop: 2 }}>{fmtTime(u.at)}</span>
                  <span style={{ color: 'var(--color-text)' }}>{u.note}</span>
                </div>
              ))}
            </div>
          </div>
        )}

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

        {delivered && !data.cancelled && (
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
          <button type="button" onClick={() => router.push('/hub/orders')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.2em', color: 'var(--ke-green-700)' }}>
            ←&nbsp;ALL&nbsp;MY&nbsp;ORDERS
          </button>
        </div>
      </section>
    </CommerceShell>
  )
}

export default function TrackPage() {
  return (
    <Suspense fallback={null}>
      <TrackInner />
    </Suspense>
  )
}
