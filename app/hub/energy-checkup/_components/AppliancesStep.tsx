'use client'

import { useState } from 'react'
import { Minus, Plus, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react'
import { applianceKwh } from '@/lib/energyCheckup/calc'
import { CATEGORY_META, ROOM_META, libraryFor, roomOrderFor, type ApplianceDef, type Room } from '@/lib/energyCheckup/applianceLibrary'
import { iconFor } from './icons'
import { wizardCard, stepHeading, stepSubhead } from './shared'
import type { CuState, RowAdvanced } from './types'

function isZeroed(a: ApplianceDef, state: CuState): boolean {
  if (a.id === 'ac' || a.id === 'bizAc') return state.acType === 'none'
  if (a.id === 'water' || a.id === 'bizWater') return state.waterType === 'solar' || state.waterType === 'gas' || state.waterType === 'none'
  return false
}

const FREQUENCY_OPTIONS: { label: string; days: number }[] = [
  { label: 'Every day', days: 1 },
  { label: 'Every 2 days', days: 2 },
  { label: 'Every 3 days', days: 3 },
  { label: 'A few times a week', days: 4 },
  { label: 'Weekly', days: 7 },
  { label: 'A few times a month', days: 14 },
  { label: 'Monthly', days: 30 },
]

export default function AppliancesStep({ state, set }: { state: CuState; set: (patch: Partial<CuState>) => void }) {
  const mode = state.mode ?? 'home'
  const library = libraryFor(mode)
  const roomOrder = roomOrderFor(mode)

  function setRow(id: string, patch: Partial<{ count: number; hours: number; intervalDays: number }>) {
    const a = library.find((x) => x.id === id)!
    const current = state.rows[id] ?? { count: a.defaultCount, hours: a.defaultHoursPerDay, intervalDays: 1 }
    set({ rows: { ...state.rows, [id]: { ...current, ...patch } } })
  }

  function setAdvanced(id: string, patch: Partial<RowAdvanced>) {
    const a = library.find((x) => x.id === id)!
    const current = state.rows[id] ?? { count: a.defaultCount, hours: a.defaultHoursPerDay, intervalDays: 1 }
    const advanced = { ...current.advanced, ...patch }
    // Drop the key entirely once cleared, so an empty field means "use Quick Mode's estimate" not "use 0".
    ;(Object.keys(advanced) as (keyof RowAdvanced)[]).forEach((k) => {
      if (advanced[k] === undefined || Number.isNaN(advanced[k])) delete advanced[k]
    })
    set({ rows: { ...state.rows, [id]: { ...current, advanced } } })
  }

  const ctx = { acType: state.acType, waterType: state.waterType, lightType: state.lightType, fridgeAgeBand: state.fridgeAgeBand }
  const rowsWithKwh = library.map((a) => {
    const row = state.rows[a.id] ?? { count: a.defaultCount, hours: a.defaultHoursPerDay, intervalDays: 1 }
    const zeroed = isZeroed(a, state)
    const kwh = zeroed ? 0 : applianceKwh(a, { applianceId: a.id, count: row.count, hours: row.hours, intervalDays: row.intervalDays, advanced: row.advanced }, ctx)
    return { a, row, zeroed, kwh }
  })
  const totalKwh = rowsWithKwh.reduce((sum, r) => sum + r.kwh, 0)

  const byRoom = new Map<Room, typeof rowsWithKwh>()
  for (const r of rowsWithKwh) {
    const list = byRoom.get(r.a.room) ?? []
    list.push(r)
    byRoom.set(r.a.room, list)
  }

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const room of roomOrder) {
      const items = byRoom.get(room) ?? []
      init[room] = items.some((r) => !r.zeroed && r.row.count > 0)
    }
    return init
  })

  function toggleRoom(room: Room) {
    setExpanded((prev) => ({ ...prev, [room]: !prev[room] }))
  }

  return (
    <div style={wizardCard}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={stepHeading}>What do you run?</h2>
          <p style={stepSubhead}>Adjust counts and daily hours — the live estimate on the right updates as you go. Fold a section you don&apos;t need.</p>
        </div>
        <button
          type="button"
          onClick={() => set({ advancedMode: !state.advancedMode })}
          aria-pressed={state.advancedMode}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', borderRadius: 999, cursor: 'pointer',
            border: `1.5px solid ${state.advancedMode ? 'var(--ke-green-500)' : 'var(--color-border)'}`,
            background: state.advancedMode ? 'var(--ke-green-50)' : '#fff',
            color: state.advancedMode ? 'var(--ke-green-700)' : 'var(--color-text-muted)',
            fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, whiteSpace: 'nowrap',
          }}
        >
          <SlidersHorizontal size={13} /> Advanced mode
        </button>
      </div>
      {state.advancedMode && (
        <p style={{ fontSize: 12, color: 'var(--color-text-subtle)', margin: '8px 0 0', maxWidth: 560 }}>
          Enter measured watts (off the appliance&apos;s rating label), surge watts, or an observed duty cycle where you
          have them — anything left blank still uses the Quick Mode estimate.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
        {roomOrder.map((room) => {
          const items = byRoom.get(room)
          if (!items || items.length === 0) return null
          const meta = ROOM_META[room]
          const RoomIcon = iconFor(meta.icon)
          const activeCount = items.filter((r) => !r.zeroed && r.row.count > 0).length
          const roomKwh = items.reduce((s, r) => s + r.kwh, 0)
          const isOpen = !!expanded[room]

          return (
            <div key={room} style={{ border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => toggleRoom(room)}
                aria-expanded={isOpen}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '13px 16px',
                  background: isOpen ? 'var(--ke-gray-100)' : '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <RoomIcon size={16} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, flex: 1 }}>{meta.label}</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-subtle)', whiteSpace: 'nowrap' }}>
                  {activeCount} of {items.length} active · <strong style={{ color: 'var(--color-text-muted)' }}>{Math.round(roomKwh)} kWh</strong>
                </span>
                {isOpen ? <ChevronUp size={15} color="var(--color-text-muted)" /> : <ChevronDown size={15} color="var(--color-text-muted)" />}
              </button>

              {isOpen && (
                <div style={{ padding: '0 16px' }}>
                  {items.map(({ a, row, zeroed, kwh }, i) => {
                    const Icon = iconFor(a.icon)
                    const catMeta = CATEGORY_META[a.category]
                    const overQuarter = totalKwh > 0 && kwh / totalKwh > 0.25

                    return (
                      <div key={a.id} style={{ padding: '14px 0', borderTop: i === 0 ? 'none' : '1px solid var(--color-border)' }}>
                        {/* Line 1 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: catMeta.color, opacity: zeroed ? 0.25 : 1, flexShrink: 0 }} />
                          <Icon size={17} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, flex: 1 }}>{a.displayName}</span>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 12,
                              fontWeight: 600,
                              color: overQuarter ? catMeta.color : 'var(--color-text-subtle)',
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
                          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{row.hours} h per use</span>
                          <input
                            type="range"
                            min={0}
                            max={a.maxHoursPerDay}
                            step={0.5}
                            value={row.hours}
                            onChange={(e) => setRow(a.id, { hours: Number(e.target.value) })}
                            disabled={zeroed}
                            style={{ accentColor: 'var(--ke-green-500)', minWidth: 90, flex: 1 }}
                            aria-label="Hours per use"
                          />
                        </div>

                        {/* Line 3 — how often */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, marginLeft: 56, opacity: zeroed ? 0.45 : 1, transition: 'opacity .25s var(--ease-standard)' }}>
                          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', flexShrink: 0 }}>How often</span>
                          <select
                            value={row.intervalDays}
                            onChange={(e) => setRow(a.id, { intervalDays: Number(e.target.value) })}
                            disabled={zeroed}
                            aria-label={`${a.displayName} frequency`}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 8,
                              border: '1px solid var(--color-border)',
                              background: '#fff',
                              fontFamily: 'var(--font-display)',
                              fontSize: 12.5,
                              color: 'var(--color-text)',
                            }}
                          >
                            {FREQUENCY_OPTIONS.map((f) => (
                              <option key={f.days} value={f.days}>
                                {f.label}
                              </option>
                            ))}
                          </select>
                          {row.intervalDays > 1 && (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-subtle)' }}>
                              ≈{(row.hours / row.intervalDays).toFixed(2)} h/day average
                            </span>
                          )}
                        </div>

                        {/* Line 4 — advanced technical overrides */}
                        {state.advancedMode && !zeroed && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, marginLeft: 56, flexWrap: 'wrap' }}>
                            <AdvancedField
                              label="Measured W"
                              value={row.advanced?.measuredWatts}
                              onChange={(v) => setAdvanced(a.id, { measuredWatts: v })}
                            />
                            <AdvancedField
                              label="Surge W"
                              value={row.advanced?.surgeWatts}
                              onChange={(v) => setAdvanced(a.id, { surgeWatts: v })}
                            />
                            {a.loadType === 'cycling' && (
                              <AdvancedField
                                label="Duty cycle %"
                                value={row.advanced?.dutyCyclePct}
                                max={100}
                                onChange={(v) => setAdvanced(a.id, { dutyCyclePct: v })}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AdvancedField({ label, value, max, onChange }: { label: string; value: number | undefined; max?: number; onChange: (v: number | undefined) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 11, color: 'var(--color-text-subtle)', whiteSpace: 'nowrap' }}>{label}</span>
      <input
        type="number"
        min={0}
        max={max}
        value={value ?? ''}
        placeholder="—"
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        style={{
          width: 64, height: 28, padding: '0 8px', borderRadius: 7, border: '1px solid var(--color-border)',
          fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text)',
        }}
      />
    </label>
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
