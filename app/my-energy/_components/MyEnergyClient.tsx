'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Trash2, Cloud, HardDrive, Pencil, Zap } from 'lucide-react'
import { PARISHES } from '@/lib/map/parishes'
import { newClientId, pruneScenario, type ProfileDevice, type ProfileProperty, type ProfileScenario } from '@/lib/energy/profileSchema'
import { useEnergyProfile, type ProfileSync } from '@/lib/energy/useEnergyProfile'
import { QUICK_ITEMS, quickAddDevice } from '@/lib/energy/quickAdd'
import DeviceForm from './DeviceForm'
import ScenarioResults from './ScenarioResults'
import EnergyOverview from './EnergyOverview'
import { card, label, input, muted, h2, Btn, BasisChip } from './ui'


const MODEL_TEXT: Record<ProfileDevice['load']['kind'], string> = {
  steady: 'Steady',
  cycling: 'Cycling',
  cooling: 'Air conditioner',
  measured_energy: 'Meter reading',
}

function defaultScenario(): ProfileScenario {
  return { clientId: newClientId('scn'), name: 'Power outage', kind: 'storm', targetHours: 8, items: [] }
}

export default function MyEnergyClient() {
  const { profile, setProfile, persist, ready, sync, signedIn, notice, setNotice } = useEnergyProfile()
  const [propId, setPropId] = useState<string | null>(null)
  const [scnId, setScnId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [preset, setPreset] = useState<{ name: string; category: ProfileDevice['category']; model: 'cooling'; motor: boolean } | undefined>()
  const [newProp, setNewProp] = useState({ name: 'Home', kind: 'home' as 'home' | 'business', parish: '' })

  const property = profile.properties.find((p) => p.clientId === propId) ?? profile.properties[0] ?? null
  const scenario = property ? property.scenarios.find((s) => s.clientId === scnId) ?? property.scenarios[0] ?? null : null

  function updateProperty(fn: (p: ProfileProperty) => ProfileProperty) {
    if (!property) return
    persist({ ...profile, properties: profile.properties.map((p) => (p.clientId === property.clientId ? fn(p) : p)) })
  }

  function addProperty(override?: { name: string; kind: 'home' | 'business' }) {
    const base = override ?? newProp
    const p: ProfileProperty = { clientId: newClientId('prop'), name: base.name.trim() || 'Home', kind: base.kind, parish: override ? undefined : newProp.parish || undefined, devices: [], scenarios: [defaultScenario()] }
    persist({ ...profile, properties: [...profile.properties, p] })
    setPropId(p.clientId)
    setScnId(null)
  }

  async function removeProperty() {
    if (!property) return
    if (!window.confirm(`Delete “${property.name}” and all its equipment, scenarios and saved results? This cannot be undone.`)) return
    if (signedIn) {
      const res = await fetch(`/api/energy/properties/${encodeURIComponent(property.clientId)}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 404) {
        setNotice('Could not delete that property — please try again.')
        return
      }
    }
    const next = { ...profile, properties: profile.properties.filter((p) => p.clientId !== property.clientId) }
    setPropId(null)
    if (signedIn) setProfile(next)
    else persist(next)
  }

  function addDevice(d: ProfileDevice) {
    if (property?.devices.some((x) => x.clientId === d.clientId)) {
      updateProperty((p) => ({ ...p, devices: p.devices.map((x) => (x.clientId === d.clientId ? d : x)) }))
      setEditing(null)
      return
    }
    updateProperty((p) => ({
      ...p,
      devices: [...p.devices, d],
      scenarios: p.scenarios.map((s) => (s.clientId === scenario?.clientId ? { ...s, items: [...s.items, { deviceClientId: d.clientId, simultaneous: true, essential: true }] } : s)),
    }))
    setAdding(false)
    setPreset(undefined)
  }

  function quickAdd(key: string) {
    if (key === 'ac') {
      setPreset({ name: 'Air conditioner', category: 'cooling', model: 'cooling', motor: true })
      setEditing(null)
      setAdding(true)
      return
    }
    const d = quickAddDevice(key)
    if (d) addDevice(d)
  }

  function removeDevice(id: string) {
    updateProperty((p) => {
      const devices = p.devices.filter((d) => d.clientId !== id)
      return { ...p, devices, scenarios: p.scenarios.map((s) => pruneScenario(s, devices)) }
    })
  }

  function updateScenario(fn: (s: ProfileScenario) => ProfileScenario) {
    if (!scenario) return
    updateProperty((p) => ({ ...p, scenarios: p.scenarios.map((s) => (s.clientId === scenario.clientId ? fn(s) : s)) }))
  }

  function toggleItem(deviceId: string, key: 'included' | 'simultaneous' | 'essential', value: boolean) {
    updateScenario((s) => {
      const existing = s.items.find((i) => i.deviceClientId === deviceId)
      if (key === 'included') {
        return { ...s, items: value ? (existing ? s.items : [...s.items, { deviceClientId: deviceId, simultaneous: true, essential: true }]) : s.items.filter((i) => i.deviceClientId !== deviceId) }
      }
      return { ...s, items: s.items.map((i) => (i.deviceClientId === deviceId ? { ...i, [key]: value } : i)) }
    })
  }

  function addScenario() {
    const name = window.prompt('Name this scenario (e.g. Workday, Overnight)')
    if (!name?.trim()) return
    const s: ProfileScenario = { clientId: newClientId('scn'), name: name.trim().slice(0, 60), kind: 'custom', items: property?.devices.map((d) => ({ deviceClientId: d.clientId, simultaneous: true, essential: true })) ?? [] }
    updateProperty((p) => ({ ...p, scenarios: [...p.scenarios, s] }))
    setScnId(s.clientId)
  }

  if (!ready) return <p style={muted}>Loading your energy profile…</p>

  const SyncIcon = signedIn ? Cloud : HardDrive
  const syncText: Record<ProfileSync, string> = {
    local: 'Saved in this browser only',
    loading: 'Loading your account…',
    saving: 'Saving to your account…',
    saved: 'Saved to your account',
    error: 'Not saved to your account',
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span role="status" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, ...muted }}>
          <SyncIcon size={16} aria-hidden /> {syncText[sync]}
        </span>
        {!signedIn && (
          <span style={muted}>
            <Link href="/login?callbackUrl=/my-energy" style={{ color: 'var(--ke-green-400)' }}>Sign in</Link> to keep this profile on your account — what you’ve entered here will be merged, not duplicated.
          </span>
        )}
      </div>
      {notice && <p role="status" style={{ ...card, padding: 14, margin: 0, ...muted }}>{notice}</p>}
      {ready && <EnergyOverview profile={profile} />}

      {profile.properties.length === 0 && (
        <section style={{ ...card, display: 'grid', gap: 12, borderColor: 'var(--ke-green-500)' }} aria-labelledby="start-title">
          <h2 id="start-title" style={h2}>Start here</h2>
          <p style={{ ...muted, margin: 0 }}>Create your first property, then add what you run. It takes about two minutes, and nothing needs an account.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Btn onClick={() => addProperty({ name: 'Home', kind: 'home' })}>Start with my home</Btn>
            <Btn variant="ghost" onClick={() => addProperty({ name: 'My business', kind: 'business' })}>Start with my business</Btn>
          </div>
        </section>
      )}

      {/* Properties */}
      <section id="properties" style={{ ...card, display: 'grid', gap: 14, scrollMarginTop: 84 }} aria-labelledby="props-title">
        <h2 id="props-title" style={h2}>Your properties</h2>
        {profile.properties.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {profile.properties.map((p) => (
              <Btn key={p.clientId} variant={p.clientId === property?.clientId ? 'primary' : 'ghost'} onClick={() => { setPropId(p.clientId); setScnId(null) }}>
                {p.name}
              </Btn>
            ))}
            {property && (
              <Btn variant="danger" onClick={removeProperty} ariaLabel={`Delete ${property.name}`}>
                <Trash2 size={14} aria-hidden /> Delete
              </Btn>
            )}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10, alignItems: 'end' }}>
          <div>
            <label htmlFor="p-name" style={label}>Name</label>
            <input id="p-name" style={input} value={newProp.name} onChange={(e) => setNewProp({ ...newProp, name: e.target.value })} />
          </div>
          <div>
            <label htmlFor="p-kind" style={label}>Type</label>
            <select id="p-kind" style={input} value={newProp.kind} onChange={(e) => setNewProp({ ...newProp, kind: e.target.value as 'home' | 'business' })}>
              <option value="home">Home</option>
              <option value="business">Business</option>
            </select>
          </div>
          <div>
            <label htmlFor="p-parish" style={label}>Parish (optional)</label>
            <select id="p-parish" style={input} value={newProp.parish} onChange={(e) => setNewProp({ ...newProp, parish: e.target.value })}>
              <option value="">—</option>
              {PARISHES.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <Btn variant="ghost" onClick={() => addProperty()} disabled={profile.properties.length >= 10}>
            <Plus size={14} aria-hidden /> Add property
          </Btn>
        </div>
      </section>

      {property && (
        <>
          {/* Equipment */}
          <section style={{ ...card, display: 'grid', gap: 12 }} aria-labelledby="dev-title">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h2 id="dev-title" style={h2}>Equipment at {property.name}</h2>
              {!adding && (
                <Btn onClick={() => { setEditing(null); setPreset(undefined); setAdding(true) }}>
                  <Plus size={14} aria-hidden /> Add equipment
                </Btn>
              )}
            </div>
            <p style={{ ...muted, margin: 0 }}>Enter each item once. Every tool — backup planning, storm preparation, solar readiness — reads this same list.</p>
            <div style={{ display: 'grid', gap: 8 }}>
              <span style={{ ...muted, fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Zap size={14} aria-hidden /> Quick add — uses typical figures marked “Assumed”. Edit each one with your label reading to narrow the result.
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {QUICK_ITEMS.map((q) => (
                  <Btn key={q.key} variant="ghost" onClick={() => quickAdd(q.key)} ariaLabel={`Quick add ${q.name}`}>
                    <Plus size={13} aria-hidden /> {q.name}
                  </Btn>
                ))}
                <Btn variant="ghost" onClick={() => quickAdd('ac')} ariaLabel="Add an air conditioner">
                  <Plus size={13} aria-hidden /> Air conditioner (needs label)
                </Btn>
              </div>
            </div>
            {property.devices.length === 0 && !adding && <p style={muted}>No equipment yet.</p>}
            {property.devices.map((d) => {
              const bases = Object.values(d.load).filter((v): v is { value: number; basis: 'measured' } => typeof v === 'object' && v !== null && 'basis' in v).map((v) => v.basis)
              return (
                <div key={d.clientId} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--ke-dark-hairline)' }}>
                  <span style={{ color: '#fff' }}>
                    {d.quantity > 1 ? `${d.quantity} × ` : ''}
                    {d.name} <span style={{ ...muted, fontSize: 12 }}>· {MODEL_TEXT[d.load.kind]}</span>
                  </span>
                  <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {[...new Set(bases)].map((b) => (
                      <BasisChip key={b} basis={b} />
                    ))}
                    <Btn variant="ghost" onClick={() => { setAdding(false); setEditing(d.clientId) }} ariaLabel={`Edit ${d.name}`}>
                      <Pencil size={14} aria-hidden />
                    </Btn>
                    <Btn variant="danger" onClick={() => removeDevice(d.clientId)} ariaLabel={`Remove ${d.name}`}>
                      <Trash2 size={14} aria-hidden />
                    </Btn>
                  </span>
                </div>
              )
            })}
          </section>
          {adding && <DeviceForm key={preset?.name ?? 'new'} preset={preset} onAdd={addDevice} onCancel={() => { setAdding(false); setPreset(undefined) }} />}
          {editing && property.devices.some((d) => d.clientId === editing) && (
            <DeviceForm key={editing} initial={property.devices.find((d) => d.clientId === editing)} onAdd={addDevice} onCancel={() => setEditing(null)} />
          )}

          {/* Scenario */}
          {scenario && (
            <section style={{ ...card, display: 'grid', gap: 14 }} aria-labelledby="scn-title">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <h2 id="scn-title" style={h2}>Scenario</h2>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {property.scenarios.map((s) => (
                    <Btn key={s.clientId} variant={s.clientId === scenario.clientId ? 'primary' : 'ghost'} onClick={() => setScnId(s.clientId)}>
                      {s.name}
                    </Btn>
                  ))}
                  <Btn variant="ghost" onClick={addScenario} disabled={property.scenarios.length >= 30}>
                    <Plus size={14} aria-hidden /> New scenario
                  </Btn>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
                <div>
                  <label htmlFor="s-target" style={label}>Target runtime (hours)</label>
                  <input
                    id="s-target"
                    inputMode="decimal"
                    style={input}
                    value={scenario.targetHours ?? ''}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      updateScenario((s) => ({ ...s, targetHours: e.target.value === '' || !(v > 0) ? undefined : Math.min(v, 336) }))
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="s-reserve" style={label}>Keep in reserve (%)</label>
                  <input
                    id="s-reserve"
                    inputMode="numeric"
                    style={input}
                    value={scenario.reserveFraction != null ? Math.round(scenario.reserveFraction * 100) : ''}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      updateScenario((s) => ({ ...s, reserveFraction: e.target.value === '' || !(v >= 0) ? undefined : Math.min(v, 90) / 100 }))
                    }}
                  />
                </div>
              </div>
              {property.devices.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', ...muted }}>
                      <th style={{ padding: '6px 4px', fontWeight: 600 }}>Equipment</th>
                      <th style={{ padding: '6px 4px', fontWeight: 600 }}>Include</th>
                      <th style={{ padding: '6px 4px', fontWeight: 600 }}>On at the same time</th>
                      <th style={{ padding: '6px 4px', fontWeight: 600 }}>Essential</th>
                    </tr>
                  </thead>
                  <tbody>
                    {property.devices.map((d) => {
                      const item = scenario.items.find((i) => i.deviceClientId === d.clientId)
                      return (
                        <tr key={d.clientId} style={{ borderTop: '1px solid var(--ke-dark-hairline)' }}>
                          <td style={{ padding: '8px 4px', color: '#fff' }}>{d.name}</td>
                          <td style={{ padding: '8px 4px' }}>
                            <input type="checkbox" aria-label={`Include ${d.name}`} checked={!!item} onChange={(e) => toggleItem(d.clientId, 'included', e.target.checked)} />
                          </td>
                          <td style={{ padding: '8px 4px' }}>
                            <input type="checkbox" aria-label={`${d.name} on at the same time`} disabled={!item} checked={!!item?.simultaneous} onChange={(e) => toggleItem(d.clientId, 'simultaneous', e.target.checked)} />
                          </td>
                          <td style={{ padding: '8px 4px' }}>
                            <input type="checkbox" aria-label={`${d.name} essential`} disabled={!item} checked={!!item?.essential} onChange={(e) => toggleItem(d.clientId, 'essential', e.target.checked)} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </section>
          )}

          {scenario && <ScenarioResults property={property} scenario={scenario} signedIn={signedIn} />}
        </>
      )}
    </div>
  )
}
