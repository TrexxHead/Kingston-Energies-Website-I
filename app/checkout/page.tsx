'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowRight, Truck, CreditCard, MapPin, Info } from 'lucide-react'
import CommerceShell from '@/components/shop/CommerceShell'
import { Button, Field, Radio, inputStyle } from '@/components/shop/ui'
import { useCart } from '@/components/cart/CartContext'
import { fmt } from '@/lib/catalog'

const HEADLINES = ['Where to?', "How you'll pay.", 'Review & place order.']
const DELIVERY_LABELS = ['Standard — free, 2–3 days', 'Express — J$800, next day', 'Pickup at Kingston HQ — free, today']
const PARISHES = ['Kingston', 'St. Andrew', 'St. Catherine', 'Clarendon', 'Manchester', 'St. James']

interface PayMethod {
  id: string
  label: string
  sub: string
  details: string[]
  needsReference: boolean
  gateway: boolean
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutInner />
    </Suspense>
  )
}

function CheckoutInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const { items, total, promoCode, clear, hydrated } = useCart()
  const [step, setStep] = useState(0)
  const [delivery, setDelivery] = useState(0)
  const [methods, setMethods] = useState<PayMethod[]>([])
  const [payment, setPayment] = useState(0)
  const [placing, setPlacing] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [street, setStreet] = useState('')
  const [parish, setParish] = useState('Kingston')
  const paymentFailed = searchParams.get('payment') === 'failed'
  const empty = items.length === 0

  useEffect(() => {
    if (session?.user?.name && !name) setName(session.user.name)
    if (session?.user?.email && !email) setEmail(session.user.email)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  useEffect(() => {
    // If we came back from a failed card payment, land on the payment step.
    if (paymentFailed) setStep(1)
  }, [paymentFailed])

  useEffect(() => {
    fetch('/api/payment-methods')
      .then((r) => (r.ok ? r.json() : { methods: [] }))
      .then((d) => setMethods(d.methods ?? []))
      .catch(() => setMethods([]))
  }, [])

  useEffect(() => {
    if (hydrated && empty && !placing) router.replace('/cart')
  }, [hydrated, empty, placing, router])

  if (!hydrated || empty) return null

  const selected = methods[payment]

  const placeOrder = async () => {
    if (!selected) return
    setPlacing(true)
    const customerName = name.trim() || session?.user?.name || 'Guest checkout'
    const payloadItems = items.map((i) => ({ name: i.name, price: i.price, qty: i.qty }))
    const shippingAddress = [street.trim(), parish].filter(Boolean).join(', ') || undefined
    const contact = { email: email.trim() || undefined, phone: phone.trim() || undefined, shippingAddress }

    // Card → hand off to the WiPay hosted page.
    if (selected.gateway) {
      try {
        const res = await fetch('/api/payments/wipay/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerName, ...contact, items: payloadItems, promoCode: promoCode ?? undefined }),
        })
        if (res.ok) {
          const { action, fields } = await res.json()
          postToGateway(action, fields)
          return // browser navigates away to WiPay
        }
      } catch {
        // fall through to unset placing below
      }
      setPlacing(false)
      return
    }

    // Direct methods → record the order, then show pay instructions on /confirm.
    let orderNo = 'KE-' + (1024 + Math.floor(Math.random() * 900))
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName, paymentMethod: selected.id, ...contact, items: payloadItems, promoCode: promoCode ?? undefined }),
      })
      if (res.ok) orderNo = (await res.json()).orderNo
    } catch {
      // keep the client-generated number if the API is unreachable
    }
    try {
      sessionStorage.setItem('ke-last-order', orderNo)
      sessionStorage.setItem('ke-last-method', selected.id)
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
            <div key={i} style={{ flex: 1, height: 6, borderRadius: 999, background: i <= step ? 'var(--color-primary)' : 'var(--color-border)', transition: 'background var(--dur-base) var(--ease-standard)' }} />
          ))}
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 22, padding: 30, marginTop: 22, boxShadow: 'var(--shadow-md)' }}>
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Full name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" style={inputStyle} /></Field>
              <div className="kp-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="876…" style={inputStyle} /></Field>
                <Field label="Email"><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" style={inputStyle} /></Field>
              </div>
              <Field label="Street address"><input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="12 Hope Road" style={inputStyle} /></Field>
              <Field label="Parish">
                <select value={parish} onChange={(e) => setParish(e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
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
              {paymentFailed && (
                <div style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)', borderRadius: 12, padding: '12px 14px', fontSize: 13 }}>
                  That card payment didn’t go through. You can try again or choose another method.
                </div>
              )}
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--color-text)' }}>Payment method</span>
              {methods.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading payment options…</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {methods.map((m, i) => {
                    const sel = payment === i
                    return (
                      <button type="button" key={m.id} onClick={() => setPayment(i)} aria-pressed={sel}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%', padding: '14px 16px', borderRadius: 12, cursor: 'pointer', background: sel ? 'var(--color-primary-soft)' : '#fff', border: `1.5px solid ${sel ? 'var(--color-primary)' : 'var(--color-border)'}` }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, border: `2px solid ${sel ? 'var(--color-primary)' : 'var(--color-border-strong)'}`, background: sel ? 'radial-gradient(circle, var(--color-primary) 0 4px, transparent 5px)' : 'transparent' }} />
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
              )}

              {selected && (selected.details.length > 0 || selected.needsReference || selected.gateway) && (
                <div style={{ background: 'var(--color-info-soft)', color: 'var(--color-info)', borderRadius: 12, padding: '12px 14px', fontSize: 13, display: 'flex', gap: 10 }}>
                  <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    {selected.gateway ? (
                      <span>You’ll be taken to our secure card page to complete payment when you place the order.</span>
                    ) : selected.needsReference ? (
                      <>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>After you place the order, pay using these details:</div>
                        {selected.details.map((d, i) => <div key={i}>{d}</div>)}
                        <div style={{ marginTop: 6, fontStyle: 'italic' }}>Quote your order number (shown next) as the payment reference.</div>
                      </>
                    ) : (
                      selected.details.map((d, i) => <div key={i}>{d}</div>)
                    )}
                  </div>
                </div>
              )}
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
                <SummaryLine icon={<CreditCard size={15} color="var(--ke-green-600)" />} text={selected?.label ?? 'Payment'} />
                <SummaryLine icon={<MapPin size={15} color="var(--ke-green-600)" />} text="12 Hope Road, Kingston" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Total</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22 }}>{fmt(total)}</span>
              </div>
              <Button size="lg" block onClick={placeOrder} disabled={placing || !selected}>
                {placing ? 'Placing order…' : selected?.gateway ? 'Pay by card' : 'Place order'}
              </Button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 26 }}>
            <Button variant="ghost" onClick={() => (step === 0 ? router.push('/cart') : setStep((s) => s - 1))}>
              {step === 0 ? 'Back to cart' : 'Back'}
            </Button>
            {step < 2 && (
              <Button onClick={() => setStep((s) => s + 1)} iconRight={<ArrowRight size={17} />} disabled={step === 1 && !selected}>Continue</Button>
            )}
          </div>
        </div>
      </section>
    </CommerceShell>
  )
}

/** Auto-submit a hidden form so the browser navigates to the payment gateway. */
function postToGateway(action: string, fields: Record<string, string>) {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = action
  Object.entries(fields).forEach(([k, v]) => {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = k
    input.value = v
    form.appendChild(input)
  })
  document.body.appendChild(form)
  form.submit()
}

function SummaryLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{icon}{text}</div>
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
  if (id === 'paypal') {
    return <span style={{ ...base, background: '#003087', color: '#fff' }}>Pay<span style={{ color: '#009cde' }}>Pal</span></span>
  }
  if (id === 'lynk') {
    return <span style={{ ...base, background: '#6c2bd9', color: '#fff' }}>Lynk</span>
  }
  if (id === 'bank') {
    return <span style={{ ...base, background: 'var(--ke-blue-50, #eaf2fb)', color: 'var(--ke-blue-600, #2b6cb0)' }}>BANK</span>
  }
  return <span style={{ ...base, background: 'var(--ke-green-50)', color: 'var(--ke-green-700)' }}>CASH</span>
}
