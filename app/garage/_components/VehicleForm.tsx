'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Search, ScanLine, PenLine, Zap, Fuel, Leaf } from 'lucide-react'
import { newClientId } from '@/lib/energy/profileSchema'
import {
  AC_INLETS,
  BODY_LABEL,
  BODY_STYLES,
  DC_INLETS,
  PAINT,
  POWERTRAIN_LABEL,
  SPEC_BASIS_LABEL,
  plugsIn,
  vehicleSchema,
  type BodyStyle,
  type Powertrain,
  type Spec,
  type Vehicle,
} from '@/lib/vehicles/vehicle'
import type { EpaVehicle, MenuItem, VinDecode } from '@/lib/vehicles/lookup'
import { card, label, input, muted, h2, Btn } from '@/app/my-energy/_components/ui'

import DesignNote from '@/components/garage/DesignNote'
import { designFor } from '@/lib/vehicles/designs'
const VehicleModel3D = dynamic(() => import('@/components/garage/VehicleModel3D'), { ssr: false, loading: () => <div style={{ height: 300 }} /> })

type SpecKey = keyof Vehicle['specs']
type LookupResult = Pick<EpaVehicle, 'make' | 'model' | 'year' | 'trim' | 'powertrain' | 'specs'> & { bodyStyle: BodyStyle | null }
const SPEC_FIELDS: { key: SpecKey; label: string; unit: string; when: (p: Powertrain) => boolean; hint?: string }[] = [
  { key: 'batteryKwh', label: 'Battery size', unit: 'kWh', when: plugsIn, hint: 'On the spec sheet or the charging screen' },
  { key: 'rangeKm', label: 'Electric range', unit: 'km', when: plugsIn },
  { key: 'kwhPer100km', label: 'Energy use', unit: 'kWh per 100 km', when: plugsIn, hint: 'Your trip computer often shows this' },
  { key: 'litresPer100km', label: 'Petrol use', unit: 'L per 100 km', when: (p) => p !== 'bev' },
  { key: 'acChargeKw', label: 'Home / AC charging speed', unit: 'kW', when: plugsIn, hint: 'Onboard charger, e.g. 3.6, 6.6, 7.2 or 11' },
  { key: 'dcChargeKw', label: 'Fast-charging speed', unit: 'kW', when: (p) => p === 'bev' },
  { key: 'v2lKw', label: 'Powers appliances (V2L)', unit: 'kW', when: plugsIn, hint: 'Only if your car has a vehicle-to-load socket' },
]

