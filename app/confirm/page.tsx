'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, BadgeCheck, Sparkles, Wallet } from 'lucide-react'
import CommerceShell from '@/components/shop/CommerceShell'
import { Button, FeatureIcon } from '@/components/shop/ui'
import NpsSurvey from '@/components/nps/NpsSurvey'

interface PayMethod {
  id: string
  label: string
  details: string[]
  needsReference: boolean
  gateway: boolean
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmInner />
    </Suspense>
  )
}

function ConfirmInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [orderNo, setOrderNo] = useState('KE-1042')
  const [payInfo, setPayInfo] = useState<PayMethod | null>(null)
  const paidByCard = searchParams.get('paid') === '1'

  useEffect(() => {
    let method = ''
    try {
      const fromQuery = searchParams.get('order')
      const stored = sessionStorage.getItem('ke-last-order')
      if (fromQuery) setOrderNo(fromQuery)
      else if (stored) setOrderNo(stored)
      method = sessionStorage.getItem('ke-last-method') ?? ''
    } catch {
      // ignore
    }
    // For direct (non-card) methods, surface the "how to pay" details here.
    if (method && !paidByCard) {
      fetch('/api/payment-methods')
        .then((r) => (r.ok ? r.json() : { methods: [] }))
        .then((d: { methods: PayMethod[] }) => {
          const m = d.methods?.find((x) => x.id === method)
          if (m && (m.needsReference || m.details.length > 0) && !m.gateway) setPayInfo(m)
        })
        .catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <CommerceShell>
      <section style={{ maxWidth: 600, margin: '0 auto', padding: '72px 32px 96px', textAlign: 'center' }}>
        <svg width="92" height="92" viewBox="0 0 92 92" style={{ display: 'block', margin: '0 auto' }}>
          <circle
            cx="46"
            cy="46"
            r="41"
            fill="none"
            stroke="var(--ke-green-500)"
            strokeWidth="3"
            strokeDasharray="258"
            strokeDashoffset="258"
            transform="rotate(-90 46 46)"
            style={{ animation: 'keDash .7s var(--ease-out) .1s forwards' }}
          />
          <path
            d="M30 47 l11 11 l22 -23"
            fill="none"
            stroke="var(--ke-green-500)"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="48"
            strokeDashoffset="48"
            style={{ animation: 'keDash .45s var(--ease-out) .75s forwards' }}
          />
        </svg>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(32px,5vw,44px)', letterSpacing: '-.025em', lineHeight: 1.05, margin: '28px 0 0' }}>
          Order {orderNo}
          <br />
          confirmed.
        </h1>
        <p style={{ fontSize: 16, color: 'var(--color-text-muted)', margin: '16px auto 0', maxWidth: 380, lineHeight: 1.6 }}>
          Arriving in 2–3 days. We&apos;ll text you at every step.
        </p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--ke-green-50)', borderRadius: 999, padding: '8px 16px', marginTop: 18, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.18em', color: 'var(--ke-green-700)' }}>
          <Sparkles size={13} />
          +25&nbsp;POINTS&nbsp;EARNED
        </div>
        {paidByCard && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--ke-green-50)', color: 'var(--ke-green-700)', borderRadius: 999, padding: '8px 16px', marginTop: 14, fontSize: 13, fontWeight: 600 }}>
            <BadgeCheck size={15} /> Card payment received — thank you!
          </div>
        )}

        {payInfo && (
          <div style={{ background: '#fff', border: '1px solid var(--ke-sun-400)', borderRadius: 18, padding: '20px 22px', marginTop: 30, textAlign: 'left', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
              <Wallet size={17} color="var(--ke-sun-500)" />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Complete your payment — {payInfo.label}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13.5, color: 'var(--color-text)' }}>
              {payInfo.details.map((d, i) => <div key={i}>{d}</div>)}
            </div>
            {payInfo.needsReference && (
              <div style={{ marginTop: 12, background: 'var(--ke-sun-50)', borderRadius: 10, padding: '10px 12px', fontSize: 13 }}>
                Use <strong>{orderNo}</strong> as your payment reference so we can match it to your order.
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 30, flexWrap: 'wrap' }}>
          <Button onClick={() => router.push('/track')} iconRight={<ArrowRight size={17} />}>Track order</Button>
          <Button variant="outline" onClick={() => router.push('/shop')}>Keep shopping</Button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#fff', border: '1px solid var(--color-border)', borderRadius: 18, padding: '20px 24px', marginTop: 44, textAlign: 'left', boxShadow: 'var(--shadow-sm)' }}>
          <FeatureIcon tone="blue">
            <BadgeCheck size={20} />
          </FeatureIcon>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Register your device when it arrives</div>
            <div style={{ fontSize: 13.5, color: 'var(--color-text-muted)', marginTop: 3 }}>Activates your 12-month warranty and earns 25 points.</div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => router.push('/hub')}>My hub</Button>
        </div>

        <div style={{ marginTop: 20 }}>
          <NpsSurvey source="ORDER" orderNo={orderNo} question="How likely are you to recommend Kingston Energies after this order?" />
        </div>
      </section>
    </CommerceShell>
  )
}
