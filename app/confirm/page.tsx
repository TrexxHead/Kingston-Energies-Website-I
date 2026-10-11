'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, BadgeCheck, Sparkles, Wallet } from 'lucide-react'
import CommerceShell from '@/components/shop/CommerceShell'
import { Button, FeatureIcon } from '@/components/shop/ui'
import NpsSurvey from '@/components/nps/NpsSurvey'
import { linkifyText } from '@/lib/linkify'
import { analytics } from '@/lib/analytics'
import { loyaltyPoints } from '@/lib/loyalty'

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
  // No hardcoded fallback order number — until the real one resolves (or
  // genuinely can't be found), the page shows a loading state rather than
  // ever displaying an order number that isn't real.
  const [orderNo, setOrderNo] = useState<string | null>(null)
  const [orderToken, setOrderToken] = useState('')
  const [payInfo, setPayInfo] = useState<PayMethod | null>(null)
  // The real delivery estimate and total for this order, fetched from the
  // same tracking lookup already used for GA4 purchase reporting below —
  // never a hardcoded "2-3 days" or a static points figure.
  const [orderDetail, setOrderDetail] = useState<{ estimatedDelivery: string | null; total: number } | null>(null)
  const [detailFailed, setDetailFailed] = useState(false)
  const paidByCard = searchParams.get('paid') === '1'

  useEffect(() => {
    let method = ''
    let token = ''
    try {
      const fromQuery = searchParams.get('order')
      const stored = sessionStorage.getItem('ke-last-order')
      const tokenFromQuery = searchParams.get('t')
      if (fromQuery) {
        setOrderNo(fromQuery)
        // Card payments land here via a WiPay redirect, which never went
        // through the checkout page's sessionStorage write — persist it now
        // so "Track order" (and a future visit to /track) can find it.
        sessionStorage.setItem('ke-last-order', fromQuery)
        if (tokenFromQuery) sessionStorage.setItem('ke-last-order-token', tokenFromQuery)
      } else if (stored) setOrderNo(stored)
      token = tokenFromQuery || sessionStorage.getItem('ke-last-order-token') || ''
      setOrderToken(token)
      method = sessionStorage.getItem('ke-last-method') ?? ''
      // This checkout attempt is resolved one way or another — clear any
      // pending-gateway-retry marker so a later, unrelated purchase never
      // tries to reuse this order.
      sessionStorage.removeItem('ke-wipay-pending')
      sessionStorage.removeItem('ke-fygaro-pending')
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

    const orderForPurchase = searchParams.get('order') || (() => {
      try { return sessionStorage.getItem('ke-last-order') } catch { return null }
    })()
    if (orderForPurchase) {
      // Always fetch the real order so the page can show an actual delivery
      // estimate and points figure instead of a hardcoded placeholder.
      fetch(`/api/orders/track?no=${encodeURIComponent(orderForPurchase)}${token ? `&t=${encodeURIComponent(token)}` : ''}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { total?: number; estimatedDelivery?: string | null; items?: { qty: number }[] } | null) => {
          if (!d || typeof d.total !== 'number') {
            setDetailFailed(true)
            return
          }
          setOrderDetail({ estimatedDelivery: d.estimatedDelivery ?? null, total: d.total })

          // Report the purchase once per order — a refresh of this page
          // must not double-count revenue in GA4.
          const reportedKey = `ke-ga-purchase-${orderForPurchase}`
          let alreadyReported = false
          try { alreadyReported = sessionStorage.getItem(reportedKey) === '1' } catch { /* ignore */ }
          if (!alreadyReported) {
            const itemCount = (d.items ?? []).reduce((n, i) => n + i.qty, 0)
            analytics.trackPurchase(orderForPurchase, d.total, itemCount)
            try { sessionStorage.setItem(reportedKey, '1') } catch { /* ignore */ }
          }
        })
        .catch(() => setDetailFailed(true))
    } else {
      setDetailFailed(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Neither a query/session order number nor a loaded one yet — never show
  // the confirmation chrome (or any hardcoded order data) until we actually
  // know what order this is.
  if (!orderNo && !detailFailed) {
    return (
      <CommerceShell>
        <section style={{ maxWidth: 600, margin: '0 auto', padding: '120px 32px', textAlign: 'center' }}>
          <p style={{ fontSize: 15, color: 'var(--color-text-muted)' }}>Loading your order…</p>
        </section>
      </CommerceShell>
    )
  }

  if (!orderNo) {
    return (
      <CommerceShell>
        <section style={{ maxWidth: 480, margin: '0 auto', padding: '96px 32px', textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, margin: 0 }}>We couldn&apos;t find that order.</h1>
          <p style={{ fontSize: 15, color: 'var(--color-text-muted)', margin: '12px 0 0', lineHeight: 1.6 }}>
            If you just completed a purchase, check your email for the confirmation, or track it with your order number.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
            <Button onClick={() => router.push('/track')}>Track an order</Button>
            <Button variant="outline" onClick={() => router.push('/shop')}>Keep shopping</Button>
          </div>
        </section>
      </CommerceShell>
    )
  }

  const deliveryLine = orderDetail?.estimatedDelivery
    ? `Arriving by ${new Date(orderDetail.estimatedDelivery).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}. We'll text you at every step.`
    : "We'll text you a delivery window as soon as it's set."
  const pointsEarned = orderDetail ? loyaltyPoints({ totalSpent: orderDetail.total }) : null

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
          {deliveryLine}
        </p>
        {pointsEarned !== null && pointsEarned > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--ke-green-50)', borderRadius: 999, padding: '8px 16px', marginTop: 18, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.18em', color: 'var(--ke-green-700)' }}>
            <Sparkles size={13} />
            +{pointsEarned}&nbsp;POINTS&nbsp;EARNED
          </div>
        )}
        {paidByCard && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--ke-green-50)', color: 'var(--ke-green-700)', borderRadius: 999, padding: '8px 16px', marginTop: 14, fontSize: 13, fontWeight: 600 }}>
            <BadgeCheck size={15} /> Card payment received, thank you!
          </div>
        )}

        {payInfo && (
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--ke-sun-400)', borderRadius: 18, padding: '20px 22px', marginTop: 30, textAlign: 'left', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
              <Wallet size={17} color="var(--ke-sun-500)" />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Complete your payment: {payInfo.label}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13.5, color: 'var(--color-text)' }}>
              {payInfo.details.map((d, i) => <div key={i}>{linkifyText(d)}</div>)}
            </div>
            {payInfo.needsReference && (
              <div style={{ marginTop: 12, background: 'var(--ke-sun-50)', borderRadius: 10, padding: '10px 12px', fontSize: 13 }}>
                Use <strong>{orderNo}</strong> as your payment reference so we can match it to your order.
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 30, flexWrap: 'wrap' }}>
          <Button onClick={() => router.push(`/track?no=${encodeURIComponent(orderNo)}${orderToken ? `&t=${encodeURIComponent(orderToken)}` : ''}`)} iconRight={<ArrowRight size={17} />}>Track order</Button>
          <Button variant="outline" onClick={() => router.push('/shop')}>Keep shopping</Button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 18, padding: '20px 24px', marginTop: 44, textAlign: 'left', boxShadow: 'var(--shadow-sm)' }}>
          <FeatureIcon tone="blue">
            <BadgeCheck size={20} />
          </FeatureIcon>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Register your device when it arrives</div>
            <div style={{ fontSize: 13.5, color: 'var(--color-text-muted)', marginTop: 3 }}>Keeps your proof of purchase for warranty claims and earns 25 points.</div>
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
