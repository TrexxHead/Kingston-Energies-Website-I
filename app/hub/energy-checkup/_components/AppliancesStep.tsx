'use client'

import { Minus, Plus } from 'lucide-react'
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

  const ctx = { acType: state.acType, waterType: state.waterType, lightType: state.lightType, fridgeAgeBand: state.fridgeAgeBand }
  const rowsWithKwh = library.map((a) => {
    const row = state.rows[a.id] ?? { count: a.defaultCount, hours: a.defaultHoursPerDay }
    const zeroed = isZeroed(a, state)
    const kwh = zeroed ? 0 : applianceKwh(a, { applianceId: a.id, count: row.count, hours: row.hours }, ctx)
    return { a, row, zeroed, kwh }
  })
  const totalKwh = rowsWithKwh.reduce((sum, r) => sum + r.kwh, 0)

  return (
    <div style={wizardCard}>
      <h2 style={stepHeading}>What do you run?</h2>
      <p style={stepSubhead}>Adjust counts and daily hours — the live estimate on the right updates as you go.</p>

      <div>
        {rowsWithKwh.map(({ a, row, zeroed, kwh }, i) => {
          const Icon = iconFor(a.icon)
          const meta = CATEGORY_META[a.category]
          const overQuarter = totalKwh > 0 && kwh / totalKwh > 0.25

          return (
            <div key={a.id} style={{ padding: '16px 0', borderTop: i === 0 ? 'none' : '1px solid var(--color-border)' }}>
              {/* Line 1 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta.color, opacity: zeroed ? 0.25 : 1, flexShrink: 0 }} />
                <Icon size={18} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5, flex: 1 }}>{a.displayName}</span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    fontWeight: 600,
                    color: overQuarter ? meta.color : 'var(--color-text-subtle)',
                  }}
                >
                  {Math.round(kwh)} kWh
                </span>
              </div>

              {/* Line 2 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, opacity: zeroed ? 0.45 : 1, transition: 'opacity .25s var(--ease-standard)' }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)', width: 44, flexShrink: 0 }}>How many</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setRow(a.id, { count: Math.max(0, row.count - 1) })}
                    aria-label={`Fewer ${a.displayName}`}
                    style={countBtn}
                    disabled={zeroed}
                  >
                    <Minus size={13} />
                  </button>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, minWidth: 18, textAlign: 'center' }}>{row.count}</span>
                  <button
                    type="button"
                    onClick={() => setRow(a.id, { count: Math.min(20, row.count + 1) })}
                    aria-label={`More ${a.displayName}`}
                    style={countBtn}
                    disabled={zeroed}
                  >
                    <Plus size={13} />
                  </button>
                </div>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{row.hours} h/day</span>
                <input
                  type="range"
                  min={0}
                  max={a.maxHoursPerDay}
                  step={0.5}
                  value={row.hours}
                  onChange={(e) => setRow(a.id, { hours: Number(e.target.value) })}
                  disabled={zeroed}
                  style={{ accentColor: 'var(--ke-green-500)', minWidth: 110, flex: 1 }}
                  aria-label="Hours per day"
                />
              </div>
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
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
}
