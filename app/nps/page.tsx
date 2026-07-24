'use client'

export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import CommerceShell from '@/components/shop/CommerceShell'
import NpsSurvey from '@/components/nps/NpsSurvey'

function NpsInner() {
  const params = useSearchParams()
  const orderNo = params.get('order') ?? undefined

  return (
    <CommerceShell>
      <section style={{ maxWidth: 620, margin: '0 auto', padding: '64px 32px 96px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.3em', color: 'var(--ke-green-600)' }}>
          YOUR FEEDBACK{orderNo ? ` — ${orderNo}` : ''}
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(30px,5vw,44px)', letterSpacing: '-.025em', lineHeight: 1.05, margin: '14px 0 8px' }}>
          How did we do?
        </h1>
        <p style={{ fontSize: 15, color: 'var(--color-text-muted)', margin: '0 0 28px' }}>
          Your order has been delivered. It takes ten seconds and helps us serve you better.
        </p>
        <NpsSurvey source="ORDER" orderNo={orderNo} question="How likely are you to recommend Kingston Energies to a friend or colleague?" />
      </section>
    </CommerceShell>
  )
}

export default function NpsPage() {
  return (
    <Suspense fallback={null}>
      <NpsInner />
    </Suspense>
  )
}
