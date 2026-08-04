'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, RotateCcw, Mail, Check } from 'lucide-react'

const overline = {
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  letterSpacing: '.3em',
  color: 'var(--ke-green-400)',
} as const

interface Need {
  id: string
  label: string
  category: 'powerbanks' | 'chargers' | 'stations'
  result: { title: string; body: string }
}

const NEEDS: Need[] = [
  {
    id: 'phone',
    label: 'My phone dies before the day is out',
    category: 'powerbanks',
    result: {
      title: 'A power bank',
      body: 'A slim everyday power bank covers a phone (or two) for a full extra day. Go bigger capacity if you\'re also charging a tablet.',
    },
  },
  {
    id: 'fast',
    label: 'I need to charge multiple devices, fast',
    category: 'chargers',
    result: {
      title: 'A GaN charger + cables',
      body: 'A compact multi-port GaN wall charger with the right cables gets a phone, tablet and laptop all charging fast from one outlet.',
    },
  },
  {
    id: 'outage',
    label: 'The power goes out and I want backup',
    category: 'stations',
    result: {
      title: 'A power station',
      body: 'A power station keeps the essentials — Wi-Fi, lighting, a laptop, a CPAP — running through an outage, from a wall-outlet charge.',
    },
  },
  {
    id: 'offgrid',
    label: 'I want off-grid or solar backup',
    category: 'stations',
    result: {
      title: 'A power station + solar panel',
      body: 'Pair a power station with a foldable solar panel so it recharges without a wall outlet at all — built for longer or recurring outages.',
    },
  },
]

export default function Finder() {
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const picked = NEEDS.find((n) => n.id === pickedId) ?? null

  async function emailMyResult() {
    if (!email.trim() || !picked) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Find my power visitor',
          email: email.trim(),
          message: `Find my power result: ${picked.result.title} (need: "${picked.label}"). Please follow up with product suggestions.`,
        }),
      })
      if (res.ok) setSent(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section style={{ maxWidth: 720, margin: '0 auto', padding: '96px 32px 120px' }}>
      <div style={overline}>FIND MY POWER</div>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 'clamp(34px,6vw,52px)',
          lineHeight: 1.05,
          letterSpacing: '-.03em',
          color: '#fff',
          margin: '18px 0 8px',
        }}
      >
        {picked ? 'Here\'s what fits.' : 'What are you trying to solve?'}
      </h1>

      {!picked && (
        <>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: 'rgba(234,242,236,.68)', margin: '0 0 32px' }}>
            Pick the one closest to your situation — takes about ten seconds.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {NEEDS.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setPickedId(n.id)}
                style={{
                  textAlign: 'left',
                  padding: '18px 22px',
                  borderRadius: 16,
                  border: '1.5px solid var(--ke-dark-hairline)',
                  background: 'var(--ke-dark-card)',
                  color: '#fff',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 15.5,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                {n.label}
                <ArrowRight size={16} color="var(--ke-green-400)" style={{ flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </>
      )}

      {picked && (
        <div>
          <div style={{ background: 'var(--ke-dark-card)', border: '1px solid var(--ke-dark-hairline)', borderRadius: 20, padding: 28, marginTop: 8 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--ke-green-400)', margin: 0 }}>{picked.result.title}</h2>
            <p style={{ fontSize: 15.5, lineHeight: 1.65, color: 'rgba(234,242,236,.72)', margin: '12px 0 24px' }}>{picked.result.body}</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href={`/shop?category=${picked.category}`} style={ctaPrimary}>
                Shop {picked.result.title.toLowerCase()} <ArrowRight size={16} />
              </Link>
              <button type="button" onClick={() => setPickedId(null)} style={ctaGhost}>
                <RotateCcw size={15} /> Start over
              </button>
            </div>
          </div>

          {!sent ? (
            <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
              <input
                type="email"
                placeholder="Email this result to yourself"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '11px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,.14)',
                  background: 'rgba(255,255,255,.04)',
                  color: '#fff',
                  fontSize: 14,
                }}
              />
              <button
                type="button"
                onClick={emailMyResult}
                disabled={submitting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '11px 18px',
                  borderRadius: 10,
                  border: '1.5px solid rgba(255,255,255,.4)',
                  background: 'transparent',
                  color: '#fff',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: submitting ? 'default' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <Mail size={14} /> {submitting ? 'Sending…' : 'Email it'}
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--ke-green-400)' }}>
              <Check size={16} /> We&apos;ll follow up shortly.
            </div>
          )}
        </div>
      )}
    </section>
  )
}

const ctaPrimary = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  height: 48,
  padding: '0 22px',
  borderRadius: 999,
  background: '#fff',
  color: 'var(--ke-ink)',
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: 14.5,
} as const

const ctaGhost = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  height: 48,
  padding: '0 22px',
  borderRadius: 999,
  border: '1.5px solid rgba(255,255,255,.4)',
  background: 'transparent',
  color: '#fff',
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  fontSize: 14.5,
  cursor: 'pointer',
} as const
