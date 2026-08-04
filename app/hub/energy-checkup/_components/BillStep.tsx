'use client'

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

const STOP_OPTIONS = ['Refrigeration / cold storage', 'POS / payments', 'Lighting', 'Security & cameras', 'Wi-Fi / internet']

export default function BillStep({ state, set }: { state: CuState; set: (patch: Partial<CuState>) => void }) {
  function toggleStop(v: string) {
    const has = state.stops.includes(v)
    set({ stops: has ? state.stops.filter((s) => s !== v) : [...state.stops, v] })
  }

  return (
    <div style={wizardCard}>
      <h2 style={stepHeading}>Your last bill</h2>
      <p style={stepSubhead}>Optional, but this is what turns the estimate into your real number — and calibrates it against what JPS actually charged you.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>
        <div>
          <label style={fieldLabel} htmlFor="cu-bill-kwh">Units used (kWh)</label>
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
          <label style={fieldLabel} htmlFor="cu-bill-jmd">Amount billed (J$)</label>
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
        <label style={fieldLabel} htmlFor="cu-bill-month">Billing month</label>
        <input
          id="cu-bill-month"
          type="month"
          value={state.month}
          onChange={(e) => set({ month: e.target.value })}
          style={{ ...inputStyle, maxWidth: 220 }}
        />
      </div>

      {state.mode === 'biz' && (
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 22 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, margin: '0 0 4px' }}>Outage impact</h3>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 16px' }}>
            Used only to estimate what an outage costs you — not part of the energy estimate itself.
          </p>
          <div style={{ marginBottom: 18 }}>
            <label style={fieldLabel} htmlFor="cu-rev-hour">Approximate revenue per hour (J$)</label>
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
              {STOP_OPTIONS.map((v) => {
                const selected = state.stops.includes(v)
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => toggleStop(v)}
                    style={{
                      padding: '9px 15px',
                      borderRadius: 999,
                      fontFamily: 'var(--font-display)',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                      border: selected ? '1.5px solid var(--ke-green-500)' : '1.5px solid var(--color-border)',
                      background: selected ? 'var(--ke-green-50)' : '#fff',
                      color: selected ? 'var(--ke-green-700)' : 'var(--color-text-muted)',
                    }}
                  >
                    {v}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
