'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowRight, Truck, CreditCard, MapPin } from 'lucide-react'
import CommerceShell from '@/components/shop/CommerceShell'
import { Button, Field, Radio, inputStyle } from '@/components/shop/ui'
import { useCart } from '@/components/cart/CartContext'
import { fmt } from '@/lib/catalog'

const HEADLINES = ['Where to?', "How you'll pay.", 'Review & place order.']
const DELIVERY_LABELS = ['Standard — free, 2–3 days', 'Express — J$800, next day', 'Pickup at Kingston HQ — free, today']
const PAYMENT_METHODS: { id: string; label: string; sub: string }[] = [
  { id: 'card', label: 'Visa / Mastercard', sub: 'Debit or credit card' },
  { id: 'googlepay', label: 'Google Pay', sub: 'Fast checkout with Google' },
  { id: 'paypal', label: 'PayPal', sub: 'Pay with your PayPal account' },
  { id: 'cod', label: 'Cash on delivery', sub: 'Pay when it arrives, Kingston-wide' },
]
const PARISHES = ['Kingston', 'St. Andrew', 'St. Catherine', 'Clarendon', 'Manchester', 'St. James']

export default function CheckoutPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { items, total, clear, hydrated } = useCart()
  const [step, setStep] = useState(0)
  const [delivery, setDelivery] = useState(0)
  const [payment, setPayment] = useState(0)
  const [placing, setPlacing] = useState(false)
  const empty = items.length === 0

  useEffect(() => {
    if (hydrated && empty && !placing) router.replace('/cart')
  }, [hydrated, empty, placing, router])

  if (!hydrated || empty) return null

  const placeOrder = async () => {
    setPlacing(true)
    let orderNo = 'KE-' + (1024 + Math.floor(Math.random() * 900))
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: session?.user?.name ?? 'Guest checkout',
          paymentMethod: PAYMENT_METHODS[payment].id,
          items: items.map((i) => ({ name: i.name, price: i.price, qty: i.qty })),
        }),
      })
      if (res.ok) orderNo = (await res.json()).orderNo
    } catch {
      // fall back to the client-generated number if the API is unreachable
    }
    try {
      sessionStorage.setItem('ke-last-order', orderNo)
    } catch {
      // ignore
    }
    clear()
    router.push('/confirm')
  }

  return (
    <CommerceShell>
      <section style={{ maxWidth: 720, margin: '0 auto', padding: '56px 32px 96px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.3em', color: 'var(--ke-green-600)' }}>SECURE&nbsp;CHECKOUT</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(32px,5vw,44px)', letterSpacing: '-.025em', lineHeight: 1, color: 'var(--color-text)', margin: '14px 0 0' }}>
          {HEADLINES[step]}
        </h1>

        <div style={{ display: 'flex', gap: 6, marginTop: 28 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 999,
                background: i <= step ? 'var(--color-primary)' : 'var(--color-border)',
                transition: 'background var(--dur-base) var(--ease-standard)',
              }}
            />
          ))}
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 22, padding: 30, marginTop: 22, boxShadow: 'var(--shadow-md)' }}>
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Full name"><input placeholder="Your full name" style={inputStyle} /></Field>
              <div className="kp-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Phone"><input placeholder="876…" style={inputStyle} /></Field>
                <Field label="Email"><input type="email" placeholder="you@example.com" style={inputStyle} /></Field>
              </div>
              <Field label="Street address"><input placeholder="12 Hope Road" style={inputStyle} /></Field>
              <Field label="Parish">
                <select defaultValue="Kingston" style={{ ...inputStyle, appearance: 'none' }}>
                  {PARISHES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </Field>
              <div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--color-text)' }}>Delivery</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                  {DELIVERY_LABELS.map((label, i) => (
                    <Radio key={i} name="delm" label={label} checked={delivery === i} onChange={() => setDelivery(i)} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--color-text)' }}>Payment method</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                  {PAYMENT_METHODS.map((m, i) => {
                    const sel = payment === i
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setPayment(i)}
                        aria-pressed={sel}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          width: '100%',
                          padding: '14px 16px',
                          borderRadius: 12,
                          cursor: 'pointer',
                          background: sel ? 'var(--color-primary-soft)' : '#fff',
                          border: `1.5px solid ${sel ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              flexShrink: 0,
                              border: `2px solid ${sel ? 'var(--color-primary)' : 'var(--color-border-strong)'}`,
                              background: sel ? 'radial-gradient(circle, var(--color-primary) 0 4px, transparent 5px)' : 'transparent',
                            }}
                          />
                          <span style={{ textAlign: 'left' }}>
                            <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--color-text)' }}>{m.label}</span>
                            <span style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)' }}>{m.sub}</span>
                          </span>
                        </span>
                        <PayBadge id={m.id} />
                      </button>
                    )
                  })}
                </div>
              </div>
              {PAYMENT_METHODS[payment].id === 'card' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderTop: '1px solid var(--color-border)', paddingTop: 18 }}>
                  <Field label="Card number"><input placeholder="4242 4242 4242 4242" style={inputStyle} /></Field>
                  <div className="kp-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <Field label="Expiry"><input placeholder="MM/YY" style={inputStyle} /></Field>
                    <Field label="CVC"><input placeholder="123" style={inputStyle} /></Field>
                  </div>
                </div>
              )}
              <div style={{ background: 'var(--color-info-soft)', color: 'var(--color-info)', borderRadius: 12, padding: '12px 14px', fontSize: 13 }}>
                {PAYMENT_METHODS[payment].id === 'cod'
                  ? 'Cash on delivery is available now across Kingston.'
                  : 'Your order and chosen payment method are saved now — live capture activates once the payment gateway is connected.'}
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {items.map((ci) => (
                <div key={ci.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14.5 }}>
                  <span style={{ color: 'var(--color-text)' }}>{ci.name} × {ci.qty}</span>
                  <span style={{ fontWeight: 600 }}>{fmt(ci.price * ci.qty)}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, color: 'var(--color-text-muted)' }}>
                <SummaryLine icon={<Truck size={15} color="var(--ke-green-600)" />} text={DELIVERY_LABELS[delivery]} />
                <SummaryLine icon={<CreditCard size={15} color="var(--ke-green-600)" />} text={PAYMENT_METHODS[payment].label} />
                <SummaryLine icon={<MapPin size={15} color="var(--ke-green-600)" />} text="12 Hope Road, Kingston" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Total</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22 }}>{fmt(total)}</span>
              </div>
              <Button size="lg" block onClick={placeOrder} disabled={placing}>
                {placing ? 'Placing order…' : 'Place order'}
              </Button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 26 }}>
            <Button variant="ghost" onClick={() => (step === 0 ? router.push('/cart') : setStep((s) => s - 1))}>
              {step === 0 ? 'Back to cart' : 'Back'}
            </Button>
            {step < 2 && (
              <Button onClick={() => setStep((s) => s + 1)} iconRight={<ArrowRight size={17} />}>Continue</Button>
            )}
          </div>
        </div>
      </section>
    </CommerceShell>
  )
}

function SummaryLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {icon}
      {text}
    </div>
  )
}

function PayBadge({ id }: { id: string }) {
  const base: React.CSSProperties = { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 11, padding: '4px 8px', borderRadius: 6, lineHeight: 1 }
  if (id === 'card') {
    return (
      <span style={{ display: 'flex', gap: 6 }}>
        <span style={{ ...base, background: '#1a1f71', color: '#fff' }}>VISA</span>
        <span style={{ ...base, background: '#eb001b', color: '#fff' }}>MC</span>
      </span>
    )
  }
  if (id === 'googlepay') {
    return <span style={{ ...base, background: '#fff', color: '#5f6368', border: '1px solid var(--color-border)' }}>G&nbsp;Pay</span>
  }
  if (id === 'paypal') {
    return (
      <span style={{ ...base, background: '#003087', color: '#fff' }}>
        Pay<span style={{ color: '#009cde' }}>Pal</span>
      </span>
    )
  }
  return <span style={{ ...base, background: 'var(--ke-green-50)', color: 'var(--ke-green-700)' }}>CASH</span>
}
