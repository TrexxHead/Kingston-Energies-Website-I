'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Plus, Trash2, Cloud, HardDrive } from 'lucide-react'
import { PARISHES } from '@/lib/map/parishes'
import { EMPTY_PROFILE, newClientId, pruneScenario, type EnergyProfile, type ProfileDevice, type ProfileProperty, type ProfileScenario } from '@/lib/energy/profileSchema'
import { loadLocalProfile, saveLocalProfile, clearLocalProfile } from '@/lib/energy/localProfile'
import DeviceForm from './DeviceForm'
import ScenarioResults from './ScenarioResults'
import { card, label, input, muted, h2, Btn, BasisChip } from './ui'

type Sync = 'local' | 'loading' | 'saving' | 'saved' | 'error'

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
  const { status } = useSession()
  const signedIn = status === 'authenticated'
  const [profile, setProfile] = useState<EnergyProfile>(EMPTY_PROFILE)
  const [ready, setReady] = useState(false)
  const [sync, setSync] = useState<Sync>('local')
  const [notice, setNotice] = useState<string | null>(null)
  const [propId, setPropId] = useState<string | null>(null)
  const [scnId, setScnId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newProp, setNewProp] = useState({ name: 'Home', kind: 'home' as 'home' | 'business', parish: '' })
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load: anonymous → browser storage; signed in → merge anything local into the account, then use the account copy.
  useEffect(() => {
    if (status === 'loading') return
    let cancelled = false
    async function load() {
      const local = loadLocalProfile()
      if (status !== 'authenticated') {
        setProfile(local)
        setSync('local')
        setReady(true)
        return
      }
      setSync('loading')
      try {
        const res = local.properties.length
          ? await fetch('/api/energy/profile/merge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ local }) })
          : await fetch('/api/energy/profile', { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        if (cancelled) return
        if (local.properties.length) {
          clearLocalProfile()
          const a = data.added
          setNotice(`Saved this browser’s profile to your account (${a.devices} new device${a.devices === 1 ? '' : 's'}${data.skippedDuplicates ? `, ${data.skippedDuplicates} duplicate${data.skippedDuplicates === 1 ? '' : 's'} skipped` : ''}).`)
        }
        setProfile(data.profile)
        setSync('saved')
      } catch {
        if (cancelled) return
        setProfile(local)
        setSync('error')
        setNotice('Could not reach your account — changes are kept in this browser for now.')
      }
      setReady(true)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [status])

  const persist = useCallback(
    (next: EnergyProfile) => {
      setProfile(next)
      if (!signedIn) {
        saveLocalProfile(next)
        return
      }
      setSync('saving')
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        try {
          const res = await fetch('/api/energy/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
          setSync(res.ok ? 'saved' : 'error')
        } catch {
          setSync('error')
        }
      }, 700)
    },
    [signedIn],
  )

  const property = profile.properties.find((p) => p.clientId === propId) ?? profile.properties[0] ?? null
  const scenario = property ? property.scenarios.find((s) => s.clientId === scnId) ?? property.scenarios[0] ?? null : null

  function updateProperty(fn: (p: ProfileProperty) => ProfileProperty) {
    if (!property) return
    persist({ ...profile, properties: profile.properties.map((p) => (p.clientId === property.clientId ? fn(p) : p)) })
  }

  function addProperty() {
    const p: ProfileProperty = { clientId: newClientId('prop'), name: newProp.name.trim() || 'Home', kind: newProp.kind, parish: newProp.parish || undefined, devices: [], scenarios: [defaultScenario()] }
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
    updateProperty((p) => ({
      ...p,
      devices: [...p.devices, d],
      scenarios: p.scenarios.map((s) => (s.clientId === scenario?.clientId ? { ...s, items: [...s.items, { deviceClientId: d.clientId, simultaneous: true, essential: true }] } : s)),
    }))
    setAdding(false)
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
  const syncText: Record<Sync, string> = {
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

      {/* Properties */}
      <section style={{ ...card, display: 'grid', gap: 14 }} aria-labelledby="props-title">
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
          <Btn variant="ghost" onClick={addProperty} disabled={profile.properties.length >= 10}>
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
                <Btn onClick={() => setAdding(true)}>
                  <Plus size={14} aria-hidden /> Add equipment
                </Btn>
              )}
            </div>
            <p style={{ ...muted, margin: 0 }}>Enter each item once. Every tool — backup planning, storm preparation, solar readiness — reads this same list.</p>
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
                    <Btn variant="danger" onClick={() => removeDevice(d.clientId)} ariaLabel={`Remove ${d.name}`}>
                      <Trash2 size={14} aria-hidden />
                    </Btn>
                  </span>
                </div>
              )
            })}
          </section>
          {adding && <DeviceForm onAdd={addDevice} onCancel={() => setAdding(false)} />}

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
