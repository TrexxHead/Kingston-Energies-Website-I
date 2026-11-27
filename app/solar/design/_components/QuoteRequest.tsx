'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { CalendarCheck, CircleCheck, Loader2, X } from 'lucide-react'
import { label, input, muted } from '@/app/my-energy/_components/ui'
import { PARISHES } from '@/lib/map/parishes'
import type { DesignSnapshot } from '@/lib/solarProjects'

/**
 * “Get my quote”: the design plus contact details become a solar project.
 * The customer then picks a survey time (linked to the project) and follows
 * it in their hub.
 */
export default function QuoteRequest({ design, onClose }: { design: DesignSnapshot; onClose: () => void }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', parish: '', address: '', note: '', website: '' })
  const [exportsToGrid, setExports] = useState(false)
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle')
  const [error, setError] = useState('')
  const [projectNo, setProjectNo] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const can = f.name.trim().length > 1 && /\S+@\S+\.\S+/.test(f.email) && f.phone.replace(/\D/g, '').length >= 7 && f.parish

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!can) return
    setState('sending')
    const res = await fetch('/api/solar/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...f, address: f.address || undefined, note: f.note || undefined, website: f.website || undefined, exportsToGrid, design }),
    }).catch(() => null)
    const j = await res?.json().catch(() => ({}))
    if (!res?.ok) {
      setState('error')
      setError(j?.error ?? 'We couldn’t send that — check your connection and try again.')
      return
    }
    try {
      sessionStorage.setItem('ke-solar-contact', JSON.stringify({ projectNo: j.projectNo, name: f.name, email: f.email, phone: f.phone, parish: f.parish, address: f.address }))
    } catch {
      /* storage unavailable */
    }
    setProjectNo(j.projectNo)
    setState('idle')
  }

  if (projectNo)
    return (
      <div className="ke-qr" role="status">
        <CircleCheck size={28} aria-hidden style={{ color: 'var(--ke-green-400)' }} />
        <strong className="ke-qr-title">Design received — project {projectNo}</strong>
        <p style={{ ...muted, margin: 0 }}>We’ve e-mailed you a copy. Next, a site survey confirms your roof, wiring and main panel; your quote follows. Sign in with {f.email} to follow the project in your account.</p>
        <div className="ke-qr-row">
          <Link href={`/book?project=${projectNo}`} className="ke-qr-primary">
            <CalendarCheck size={16} aria-hidden /> Pick a survey time
          </Link>
          <Link href="/hub/projects" className="ke-qr-ghost">
            Follow my project
          </Link>
        </div>
      </div>
    )

  return (
    <form className="ke-qr" onSubmit={submit} aria-labelledby="qr-title">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong id="qr-title" className="ke-qr-title">Get your quote</strong>
        <button type="button" onClick={onClose} aria-label="Close" className="ke-qr-x">
          <X size={18} />
        </button>
      </div>
      <p style={{ ...muted, margin: 0, fontSize: 13 }}>We’ll send this design with your details, arrange a site survey and prepare your quote. No obligation.</p>
      <div className="ke-qr-grid">
        <div>
          <label htmlFor="qr-name" style={label}>Name</label>
          <input id="qr-name" style={input} value={f.name} onChange={set('name')} autoComplete="name" required />
        </div>
        <div>
          <label htmlFor="qr-phone" style={label}>Phone</label>
          <input id="qr-phone" style={input} value={f.phone} onChange={set('phone')} autoComplete="tel" inputMode="tel" required />
        </div>
        <div>
          <label htmlFor="qr-email" style={label}>E-mail</label>
          <input id="qr-email" type="email" style={input} value={f.email} onChange={set('email')} autoComplete="email" required />
        </div>
        <div>
          <label htmlFor="qr-parish" style={label}>Parish</label>
          <select id="qr-parish" style={input} value={f.parish} onChange={set('parish')} required>
            <option value="">Choose…</option>
            {PARISHES.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="qr-address" style={label}>Address (optional)</label>
        <input id="qr-address" style={input} value={f.address} onChange={set('address')} autoComplete="street-address" />
      </div>
      <div>
        <label htmlFor="qr-note" style={label}>Anything we should know? (optional)</label>
        <input id="qr-note" style={input} value={f.note} onChange={set('note')} placeholder="Roof type, outages, plans to add an A/C…" />
      </div>
      <label className="ke-qr-check">
        <input type="checkbox" checked={exportsToGrid} onChange={(e) => setExports(e.target.checked)} /> I’d like to sell surplus power to JPS (net billing needs a licence and a JPS contract — we’ll help)
      </label>
      <input tabIndex={-1} autoComplete="off" aria-hidden value={f.website} onChange={set('website')} style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }} />
      {state === 'error' && <p role="alert" style={{ ...muted, color: '#f6a5a5', margin: 0 }}>{error}</p>}
      <button type="submit" className="ke-qr-primary" disabled={!can || state === 'sending'}>
        {state === 'sending' ? <Loader2 size={16} aria-hidden className="ke-qr-spin" /> : null} Send my design
      </button>
      <style>{CSS}</style>
    </form>
  )
}

const CSS = `
.ke-qr{display:grid;gap:12px;padding:16px;border-radius:18px;background:rgba(255,255,255,.04);border:1px solid rgba(62,207,142,.35)}
.ke-qr-title{color:#fff;font-family:var(--font-display);font-size:18px}
.ke-qr-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media (max-width:520px){.ke-qr-grid{grid-template-columns:1fr}}
.ke-qr-check{display:flex;gap:8px;align-items:flex-start;color:var(--ke-dark-text);font-size:13px;line-height:1.45}
.ke-qr-check input{margin-top:3px;accent-color:var(--ke-green-500)}
.ke-qr-row{display:flex;gap:8px;flex-wrap:wrap}
.ke-qr .ke-qr-primary{display:inline-flex;justify-content:center;align-items:center;gap:8px;height:48px;padding:0 22px;border:0;border-radius:999px;background:var(--ke-green-500);color:#0d1714;font-weight:700;font-size:15px;text-decoration:none;cursor:pointer}
.ke-qr .ke-qr-primary:disabled{opacity:.5;cursor:not-allowed}
.ke-qr a.ke-qr-ghost{display:inline-flex;align-items:center;height:48px;padding:0 18px;border-radius:999px;border:1px solid rgba(255,255,255,.22);color:#fff;font-weight:600;text-decoration:none}
.ke-qr-x{background:none;border:0;color:var(--ke-dark-text-muted);cursor:pointer}
.ke-qr-spin{animation:ke-qr-spin 1s linear infinite}@keyframes ke-qr-spin{to{transform:rotate(360deg)}}
`
