'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Plus, Minus, ChevronDown, ChevronUp } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Button, Field, Checkbox, inputStyle } from '@/components/shop/ui'
import FaqSection, { type FaqSectionData } from '@/components/ui/habit-faq-scroller'
import { analytics } from '@/lib/analytics'
import JsonLd from '@/components/JsonLd'
import { buildBreadcrumbs } from '@/lib/structuredData'
import { CATALOG, CATEGORY_PILLS, fmt } from '@/lib/catalog'

const breadcrumbs = buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Contact' }])

const SHOPPING_FOR = ['Myself', 'My business', 'A bulk order', 'Solar (early access)']
const INTERESTS = ['Power banks', 'Chargers & cables', 'Accessories', 'Solar: join the waitlist']
const TIMEFRAMES = ['This week', 'This month', 'Just browsing']
const STEP_LABELS = ['Step 1 of 3: What you need', 'Step 2 of 3: Where & when', 'Step 3 of 3: Your details']
const PRODUCT_PILLS = CATEGORY_PILLS.filter((c) => c.id !== 'all')

export default function ContactPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [shoppingFor, setShoppingFor] = useState('Myself')
  const [interests, setInterests] = useState<string[]>(['Power banks'])
  const [area, setArea] = useState('')
  const [timeframe, setTimeframe] = useState('This week')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [solarOptIn, setSolarOptIn] = useState(false)
  const [showProducts, setShowProducts] = useState(false)
  const [productCat, setProductCat] = useState(PRODUCT_PILLS[0].id)
  const [quoteQty, setQuoteQty] = useState<Record<string, number>>({})

  const toggleInterest = (item: string) =>
    setInterests((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]))

  const setQty = (id: string, qty: number) =>
    setQuoteQty((prev) => {
      const next = { ...prev }
      if (qty <= 0) delete next[id]
      else next[id] = qty
      return next
    })

  const quoteItems = Object.entries(quoteQty)
    .map(([id, qty]) => ({ id, qty, product: CATALOG.find((p) => p.id === id)! }))
    .filter((i) => i.product)
  const quoteTotal = quoteItems.reduce((s, i) => s + i.product.price * i.qty, 0)

  const submit = async () => {
    setSubmitting(true)
    const message = [
      `Shopping for: ${shoppingFor}`,
      `Interested in: ${interests.join(', ') || 'N/A'}`,
      quoteItems.length > 0
        ? `Specific products requested: ${quoteItems.map((i) => `${i.product.name} × ${i.qty}`).join(', ')} (indicative total ${fmt(quoteTotal)})`
        : '',
      `Area: ${area || 'N/A'}`,
      `Timeframe: ${timeframe}`,
      solarOptIn ? 'Wants solar-launch updates.' : '',
    ]
      .filter(Boolean)
      .join('\n')

    let ok = true
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, email, phone, message,
          shoppingFor, interests, area, timeframe,
          items: quoteItems.map((i) => ({ id: i.id, qty: i.qty })),
        }),
      })
      ok = res.ok
    } catch {
      ok = false
      // still show success state — lead capture is best-effort in the demo
    }
    analytics.trackFormSubmission('contact_form', ok)
    setSubmitting(false)
    setDone(true)
  }

  const canAdvance = step < 2 ? true : Boolean(name && email)

  return (
    <div style={{ fontFamily: 'var(--font-body)', background: 'var(--ke-dark-bg)', minHeight: '100vh' }}>
      <JsonLd data={breadcrumbs} />
      <Navbar />
      <main style={{ paddingTop: 64 }} className="ke-screen">
        <section style={{ maxWidth: 640, margin: '0 auto', padding: '64px 32px 100px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.3em', color: 'var(--ke-green-400)' }}>GET&nbsp;IN&nbsp;TOUCH</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(34px,5vw,48px)', letterSpacing: '-.025em', color: '#fff', margin: '16px 0 0' }}>
              {done ? "You're all set." : "Let's power you up."}
            </h1>
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 24, boxShadow: 'var(--shadow-xl)', padding: 32, marginTop: 32, color: 'var(--color-text)' }}>
            {!done && (
              <div style={{ marginBottom: 26 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                  <span>{STEP_LABELS[step]}</span>
                  <span>{step + 1}/3</span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: 'var(--ke-gray-100)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${((step + 1) / 3) * 100}%`, background: 'var(--gradient-brand)', borderRadius: 999, transition: 'width var(--dur-base) var(--ease-standard)' }} />
                </div>
              </div>
            )}

            {!done && step === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <Field label="I'm shopping for">
                  <select value={shoppingFor} onChange={(e) => setShoppingFor(e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
                    {SHOPPING_FOR.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <div>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--color-text)' }}>What are you interested in?</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                    {INTERESTS.map((item) => (
                      <Checkbox key={item} label={item} checked={interests.includes(item)} onChange={() => toggleInterest(item)} />
                    ))}
                  </div>
                </div>

                <div style={{ border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => setShowProducts((v) => !v)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px',
                      background: showProducts ? 'var(--ke-gray-100)' : '#fff', border: 'none', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, flex: 1, color: 'var(--color-text)' }}>
                      Add specific products to your quote (optional)
                    </span>
                    {quoteItems.length > 0 && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ke-green-700)' }}>
                        {quoteItems.reduce((s, i) => s + i.qty, 0)} item{quoteItems.reduce((s, i) => s + i.qty, 0) === 1 ? '' : 's'} · {fmt(quoteTotal)}
                      </span>
                    )}
                    {showProducts ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>

                  {showProducts && (
                    <div style={{ padding: '14px' }}>
                      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 12px' }}>
                        Tell us exactly what you want instead of a general category — we&apos;ll confirm final pricing and stock.
                      </p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                        {PRODUCT_PILLS.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setProductCat(c.id)}
                            style={{
                              padding: '6px 12px', borderRadius: 999, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, cursor: 'pointer',
                              border: productCat === c.id ? '1.5px solid var(--ke-green-500)' : '1.5px solid var(--color-border)',
                              background: productCat === c.id ? 'var(--ke-green-50)' : '#fff',
                              color: productCat === c.id ? 'var(--ke-green-700)' : 'var(--color-text-muted)',
                            }}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflowY: 'auto' }}>
                        {CATALOG.filter((p) => p.cat === productCat).map((p) => {
                          const qty = quoteQty[p.id] ?? 0
                          return (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 4px', borderTop: '1px solid var(--color-border)' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--color-text)' }}>{p.name}</div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>{fmt(p.price)}</div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <button type="button" aria-label={`Fewer ${p.name}`} onClick={() => setQty(p.id, qty - 1)} style={qtyBtn} disabled={qty === 0}>
                                  <Minus size={12} />
                                </button>
                                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, minWidth: 16, textAlign: 'center' }}>{qty}</span>
                                <button type="button" aria-label={`More ${p.name}`} onClick={() => setQty(p.id, qty + 1)} style={qtyBtn}>
                                  <Plus size={12} />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!done && step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <Field label="Area"><input value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Kingston 6" style={inputStyle} /></Field>
                <Field label="How soon do you need it?">
                  <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
                    {TIMEFRAMES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </Field>
              </div>
            )}

            {!done && step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <Field label="Full name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" style={inputStyle} /></Field>
                <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} /></Field>
                <Field label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="876…" style={inputStyle} /></Field>
                <Checkbox label="Text me when solar launches (optional)" checked={solarOptIn} onChange={() => setSolarOptIn((v) => !v)} />
              </div>
            )}

            {done && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', textAlign: 'center', padding: '8px 0' }}>
                <span style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--ke-green-50)', color: 'var(--ke-green-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={28} />
                </span>
                <div style={{ background: 'var(--color-success-soft)', color: 'var(--ke-green-700)', borderRadius: 12, padding: '14px 16px', width: '100%' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Request received</div>
                  <div style={{ fontSize: 13.5, marginTop: 4 }}>A real person from Kingston will reach out within one working day.</div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.18em', color: 'var(--color-text-muted)' }}>
                  OR&nbsp;CALL&nbsp;NOW:&nbsp;<a href="tel:+18763389958" style={{ color: 'var(--ke-green-600)' }}>876-338-9958</a>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.18em', color: 'var(--color-text-muted)' }}>
                  OR&nbsp;EMAIL:&nbsp;<a href="mailto:kingstonenergygroup@outlook.com" style={{ color: 'var(--ke-green-600)' }}>kingstonenergygroup@outlook.com</a>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
              {done ? (
                <Button block onClick={() => router.push('/')}>Back to home</Button>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => (step === 0 ? router.push('/') : setStep((s) => s - 1))}>
                    {step === 0 ? 'Cancel' : 'Back'}
                  </Button>
                  <Button
                    onClick={() => (step === 2 ? submit() : setStep((s) => s + 1))}
                    disabled={!canAdvance || submitting}
                    iconRight={<ArrowRight size={17} />}
                  >
                    {step === 2 ? (submitting ? 'Sending…' : 'Send request') : 'Continue'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        <section style={{ display: 'flex', justifyContent: 'center', padding: '0 0 100px' }}>
          <FaqSection data={CONTACT_FAQ} />
        </section>
      </main>
      <Footer />
    </div>
  )
}

const CONTACT_FAQ: FaqSectionData = {
  mainTitle: 'Frequently asked questions',
  mainSubtitle: "Can't find what you need above? Send the form and we'll get back to you directly.",
  rows: [
    {
      id: 'orders',
      speed: '55s',
      direction: 'left',
      faqItems: [
        {
          id: 'delivery',
          question: 'How do I get my order?',
          answer:
            'Every order can be delivered by our own courier, shipped islandwide via Knutsford Express, or collected free at one of our pickup locations — whichever suits you at checkout.',
        },
        {
          id: 'payment',
          question: 'How can I pay?',
          answer:
            "Pay by card through our secure checkout, or choose bank transfer and upload your proof of payment afterwards from your order — either way, you'll see it confirmed in your account.",
        },
      ],
    },
    {
      id: 'coverage',
      speed: '65s',
      direction: 'right',
      faqItems: [
        {
          id: 'warranty',
          question: "What if my device arrives faulty?",
          answer:
            "We'll replace it or refund you in full at no cost within 14 days of delivery — on top of that, every device carries the manufacturer's own warranty, which varies by brand.",
        },
        {
          id: 'returns',
          question: 'Can I return something I changed my mind about?',
          answer:
            'Yes — most items can be returned within 14 days of delivery for a refund or exchange, provided they’re unused and in their original packaging.',
        },
      ],
    },
    {
      id: 'business',
      speed: '75s',
      direction: 'left',
      faqItems: [
        {
          id: 'bulk',
          question: 'Do you offer pricing for bulk or business orders?',
          answer:
            "Yes — discounts scale with the quantity you order on each item, not a blanket cart-wide markdown, so the math stays transparent. Request a bulk quote and we'll put one together.",
        },
        {
          id: 'unsure',
          question: "Not sure what I actually need?",
          answer:
            "Try Find My Power — a short energy checkup that estimates the setup that actually covers your appliances, instead of guessing at a power bank size.",
        },
      ],
    },
  ],
}

const qtyBtn: import('react').CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: '50%',
  border: '1px solid var(--color-border)',
  background: '#fff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
}