export default function VehicleForm({ initial, onSave, onCancel }: { initial: Vehicle | null; onSave: (v: Vehicle) => void; onCancel: () => void }) {
  const [v, setV] = useState<Vehicle>(
    initial ?? { clientId: newClientId('veh'), powertrain: 'bev', make: '', model: '', bodyStyle: 'hatchback', colour: PAINT[5].hex, specs: {}, primary: false },
  )
  const [step, setStep] = useState<'type' | 'find' | 'details'>(initial ? 'details' : 'type')
  const [error, setError] = useState<string | null>(null)
  // Text the visitor is typing for each spec, so “6.” isn't swallowed while typing.
  const [draft, setDraft] = useState<Partial<Record<SpecKey, string>>>(() => Object.fromEntries(Object.entries(initial?.specs ?? {}).map(([k, s]) => [k, String((s as Spec).value)])))

  const set = (patch: Partial<Vehicle>) => setV((x) => ({ ...x, ...patch }))
  // When we know this model's design, its body style follows (still editable).
  const design = designFor(v.make, v.model, v.year)
  useEffect(() => {
    if (design) setV((x) => (x.bodyStyle === design.bodyStyle ? x : { ...x, bodyStyle: design.bodyStyle }))
  }, [design?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const setSpec = (key: SpecKey, text: string) => {
    setDraft((d) => ({ ...d, [key]: text }))
    const n = Number(text.replace(',', '.'))
    setV((x) => {
      const specs = { ...x.specs }
      if (text.trim() && Number.isFinite(n) && n > 0) specs[key] = { value: n, basis: x.specs[key]?.value === n ? x.specs[key]!.basis : 'customer_entered' }
      else delete specs[key]
      return { ...x, specs }
    })
  }
  function applyLookup(found: LookupResult, source: Vehicle['source']) {
    setV((x) => ({
      ...x,
      make: found.make,
      model: found.model,
      year: found.year ?? undefined,
      trim: found.trim ?? undefined,
      powertrain: found.powertrain ?? x.powertrain,
      bodyStyle: found.bodyStyle ?? x.bodyStyle,
      specs: { ...x.specs, ...found.specs },
      source,
    }))
    setDraft((d) => ({ ...d, ...Object.fromEntries(Object.entries(found.specs).map(([k, s]) => [k, String((s as Spec).value)])) }))
    setStep('details')
  }

  function submit() {
    const parsed = vehicleSchema.safeParse({ ...v, make: v.make.trim(), model: v.model.trim(), nickname: v.nickname?.trim() || undefined, vin: v.vin?.trim() || undefined })
    if (!parsed.success) {
      const i = parsed.error.issues[0]
      setError(i.path[0] === 'make' || i.path[0] === 'model' ? 'Add the make and model.' : i.path[0] === 'vin' ? 'That VIN doesn’t look right (17 characters, no I, O or Q).' : `Check ${String(i.path.join(' '))}.`)
      return
    }
    // Hybrids don't plug in: drop electric-only fields and ports.
    const out = parsed.data
    if (!plugsIn(out.powertrain)) {
      out.acInlet = undefined
      out.dcInlet = undefined
      out.homeCharging = undefined
      out.specs = out.specs.litresPer100km ? { litresPer100km: out.specs.litresPer100km } : {}
    } else if (out.powertrain === 'phev') delete out.specs.dcChargeKw
    onSave(out)
  }

  return (
    <section style={{ ...card, display: 'grid', gap: 18 }} aria-labelledby="vf-title">
      <style>{CSS}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <h2 id="vf-title" style={h2}>
          {initial ? `Edit ${initial.nickname || `${initial.make} ${initial.model}`}` : 'Add a vehicle'}
        </h2>
        <ol className="ke-vf-steps" aria-label="Steps">
          {(['type', 'find', 'details'] as const).map((s, i) => (
            <li key={s} aria-current={step === s ? 'step' : undefined}>
              {i + 1}. {s === 'type' ? 'Type' : s === 'find' ? 'Find it' : 'Details'}
            </li>
          ))}
        </ol>
      </div>

      {step === 'type' && (
        <div className="ke-vf-types" role="radiogroup" aria-label="What kind of vehicle?">
          {(['bev', 'phev', 'hev'] as const).map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={v.powertrain === p}
              onClick={() => {
                set({ powertrain: p })
                setStep('find')
              }}
            >
              {p === 'bev' ? <Zap size={22} aria-hidden /> : p === 'phev' ? <Leaf size={22} aria-hidden /> : <Fuel size={22} aria-hidden />}
              <strong>{POWERTRAIN_LABEL[p]}</strong>
              <span>{p === 'bev' ? 'Runs only on electricity — Leaf, BYD, MG4, Tesla…' : p === 'phev' ? 'Plugs in, with a petrol engine too' : 'Petrol with a battery that charges itself — Prius, Aqua, Fit Hybrid…'}</span>
            </button>
          ))}
        </div>
      )}

      {step === 'find' && <Finder powertrain={v.powertrain} onFound={applyLookup} onManual={() => setStep('details')} onBack={() => setStep('type')} />}

      {step === 'details' && (
        <div className="ke-vf-grid">
          <div className="ke-vf-preview">
            <VehicleModel3D bodyStyle={v.bodyStyle} colour={v.colour} powertrain={v.powertrain} make={v.make} model={v.model} year={v.year} height={300} />
            <div className="ke-vf-paint" role="group" aria-label="Paint colour">
              {PAINT.map((p) => (
                <button key={p.hex} type="button" title={p.name} aria-label={p.name} aria-pressed={v.colour.toLowerCase() === p.hex} onClick={() => set({ colour: p.hex })} style={{ background: p.hex }} />
              ))}
              <label className="ke-vf-custom" title="Any colour">
                <input type="color" value={v.colour} onChange={(e) => set({ colour: e.target.value })} aria-label="Pick any colour" />
              </label>
            </div>
            <DesignNote make={v.make} model={v.model} year={v.year} bodyStyle={v.bodyStyle} />
            {v.source && v.source.kind !== 'manual' && <p style={{ ...muted, fontSize: 12, textAlign: 'center', margin: 0 }}>Filled in from {v.source.kind === 'epa' ? 'the US EPA list' : 'your VIN'} — check and correct anything that differs on your car.</p>}
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            <div className="ke-vf-row">
              <Field id="vf-make" label="Make" value={v.make} onChange={(s) => set({ make: s })} placeholder="e.g. Nissan" />
              <Field id="vf-model" label="Model" value={v.model} onChange={(s) => set({ model: s })} placeholder="e.g. Leaf" />
            </div>
            <div className="ke-vf-row">
              <Field id="vf-year" label="Year" value={v.year ? String(v.year) : ''} onChange={(s) => set({ year: s ? Number(s.replace(/\D/g, '').slice(0, 4)) || undefined : undefined })} inputMode="numeric" />
              <Field id="vf-nick" label="Nickname (optional)" value={v.nickname ?? ''} onChange={(s) => set({ nickname: s })} placeholder="e.g. The blue one" />
            </div>
            <div className="ke-vf-row">
              <div>
                <label htmlFor="vf-type" style={label}>Type</label>
                <select id="vf-type" style={input} value={v.powertrain} onChange={(e) => set({ powertrain: e.target.value as Powertrain })}>
                  {(['bev', 'phev', 'hev'] as const).map((p) => (
                    <option key={p} value={p}>{POWERTRAIN_LABEL[p]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="vf-body" style={label}>Body style</label>
                <select id="vf-body" style={input} value={v.bodyStyle} onChange={(e) => set({ bodyStyle: e.target.value as BodyStyle })}>
                  {BODY_STYLES.map((b) => (
                    <option key={b} value={b}>{BODY_LABEL[b]}</option>
                  ))}
                </select>
              </div>
            </div>

            {plugsIn(v.powertrain) && (
              <div className="ke-vf-row">
                <div>
                  <label htmlFor="vf-ac" style={label}>Charging port</label>
                  <select id="vf-ac" style={input} value={v.acInlet ?? ''} onChange={(e) => set({ acInlet: (e.target.value || undefined) as Vehicle['acInlet'] })}>
                    <option value="">Not sure</option>
                    {AC_INLETS.map((x) => (
                      <option key={x} value={x}>{x}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="vf-dc" style={label}>Fast-charge port</label>
                  <select id="vf-dc" style={input} value={v.dcInlet ?? ''} onChange={(e) => set({ dcInlet: (e.target.value || undefined) as Vehicle['dcInlet'] })}>
                    <option value="">None / not sure</option>
                    {DC_INLETS.map((x) => (
                      <option key={x} value={x}>{x}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            {plugsIn(v.powertrain) && <p style={{ ...muted, fontSize: 12.5, margin: '-4px 0 0' }}>Look at the charging flap: J1772 has five round pins; Type 2 has seven with a flat top; CCS adds two big pins underneath; CHAdeMO is a separate large round socket.</p>}

            <fieldset className="ke-vf-specs">
              <legend>Specs <span>(leave blank if you don’t know — we never guess them)</span></legend>
              {SPEC_FIELDS.filter((f) => f.when(v.powertrain)).map((f) => (
                <div key={f.key}>
                  <label htmlFor={`vf-${f.key}`} style={label}>
                    {f.label} <span style={{ fontWeight: 400, color: 'var(--ke-dark-text-muted)' }}>({f.unit})</span>
                  </label>
                  <input id={`vf-${f.key}`} style={input} inputMode="decimal" value={draft[f.key] ?? ''} placeholder={f.hint} onChange={(e) => setSpec(f.key, e.target.value.replace(/[^\d.,]/g, ''))} />
                  {v.specs[f.key] && <small className="ke-vf-basis">{SPEC_BASIS_LABEL[v.specs[f.key]!.basis]}</small>}
                </div>
              ))}
            </fieldset>

            <div className="ke-vf-row">
              <Field id="vf-km" label="Kilometres a week (about)" value={v.kmPerWeek != null ? String(v.kmPerWeek) : ''} onChange={(s) => set({ kmPerWeek: s ? Number(s.replace(/\D/g, '')) : undefined })} inputMode="numeric" />
              {plugsIn(v.powertrain) && (
                <div>
                  <label htmlFor="vf-home" style={label}>Charging at home</label>
                  <select id="vf-home" style={input} value={v.homeCharging ?? ''} onChange={(e) => set({ homeCharging: (e.target.value || undefined) as Vehicle['homeCharging'] })}>
                    <option value="">Not set</option>
                    <option value="none">I don’t charge at home</option>
                    <option value="wall_outlet">Ordinary wall socket</option>
                    <option value="level2">Wall charger (Level 2)</option>
                  </select>
                </div>
              )}
            </div>
            <label style={{ ...muted, display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={v.primary} onChange={(e) => set({ primary: e.target.checked })} /> This is my main vehicle (tools use it by default)
            </label>

            {error && <p role="alert" style={{ ...muted, color: '#f6a5a5', margin: 0 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Btn onClick={submit}>Save to my garage</Btn>
              {!initial && (
                <Btn variant="ghost" onClick={() => setStep('find')}>
                  Look it up again
                </Btn>
              )}
              <Btn variant="ghost" onClick={onCancel}>
                Cancel
              </Btn>
            </div>
          </div>
        </div>
      )}

      {step !== 'details' && (
        <div>
          <Btn variant="ghost" onClick={onCancel}>
            Cancel
          </Btn>
        </div>
      )}
    </section>
  )
}

function Field({ id, label: l, value, onChange, placeholder, inputMode }: { id: string; label: string; value: string; onChange: (s: string) => void; placeholder?: string; inputMode?: 'numeric' | 'decimal' }) {
  return (
    <div>
      <label htmlFor={id} style={label}>{l}</label>
      <input id={id} style={input} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} inputMode={inputMode} />
    </div>
  )
}

/** Step 2: US EPA list (year → make → model → version), VIN decode, or manual. */
function Finder({ powertrain, onFound, onManual, onBack }: { powertrain: Powertrain; onFound: (f: LookupResult, s: Vehicle['source']) => void; onManual: () => void; onBack: () => void }) {
  const [mode, setMode] = useState<'epa' | 'vin'>('epa')
  const [years, setYears] = useState<MenuItem[]>([])
  const [makes, setMakes] = useState<MenuItem[]>([])
  const [models, setModels] = useState<MenuItem[]>([])
  const [options, setOptions] = useState<MenuItem[]>([])
  const [sel, setSel] = useState({ year: '', make: '', model: '' })
  const [vin, setVin] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const menu = async (qs: string): Promise<MenuItem[]> => {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/vehicles/epa?${qs}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      return j.items
    } catch (e) {
      setMsg((e as Error).message || 'The EPA list isn’t available right now.')
      return []
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => {
    if (mode === 'epa' && !years.length) menu('step=years').then(setYears)
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  async function pickVersion(id: string) {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/vehicles/epa?id=${encodeURIComponent(id)}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      const ev: EpaVehicle = j.vehicle
      if (!ev.powertrain) {
        setMsg('The EPA lists this version as petrol or diesel only. Pick the electric or hybrid version, or enter the details yourself.')
        return
      }
      onFound(ev, { kind: 'epa', ref: ev.id, retrievedAt: new Date().toISOString().slice(0, 10) })
    } catch (e) {
      setMsg((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function decode() {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/vehicles/vin/${encodeURIComponent(vin.trim())}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      const d: VinDecode = j.vehicle
      onFound(d, { kind: 'vin', retrievedAt: new Date().toISOString().slice(0, 10) })
    } catch (e) {
      setMsg((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="ke-vf-modes" role="tablist" aria-label="How to find your car">
        <button role="tab" aria-selected={mode === 'epa'} onClick={() => setMode('epa')}>
          <Search size={15} aria-hidden /> Search the US EPA list
        </button>
        <button role="tab" aria-selected={mode === 'vin'} onClick={() => setMode('vin')}>
          <ScanLine size={15} aria-hidden /> Use my VIN
        </button>
        <button role="tab" aria-selected={false} onClick={onManual}>
          <PenLine size={15} aria-hidden /> Enter it myself
        </button>
      </div>

      {mode === 'epa' ? (
        <div style={{ display: 'grid', gap: 10 }}>
          <p style={{ ...muted, margin: 0 }}>US-market cars from 2011 on, with the EPA’s tested energy use and range. Japanese-market imports (Aqua, Note e-Power…) usually aren’t listed — enter those yourself.</p>
          <div className="ke-vf-row4">
            <Select id="f-year" label="Year" items={years} value={sel.year} disabled={busy && !years.length} onChange={async (year) => {
              setSel({ year, make: '', model: '' })
              setModels([])
              setOptions([])
              setMakes(year ? await menu(`step=makes&year=${year}`) : [])
            }} />
            <Select id="f-make" label="Make" items={makes} value={sel.make} disabled={!sel.year} onChange={async (make) => {
              setSel((x) => ({ ...x, make, model: '' }))
              setOptions([])
              setModels(make ? await menu(`step=models&year=${sel.year}&make=${encodeURIComponent(make)}`) : [])
            }} />
            <Select id="f-model" label="Model" items={models} value={sel.model} disabled={!sel.make} onChange={async (model) => {
              setSel((x) => ({ ...x, model }))
              setOptions(model ? await menu(`step=options&year=${sel.year}&make=${encodeURIComponent(sel.make)}&model=${encodeURIComponent(model)}`) : [])
            }} />
            <Select id="f-opt" label="Version" items={options} value="" disabled={!sel.model} onChange={(id) => id && pickVersion(id)} />
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10, maxWidth: 520 }}>
          <p style={{ ...muted, margin: 0 }}>The 17-character VIN is on the dashboard by the windscreen, the driver’s door pillar, or your registration. Decoded by the US NHTSA; we don’t keep the VIN unless you save it.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input aria-label="VIN" style={{ ...input, fontFamily: 'var(--font-mono)', letterSpacing: '.08em' }} maxLength={17} value={vin} onChange={(e) => setVin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="17 characters" />
            <Btn onClick={decode} disabled={busy || vin.length !== 17}>
              Decode
            </Btn>
          </div>
        </div>
      )}
      {busy && <p role="status" style={{ ...muted, margin: 0 }}>Looking it up…</p>}
      {msg && (
        <p role="alert" style={{ ...muted, color: '#f6c66b', margin: 0 }}>
          {msg}{' '}
          <button type="button" onClick={onManual} style={{ background: 'none', border: 0, color: 'var(--ke-green-400)', cursor: 'pointer', padding: 0, fontWeight: 600 }}>
            Enter it myself →
          </button>
        </p>
      )}
      <div>
        <Btn variant="ghost" onClick={onBack}>
          ← Back
        </Btn>
      </div>
    </div>
  )
}

function Select({ id, label: l, items, value, onChange, disabled }: { id: string; label: string; items: MenuItem[]; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div>
      <label htmlFor={id} style={label}>{l}</label>
      <select id={id} style={input} value={value} disabled={disabled || !items.length} onChange={(e) => onChange(e.target.value)}>
        <option value="">{items.length ? 'Choose…' : '—'}</option>
        {items.map((i) => (
          <option key={i.value} value={i.value}>{i.text}</option>
        ))}
      </select>
    </div>
  )
}

const CSS = `
.ke-vf-steps{display:flex;gap:12px;list-style:none;margin:0;padding:0;font-size:12.5px;color:var(--ke-dark-text-muted)}
.ke-vf-steps li[aria-current="step"]{color:var(--ke-green-400);font-weight:600}
.ke-vf-types{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.ke-vf-types button{display:grid;gap:8px;justify-items:start;text-align:left;padding:18px;border-radius:16px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);color:var(--ke-dark-text);cursor:pointer}
.ke-vf-types button:hover,.ke-vf-types button[aria-checked="true"]{border-color:var(--ke-green-400);background:rgba(62,207,142,.08)}
.ke-vf-types svg{color:var(--ke-green-400)}
.ke-vf-types strong{font-size:16px;color:#fff;font-family:var(--font-display)}
.ke-vf-types span{font-size:13px;color:var(--ke-dark-text-muted);line-height:1.45}
.ke-vf-modes{display:flex;gap:8px;flex-wrap:wrap}
.ke-vf-modes button{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:transparent;color:var(--ke-dark-text);cursor:pointer;font-size:14px}
.ke-vf-modes button[aria-selected="true"]{border-color:var(--ke-green-400);background:rgba(62,207,142,.1)}
.ke-vf-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:20px;align-items:start}
.ke-vf-preview{position:sticky;top:84px;display:grid;gap:8px;border-radius:18px;border:1px solid var(--ke-dark-hairline);background:radial-gradient(110% 80% at 50% 95%,rgba(62,207,142,.14),transparent 55%),#101614;padding-bottom:12px}
.ke-vf-paint{display:flex;gap:7px;flex-wrap:wrap;justify-content:center;padding:0 12px}
.ke-vf-paint button{width:24px;height:24px;border-radius:50%;border:2px solid rgba(255,255,255,.25);cursor:pointer;padding:0}
.ke-vf-paint button[aria-pressed="true"]{border-color:#fff;box-shadow:0 0 0 2px var(--ke-green-400)}
.ke-vf-custom{width:24px;height:24px;border-radius:50%;overflow:hidden;border:2px dashed rgba(255,255,255,.4);position:relative;cursor:pointer}
.ke-vf-custom input{position:absolute;inset:-6px;width:40px;height:40px;border:0;padding:0;cursor:pointer;opacity:.9}
.ke-vf-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ke-vf-row4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.ke-vf-specs{border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:12px 14px 14px;margin:0;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ke-vf-specs legend{padding:0 6px;font-family:var(--font-display);font-weight:600;font-size:13px;color:#fff}
.ke-vf-specs legend span{font-weight:400;color:var(--ke-dark-text-muted)}
.ke-vf-basis{display:block;margin-top:4px;font-size:11.5px;color:var(--ke-dark-text-muted)}
@media (max-width:860px){.ke-vf-grid{grid-template-columns:1fr}.ke-vf-preview{position:static}.ke-vf-types,.ke-vf-row4{grid-template-columns:1fr 1fr}}
@media (max-width:520px){.ke-vf-types,.ke-vf-row,.ke-vf-row4,.ke-vf-specs{grid-template-columns:1fr}}
`
