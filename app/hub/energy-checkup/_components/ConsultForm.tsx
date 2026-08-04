'use client'

import { useState } from 'react'
import { Send, Check, X } from 'lucide-react'
import { PillGroup } from './shared'

const INTEREST_OPTIONS = ['Solar', 'Backup power / outage protection', 'Both solar and backup', 'Not sure yet']
const CONTACT_METHOD_OPTIONS = ['Email', 'Phone call', 'WhatsApp']
const BEST_TIME_OPTIONS = ['Morning', 'Afternoon', 'Evening', 'Anytime']
const TIMELINE_OPTIONS = ['This month', 'Next few months', 'Just exploring']

const inputStyle: import('react').CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 10,
  border: '1.5px solid var(--color-border)',
  fontFamily: 'var(--font-display)',
  fontSize: 14,
  color: 'var(--color-text)',
}

const fieldLabel: import('react').CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  fontSize: 13,
  marginBottom: 6,
}

export default function ConsultForm({ checkupId, onClose }: { checkupId: string; onClose: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [interest, setInterest] = useState(INTEREST_OPTIONS[0])
  const [contactMethod, setContactMethod] = useState(CONTACT_METHOD_OPTIONS[0])
  const [bestTime, setBestTime] = useState(BEST_TIME_OPTIONS[3])
  const [timeline, setTimeline] = useState(TIMELINE_OPTIONS[0])
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function submit() {
    if (!name.trim() || !email.trim()) {
      setStatus('error')
      return
    }
    setStatus('sending')
    try {
      const res = await fetch(`/api/hub/energy-checkup/${checkupId}/consult`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          interest,
          contactMethod,
          bestTime,
          timeline,
          notes: notes.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error('failed')
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 20, padding: 26, textAlign: 'center' }}>
        <Check size={26} color="var(--ke-green-500)" style={{ marginBottom: 8 }} />
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, margin: '0 0 4px' }}>We&apos;ve got it.</h3>
        <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', margin: 0 }}>
          A Kingston Energies rep will reach out by {contactMethod.toLowerCase()}, {bestTime.toLowerCase()}.
        </p>
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 20, padding: 26, position: 'relative' }}>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)' }}
      >
        <X size={16} />
      </button>

      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, margin: '0 0 4px' }}>Let&apos;s talk about your options.</h3>
      <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', margin: '0 0 20px', maxWidth: 480 }}>
        A few details so a rep can call prepared — with your own checkup numbers already in hand, not a cold pitch.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
        <div>
          <label style={fieldLabel} htmlFor="consult-name">Name</label>
          <input id="consult-name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="Your name" />
        </div>
        <div>
          <label style={fieldLabel} htmlFor="consult-email">Email</label>
          <input id="consult-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="you@email.com" />
        </div>
      </div>

      <div style={{ marginBottom: 18, maxWidth: 260 }}>
        <label style={fieldLabel} htmlFor="consult-phone">Phone / WhatsApp (optional)</label>
        <input id="consult-phone" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} placeholder="876-xxx-xxxx" />
      </div>

      <PillGroup label="What are you most interested in?" options={INTEREST_OPTIONS.map((v) => ({ value: v, label: v }))} value={interest} onChange={setInterest} />
      <PillGroup label="How should we reach you?" options={CONTACT_METHOD_OPTIONS.map((v) => ({ value: v, label: v }))} value={contactMethod} onChange={setContactMethod} />
      <PillGroup label="Best time" options={BEST_TIME_OPTIONS.map((v) => ({ value: v, label: v }))} value={bestTime} onChange={setBestTime} />
      <PillGroup label="Timeline" options={TIMELINE_OPTIONS.map((v) => ({ value: v, label: v }))} value={timeline} onChange={setTimeline} />

      <div style={{ marginBottom: 20 }}>
        <label style={fieldLabel} htmlFor="consult-notes">Anything else? (optional)</label>
        <textarea
          id="consult-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-body)' }}
          placeholder="Roof access, budget range, specific questions — anything that helps the rep prepare."
        />
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={status === 'sending'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '11px 22px',
          borderRadius: 10,
          border: 'none',
          background: '#c0821c',
          color: '#fff',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 14,
          cursor: status === 'sending' ? 'default' : 'pointer',
          opacity: status === 'sending' ? 0.7 : 1,
        }}
      >
        <Send size={14} /> {status === 'sending' ? 'Sending…' : 'Request a callback'}
      </button>
      {status === 'error' && <p style={{ fontSize: 12.5, color: '#d84a3a', marginTop: 10 }}>Enter your name and email, then try again.</p>}
    </div>
  )
}
