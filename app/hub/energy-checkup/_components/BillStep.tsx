'use client'

import { Receipt } from 'lucide-react'
import { wizardCard, stepHeading, stepSubhead } from './shared'
import type { CuState } from './types'

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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const STOP_OPTIONS = ['POS / card machine', 'Coolers / fridges', 'Wi-Fi & phones', 'Lighting']

function pillStyle(selected: boolean): import('react').CSSProperties {
  return {
    padding: '9px 15px',
    borderRadius: 999,
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 13,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    border: selected ? '1.5px solid var(--ke-green-500)' : '1.5px solid var(--color-border)',
    background: selected ? 'var(--ke-green-50)' : '#fff',
    color: selected ? 'var(--ke-green-700)' : 'var(--color-text-muted)',
  }
}

export default function BillStep({ state, set }: { state: CuState; set: (patch: Partial<CuState>) => void }) {
  function toggleStop(v: string) {
    const has = state.stops.includes(v)
    set({ stops: has ? state.stops.filter((s) => s !== v) : [...state.stops, v] })
  }

  return (
    <div style={wizardCard}>
      <h2 style={stepHeading}>Your last bill</h2>
      <p style={stepSubhead}>The single most important input.</p>

      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
          background: 'var(--ke-green-50)',
          border: '1px solid var(--ke-green-200)',
          borderRadius: 14,
          padding: '12px 16px',
          marginBottom: 22,
        }}
      >
        <Receipt size={16} color="var(--ke-green-600)" style={{ flexShrink: 0, marginTop: 2 }} />
        <span style={{ fontSize: 13, color: 'var(--ke-green-700)', lineHeight: 1.55 }}>
          Your real bill is the most important field here — it&apos;s what turns a generic guess into a number that
          matches your house.
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>
        <div>
          <label style={fieldLabel} htmlFor="cu-bill-kwh">Bill usage (kWh)</label>
          <input
            id="cu-bill-kwh"
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="e.g. 520"
            value={state.billKwh}
            onChange={(e) => set({ billKwh: e.target.value })}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={fieldLabel} htmlFor="cu-bill-jmd">Bill amount (JMD)</label>
          <input
            id="cu-bill-jmd"
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="e.g. 25537"
            value={state.billJmd}
            onChange={(e) => set({ billJmd: e.target.value })}
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ marginBottom: state.mode === 'biz' ? 22 : 0 }}>
        <span style={{ ...fieldLabel, marginBottom: 10, display: 'block' }}>Billing month</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {MONTHS.map((m) => (
            <button key={m} type="button" onClick={() => set({ month: m })} style={pillStyle(state.month === m)}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {state.mode === 'biz' && (
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 22 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, margin: '0 0 4px' }}>What does an outage cost you?</h3>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 16px' }}>Optional.</p>
          <div style={{ marginBottom: 18 }}>
            <label style={fieldLabel} htmlFor="cu-rev-hour">Revenue per operating hour (J$)</label>
            <input
              id="cu-rev-hour"
              type="number"
              inputMode="decimal"
              min={0}
              placeholder="e.g. 8000"
              value={state.revHour}
              onChange={(e) => set({ revHour: e.target.value })}
              style={{ ...inputStyle, maxWidth: 260 }}
            />
          </div>
          <div>
            <span style={{ ...fieldLabel, marginBottom: 10, display: 'block' }}>What stops during an outage?</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {STOP_OPTIONS.map((v) => (
                <button key={v} type="button" onClick={() => toggleStop(v)} style={pillStyle(state.stops.includes(v))}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
