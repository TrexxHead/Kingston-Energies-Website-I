'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { fmt } from '@/lib/catalog'
import type { FixAction } from '@/lib/energyCheckup/fixList'

export default function FixListSimulator({
  actions,
  totalKwh,
  rate,
}: {
  actions: FixAction[]
  totalKwh: number
  rate: number
}) {
  const [off, setOff] = useState<Set<string>>(new Set())

  if (actions.length === 0) return null

  function toggle(id: string) {
    setOff((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const tickedKwh = actions.filter((a) => !off.has(a.id)).reduce((s, a) => s + a.kwhSaved, 0)
  const tickedJmd = Math.round(tickedKwh * rate)
  const newMonthlyKwh = Math.max(0, totalKwh - tickedKwh)
  const cutPct = totalKwh > 0 ? Math.round((tickedKwh / totalKwh) * 100) : 0

  return (
    <div style={{ background: '#0d1714', borderRadius: 22, padding: 28, marginBottom: 18, color: '#eaf2ec' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.24em', color: 'var(--ke-green-400)', textTransform: 'uppercase' }}>
        Build your fix list
      </span>
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, margin: '8px 0 20px' }}>What actually moves the needle</h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }} className="kp-2col">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {actions.map((a) => {
            const isOff = off.has(a.id)
            const jmd = Math.round(a.kwhSaved * rate)
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => toggle(a.id)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '12px 4px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid rgba(255,255,255,.08)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  opacity: isOff ? 0.5 : 1,
                  transition: 'opacity .2s var(--ease-standard)',
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    flexShrink: 0,
                    marginTop: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isOff ? 'transparent' : 'var(--ke-green-500)',
                    border: isOff ? '1.5px solid rgba(255,255,255,.3)' : 'none',
                    transition: 'all .18s var(--ease-standard)',
                  }}
                >
                  {!isOff && <Check size={13} color="#0d1714" strokeWidth={3} />}
                </span>
                <span style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5 }}>{a.label}</div>
                  <div style={{ fontSize: 12.5, color: 'rgba(234,242,236,.55)', marginTop: 3 }}>{a.detail}</div>
                </span>
                <span style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, color: isOff ? 'rgba(234,242,236,.35)' : 'var(--ke-green-400)' }}>
                    {isOff ? '—' : fmt(jmd)}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(234,242,236,.45)', marginTop: 2 }}>
                    −{Math.round(a.kwhSaved)} kWh
                  </div>
                </span>
              </button>
            )
          })}
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,.05)',
            border: '1px solid rgba(255,255,255,.1)',
            borderRadius: 18,
            padding: 20,
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '.22em', color: 'rgba(234,242,236,.5)', textTransform: 'uppercase' }}>
            If you did all ticked
          </span>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 38, lineHeight: 1, letterSpacing: '-.03em', color: 'var(--ke-green-400)', margin: '10px 0 4px' }}>
            {fmt(tickedJmd)}
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(234,242,236,.55)' }}>a month · {fmt(tickedJmd * 12)} a year</div>

          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5, color: 'rgba(234,242,236,.7)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>New monthly usage</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{Math.round(newMonthlyKwh)} kWh</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Bill cut</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{cutPct}%</span>
            </div>
          </div>

          <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,.08)', overflow: 'hidden', marginTop: 14 }}>
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, cutPct)}%`,
                background: 'linear-gradient(90deg, var(--ke-green-400), var(--ke-blue-400))',
                transition: 'width .5s var(--ease-out)',
              }}
            />
          </div>

          <p style={{ fontSize: 11, color: 'rgba(234,242,236,.45)', lineHeight: 1.5, marginTop: 14 }}>
            JPS puts AC-at-25°C plus a water-heater timer alone at a 30–40% cut for most homes.
          </p>
        </div>
      </div>
    </div>
  )
}
