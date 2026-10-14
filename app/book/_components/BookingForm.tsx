'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { card, label, input, muted, h2, Btn } from '@/app/my-energy/_components/ui'
import { PARISHES } from '@/lib/map/parishes'
import WhatsAppButton from '@/components/WhatsAppButton'
import { WINDOWS, WINDOW_LABEL, type BookingWindow, type Service, type DaySlots } from '@/lib/bookings/config'

interface Avail {
  services: Service[]
  days: DaySlots[]
  depositTerms: string
  onlineDeposits: boolean
  whatsappUpdates: boolean
}
const money = (n: number) => `J$${n.toLocaleString('en-JM')}`
const dayLabel = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-JM', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })

export default function BookingForm() {
  const [avail, setAvail] = useState<Avail | null>(null)
  const [failed, setFailed] = useState(false)
  const [serviceId, setServiceId] = useState('')
  const [date, setDate] = useState('')
  const [win, setWin] = useState<BookingWindow | ''>('')
  const [f, setF] = useState({ customerName: '', phone: '', email: '', parish: '', address: '', notes: '' })
  const [agree, setAgree] = useState(false)
  const [waOptIn, setWaOptIn] = useState(false)
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle')
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ bookingNo: string; serviceName: string; date: string; window: BookingWindow; depositAmount: number } | null>(null)

  const load = () =>
    fetch('/api/bookings')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Avail) => {
        setAvail(d)
        if (d.services[0]) setServiceId((s) => s || d.services[0].id)
      })
      .catch(() => setFailed(true))
  useEffect(() => {
    load()
  }, [])

  const service = avail?.services.find((s) => s.id === serviceId)
  const day = avail?.days.find((d) => d.date === date)
  const deposit = service?.depositJmd ?? 0
  const needsAgree = deposit > 0 && !!avail?.depositTerms
  const canSubmit = service && day && win && day.remaining[win] > 0 && f.customerName.trim() && f.phone.trim() && f.parish && (!needsAgree || agree)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const weeks = useMemo(() => avail?.days ?? [], [avail])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setState('sending')
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceId, date, window: win, customerName: f.customerName, phone: f.phone, email: f.email || undefined, parish: f.parish, address: f.address || undefined, notes: f.notes || undefined, whatsappOptIn: waOptIn }),
    }).catch(() => null)
    const d = await res?.json().catch(() => ({}))
    if (!res?.ok) {
      setState('error')
      setError(d?.error ?? 'We couldn’t save the booking — please try again.')
      if (res?.status === 409) load()
      return
    }
    if (d.payUrl) {
      window.location.href = d.payUrl
      return
    }
    setDone(d.booking)
  }

  if (done)
    return (
      <section role="status" style={{ ...card, display: 'grid', gap: 10 }}>
        <h2 style={h2}>Booked — reference {done.bookingNo}</h2>
        <p style={{ margin: 0, color: '#fff' }}>
          {done.serviceName}, {dayLabel(done.date)}, {WINDOW_LABEL[done.window].toLowerCase()}. We’ll call you to confirm.
        </p>
        {done.depositAmount > 0 && <p style={{ ...muted, margin: 0 }}>A {money(done.depositAmount)} deposit applies — we’ll contact you to arrange it.</p>}
        <div><WhatsAppButton text={`Hi, about my booking ${done.bookingNo}`} label="Questions? Chat on WhatsApp" /></div>
      </section>
    )
  if (failed) return <p style={muted}>Bookings can’t be loaded right now. Please <Link href="/contact" style={{ color: 'var(--ke-green-400)' }}>contact us</Link> instead.</p>
  if (!avail) return <p style={muted}>Loading…</p>
  if (avail.services.length === 0 || avail.days.length === 0)
    return (
      <section style={{ ...card }}>
        <p style={{ margin: 0, color: '#fff' }}>{avail.services.length === 0 ? 'Online booking isn’t open yet.' : 'There are no free times in the coming weeks.'} Please <Link href="/contact" style={{ color: 'var(--ke-green-400)' }}>contact us</Link> and we’ll arrange a visit.</p>
      </section>
    )

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
      <style>{CSS}</style>
      <section style={{ ...card, display: 'grid', gap: 12 }} aria-labelledby="bk-svc">
        <h2 id="bk-svc" style={h2}>1. Service</h2>
        <div className="ke-bk-services" role="radiogroup" aria-label="Service">
          {avail.services.map((s) => (
            <label key={s.id} className={`ke-bk-option${s.id === serviceId ? ' is-on' : ''}`}>
              <input type="radio" name="service" checked={s.id === serviceId} onChange={() => setServiceId(s.id)} />
              <span>
                <strong>{s.name}</strong>
                {s.description && <small>{s.description}</small>}
                <small>
                  {[s.priceNote, s.depositJmd > 0 ? `${money(s.depositJmd)} deposit when booking` : 'No deposit'].filter(Boolean).join(' · ')}
                </small>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section style={{ ...card, display: 'grid', gap: 12 }} aria-labelledby="bk-when">
        <h2 id="bk-when" style={h2}>2. Day and time</h2>
        <div className="ke-bk-days" role="radiogroup" aria-label="Day">
          {weeks.map((d) => (
            <button type="button" key={d.date} role="radio" aria-checked={d.date === date} className={`ke-bk-day${d.date === date ? ' is-on' : ''}`} onClick={() => { setDate(d.date); if (win && d.remaining[win] === 0) setWin('') }}>
              {dayLabel(d.date)}
            </button>
          ))}
        </div>
        {day && (
          <div className="ke-bk-days" role="radiogroup" aria-label="Time">
            {WINDOWS.map((w) => (
              <button type="button" key={w} role="radio" aria-checked={win === w} disabled={day.remaining[w] === 0} className={`ke-bk-day${win === w ? ' is-on' : ''}`} onClick={() => setWin(w)}>
                {WINDOW_LABEL[w]} {day.remaining[w] === 0 ? '— full' : day.remaining[w] === 1 ? '— last place' : ''}
              </button>
            ))}
          </div>
        )}
      </section>

      <section style={{ ...card, display: 'grid', gap: 12 }} aria-labelledby="bk-you">
        <h2 id="bk-you" style={h2}>3. Your details</h2>
        <div className="ke-bk-fields">
          <div><label htmlFor="bk-name" style={label}>Name</label><input id="bk-name" style={input} value={f.customerName} onChange={set('customerName')} required autoComplete="name" /></div>
          <div><label htmlFor="bk-phone" style={label}>Phone</label><input id="bk-phone" style={input} value={f.phone} onChange={set('phone')} required inputMode="tel" autoComplete="tel" /></div>
          <div><label htmlFor="bk-email" style={label}>Email (for your confirmation)</label><input id="bk-email" type="email" style={input} value={f.email} onChange={set('email')} autoComplete="email" /></div>
          <div>
            <label htmlFor="bk-parish" style={label}>Parish</label>
            <select id="bk-parish" style={input} value={f.parish} onChange={set('parish')} required>
              <option value="">Choose…</option>
              {PARISHES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div><label htmlFor="bk-addr" style={label}>Address for the visit</label><input id="bk-addr" style={input} value={f.address} onChange={set('address')} autoComplete="street-address" /></div>
        <div><label htmlFor="bk-notes" style={label}>Anything we should know</label><textarea id="bk-notes" style={{ ...input, height: 80, paddingTop: 10 }} maxLength={1000} value={f.notes} onChange={set('notes')} /></div>
        {avail.whatsappUpdates && (
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#fff', fontSize: 14 }}>
            <input type="checkbox" checked={waOptIn} onChange={(e) => setWaOptIn(e.target.checked)} /> Send booking updates to this number on WhatsApp
          </label>
        )}
      </section>

      {deposit > 0 && (
        <section style={{ ...card, display: 'grid', gap: 10 }} aria-labelledby="bk-dep">
          <h2 id="bk-dep" style={h2}>4. Deposit: {money(deposit)}</h2>
          {avail.depositTerms && <p style={{ ...muted, margin: 0, whiteSpace: 'pre-wrap' }}>{avail.depositTerms}</p>}
          <p style={{ ...muted, margin: 0 }}>{avail.onlineDeposits ? 'You’ll pay securely with Fygaro after booking. Your place is held while you pay.' : 'We’ll contact you to arrange the deposit.'}</p>
          {needsAgree && (
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#fff', fontSize: 14 }}>
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I’ve read the deposit terms
            </label>
          )}
        </section>
      )}

      {state === 'error' && <p role="alert" style={{ color: '#f6a5a5', margin: 0 }}>{error}</p>}
      <div>
        <Btn type="submit" disabled={!canSubmit || state === 'sending'}>{state === 'sending' ? 'Booking…' : deposit > 0 && avail.onlineDeposits ? `Book and pay ${money(deposit)} deposit` : 'Book'}</Btn>
      </div>
    </form>
  )
}

const CSS = `
.ke-bk-services{display:grid;gap:8px}
.ke-bk-option{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.1);cursor:pointer}
.ke-bk-option.is-on{border-color:var(--ke-green-400);background:rgba(63,157,42,.08)}
.ke-bk-option input{margin-top:4px;accent-color:var(--ke-green-500)}
.ke-bk-option strong{display:block;color:#fff}
.ke-bk-option small{display:block;color:var(--ke-dark-text-muted);font-size:13px;margin-top:2px}
.ke-bk-days{display:flex;gap:8px;flex-wrap:wrap}
.ke-bk-day{height:38px;padding:0 14px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:transparent;color:#fff;font:inherit;font-size:13.5px;font-weight:600;cursor:pointer}
.ke-bk-day.is-on{background:var(--ke-green-500);border-color:var(--ke-green-500);color:#0d1714}
.ke-bk-day:disabled{opacity:.4;cursor:not-allowed}
.ke-bk-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
`
