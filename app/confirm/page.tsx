'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, BadgeCheck, Sparkles } from 'lucide-react'
import CommerceShell from '@/components/shop/CommerceShell'
import { Button, FeatureIcon } from '@/components/shop/ui'

export default function ConfirmPage() {
  const router = useRouter()
  const [orderNo, setOrderNo] = useState('KE-1042')

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('ke-last-order')
      if (stored) setOrderNo(stored)
    } catch {
      // ignore
    }
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
      </section>
    </CommerceShell>
  )
}
