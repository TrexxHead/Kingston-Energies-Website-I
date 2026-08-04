'use client'

import { applianceKwh } from '@/lib/energyCheckup/calc'
import { CATEGORY_META, libraryFor, type ApplianceDef } from '@/lib/energyCheckup/applianceLibrary'
import { iconFor } from './icons'
import { wizardCard, stepHeading, stepSubhead } from './shared'
import type { CuState } from './types'

function isZeroed(a: ApplianceDef, state: CuState): boolean {
  if (a.id === 'ac' || a.id === 'bizAc') return state.acType === 'none'
  if (a.id === 'water' || a.id === 'bizWater') return state.waterType === 'solar' || state.waterType === 'gas' || state.waterType === 'none'
  return false
}

export default function AppliancesStep({ state, set }: { state: CuState; set: (patch: Partial<CuState>) => void }) {
  const library = libraryFor(state.mode ?? 'home')

  function setRow(id: string, patch: Partial<{ count: number; hours: number }>) {
    const a = library.find((x) => x.id === id)!
    const current = state.rows[id] ?? { count: a.defaultCount, hours: a.defaultHoursPerDay }
    set({ rows: { ...state.rows, [id]: { ...current, ...patch } } })
  }

  return (
    <div style={wizardCard}>
      <h2 style={stepHeading}>What do you run?</h2>
      <p style={stepSubhead}>Adjust counts and daily hours — the live estimate on the right updates as you go.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {library.map((a) => {
          const row = state.rows[a.id] ?? { count: a.defaultCount, hours: a.defaultHoursPerDay }
          const zeroed = isZeroed(a, state)
          const kwh = zeroed
            ? 0
            : applianceKwh(a, { applianceId: a.id, count: row.count, hours: row.hours }, {
                acType: state.acType,
                waterType: state.waterType,
                lightType: state.lightType,
                fridgeAgeBand: state.fridgeAgeBand,
              })
          const Icon = iconFor(a.icon)
          const meta = CATEGORY_META[a.category]

          return (
            <div
              key={a.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 4px',
                borderBottom: '1px solid var(--color-border)',
                opacity: zeroed || row.count === 0 ? 0.45 : 1,
                transition: 'opacity .15s ease',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 2, background: meta.color, flexShrink: 0 }} />
              <Icon size={17} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />

              <div style={{ flex: '1 1 160px', minWidth: 140 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5 }}>{a.displayName}</div>
                {!zeroed && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                    <input
                      type="range"
                      min={0}
                      max={a.maxHoursPerDay}
                      step={0.5}
                      value={row.hours}
                      onChange={(e) => setRow(a.id, { hours: Number(e.target.value) })}
                      style={{ accentColor: 'var(--ke-green-500)', width: 140 }}
                      aria-label={`${a.displayName} hours per day`}
                    />
                    <span style={{ fontSize: 11.5, color: 'var(--color-text-subtle)', fontFamily: 'var(--font-mono)', minWidth: 62 }}>
                      {row.hours}h / day
                    </span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setRow(a.id, { count: Math.max(0, row.count - 1) })}
                  aria-label={`Fewer ${a.displayName}`}
                  style={countBtn}
                >
                  −
                </button>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, minWidth: 18, textAlign: 'center' }}>{row.count}</span>
                <button
                  type="button"
                  onClick={() => setRow(a.id, { count: Math.min(20, row.count + 1) })}
                  aria-label={`More ${a.displayName}`}
                  style={countBtn}
                >
                  +
                </button>
              </div>

              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  fontWeight: 600,
                  minWidth: 70,
                  textAlign: 'right',
                  color: 'var(--color-text)',
                }}
              >
                {Math.round(kwh)} kWh
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const countBtn: import('react').CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: '50%',
  border: '1px solid var(--color-border)',
  background: '#fff',
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
}
