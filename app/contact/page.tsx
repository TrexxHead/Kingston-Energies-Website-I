'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Button, Field, Checkbox, inputStyle } from '@/components/shop/ui'

const SHOPPING_FOR = ['Myself', 'My business', 'A bulk order', 'Solar (early access)']
const INTERESTS = ['Power banks', 'Chargers & cables', 'Accessories', 'Solar — join the waitlist']
const TIMEFRAMES = ['This week', 'This month', 'Just browsing']
const STEP_LABELS = ['Step 1 of 3 — What you need', 'Step 2 of 3 — Where & when', 'Step 3 of 3 — Your details']

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

  const toggleInterest = (item: string) =>
    setInterests((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]))

  const submit = async () => {
    setSubmitting(true)
    const message = [
      `Shopping for: ${shoppingFor}`,
      `Interested in: ${interests.join(', ') || '—'}`,
      `Area: ${area || '—'}`,
      `Timeframe: ${timeframe}`,
      solarOptIn ? 'Wants solar-launch updates.' : '',
    ]
      .filter(Boolean)
      .join('\n')

    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, message }),
      })
    } catch {
      // still show success state — lead capture is best-effort in the demo
    }
    setSubmitting(false)
    setDone(true)
  }

  const canAdvance = step < 2 ? true : Boolean(name && email)

  return (
    <div style={{ fontFamily: 'var(--font-body)', background: 'var(--ke-dark-bg)', minHeight: '100vh' }}>
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
                  OR&nbsp;CALL&nbsp;NOW&nbsp;—&nbsp;<a href="tel:+18763389958" style={{ color: 'var(--ke-green-600)' }}>876-338-9958</a>
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
      </main>
      <Footer />
    </div>
  )
}
