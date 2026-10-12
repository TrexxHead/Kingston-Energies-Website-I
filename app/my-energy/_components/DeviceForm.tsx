'use client'

import { useState, type FormEvent } from 'react'
import { DEVICE_CATEGORIES, deviceSchema, newClientId, type ProfileDevice } from '@/lib/energy/profileSchema'
import type { EvidenceBasis } from '@/lib/energy/engine/basis'
import { card, label, input, muted, h2, Btn, BASIS_OPTIONS } from './ui'

type ModelKind = ProfileDevice['load']['kind']

const MODEL_OPTIONS: { value: ModelKind; label: string; help: string }[] = [
  { value: 'steady', label: 'Steady load', help: 'Draws about the same power while on — lights, fans, routers, TVs, chargers.' },
  { value: 'cycling', label: 'Cycling (fridge / freezer)', help: 'A compressor that switches on and off. Uses running watts × the share of time it runs.' },
  { value: 'cooling', label: 'Air conditioner', help: 'Needs electrical input watts from the label, or BTU/h plus the EER. BTU/h alone is cooling output, not electricity.' },
  { value: 'measured_energy', label: 'Meter reading (kWh)', help: 'An energy reading from a plug-in meter over a known number of hours. The strongest evidence.' },
]

const CATEGORY_LABEL: Record<(typeof DEVICE_CATEGORIES)[number], string> = {
  cooling: 'Cooling',
  refrigeration: 'Refrigeration',
  water: 'Water heating / pumping',
  lighting: 'Lighting',
  electronics: 'Electronics',
  networking: 'Internet / networking',
  medical: 'Medical',
  motor: 'Motor / pump / tool',
  cooking: 'Cooking',
  other: 'Other',
}

interface NumField {
  value: string
  basis: EvidenceBasis
}
const nf = (basis: EvidenceBasis = 'customer_entered'): NumField => ({ value: '', basis })

function Num({ id, text, f, set, unit, withBasis = true }: { id: string; text: string; f: NumField; set: (f: NumField) => void; unit?: string; withBasis?: boolean }) {
  return (
    <div>
      <label htmlFor={id} style={label}>
        {text} {unit && <span style={{ ...muted, fontSize: 12 }}>({unit})</span>}
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: withBasis ? '1fr 1fr' : '1fr', gap: 8 }}>
        <input id={id} inputMode="decimal" style={input} value={f.value} onChange={(e) => set({ ...f, value: e.target.value })} />
        {withBasis && (
          <select aria-label={`${text} — where this number came from`} style={input} value={f.basis} onChange={(e) => set({ ...f, basis: e.target.value as EvidenceBasis })}>
            {BASIS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}

const ev = (f: NumField) => (f.value.trim() === '' ? undefined : { value: Number(f.value), basis: f.basis })

/** Add one device to the profile. Unknown values stay blank — the engine will ask for them rather than guess. */
export default function DeviceForm({ onAdd, onCancel }: { onAdd: (d: ProfileDevice) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<ProfileDevice['category']>('electronics')
  const [quantity, setQuantity] = useState('1')
  const [model, setModel] = useState<ModelKind>('steady')
  const [watts, setWatts] = useState(nf('manufacturer'))
  const [nameplate, setNameplate] = useState(false)
  const [hours, setHours] = useState(nf())
  const [duty, setDuty] = useState(nf('assumed'))
  const [inputW, setInputW] = useState(nf('manufacturer'))
  const [btu, setBtu] = useState(nf('manufacturer'))
  const [eer, setEer] = useState(nf('manufacturer'))
  const [kwh, setKwh] = useState('')
  const [overHours, setOverHours] = useState('')
  const [motor, setMotor] = useState(false)
  const [startup, setStartup] = useState(nf('manufacturer'))
  const [error, setError] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    let load: unknown
    const h = ev(hours) ?? { value: NaN, basis: hours.basis }
    if (model === 'steady') load = { kind: 'steady', watts: ev(watts), wattsKind: nameplate ? 'nameplate_max' : 'average', hoursPerDay: h }
    if (model === 'cycling') load = { kind: 'cycling', runningWatts: ev(watts), dutyCyclePct: ev(duty) }
    if (model === 'cooling') load = { kind: 'cooling', inputWatts: ev(inputW), capacityBtuh: ev(btu), eer: ev(eer), hoursPerDay: h }
    if (model === 'measured_energy') load = { kind: 'measured_energy', kwh: Number(kwh), overHours: Number(overHours) }
    const candidate = {
      clientId: newClientId('dev'),
      name,
      category,
      quantity: Number(quantity),
      load,
      motorLoad: motor,
      startupWatts: motor ? ev(startup) : undefined,
    }
    const parsed = deviceSchema.safeParse(candidate)
    if (!parsed.success) {
      const path = parsed.error.issues[0]?.path.join(' › ') ?? ''
      setError(`Please check ${path || 'the form'} — every number must be filled in and zero or more.`)
      return
    }
    onAdd(parsed.data)
  }

  const help = MODEL_OPTIONS.find((m) => m.value === model)?.help

  return (
    <form onSubmit={submit} style={{ ...card, display: 'grid', gap: 16 }} aria-labelledby="add-device-title">
      <h3 id="add-device-title" style={h2}>
        Add equipment
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        <div>
          <label htmlFor="dev-name" style={label}>Name</label>
          <input id="dev-name" style={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kitchen fridge" required />
        </div>
        <div>
          <label htmlFor="dev-cat" style={label}>Category</label>
          <select id="dev-cat" style={input} value={category} onChange={(e) => setCategory(e.target.value as ProfileDevice['category'])}>
            {DEVICE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="dev-qty" style={label}>How many</label>
          <input id="dev-qty" inputMode="numeric" style={input} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>
      </div>

      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={label}>How it uses power</legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {MODEL_OPTIONS.map((o) => (
            <label key={o.value} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 999, border: model === o.value ? '1.5px solid var(--ke-green-400)' : '1px solid rgba(255,255,255,.18)', cursor: 'pointer', fontSize: 13 }}>
              <input type="radio" name="model" value={o.value} checked={model === o.value} onChange={() => setModel(o.value)} />
              {o.label}
            </label>
          ))}
        </div>
        {help && <p style={{ ...muted, margin: '8px 0 0' }}>{help}</p>}
      </fieldset>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12 }}>
        {model === 'steady' && (
          <>
            <Num id="dev-w" text="Power while on" unit="W" f={watts} set={setWatts} />
            <Num id="dev-h" text="Hours on per day" unit="h" f={hours} set={setHours} />
            <label style={{ ...muted, display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={nameplate} onChange={(e) => setNameplate(e.target.checked)} /> The watts figure is the label’s maximum, not a measured average
            </label>
          </>
        )}
        {model === 'cycling' && (
          <>
            <Num id="dev-rw" text="Running watts (compressor on)" unit="W" f={watts} set={setWatts} />
            <Num id="dev-duty" text="Share of time the compressor runs" unit="%" f={duty} set={setDuty} />
            <p style={{ ...muted, margin: 0 }}>Unsure? Many household fridges run 35–60% of the time depending on age and seals — mark it “Assumed” so the result shows the uncertainty.</p>
          </>
        )}
        {model === 'cooling' && (
          <>
            <Num id="dev-in" text="Electrical input" unit="W" f={inputW} set={setInputW} />
            <Num id="dev-btu" text="Cooling capacity (optional)" unit="BTU/h" f={btu} set={setBtu} />
            <Num id="dev-eer" text="EER (optional, with BTU/h)" f={eer} set={setEer} />
            <Num id="dev-ch" text="Hours running per day" unit="h" f={hours} set={setHours} />
          </>
        )}
        {model === 'measured_energy' && (
          <>
            <div>
              <label htmlFor="dev-kwh" style={label}>Meter reading <span style={{ ...muted, fontSize: 12 }}>(kWh)</span></label>
              <input id="dev-kwh" inputMode="decimal" style={input} value={kwh} onChange={(e) => setKwh(e.target.value)} />
            </div>
            <div>
              <label htmlFor="dev-over" style={label}>Over how many hours</label>
              <input id="dev-over" inputMode="decimal" style={input} value={overHours} onChange={(e) => setOverHours(e.target.value)} />
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        <label style={{ ...muted, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={motor} onChange={(e) => setMotor(e.target.checked)} /> Has a motor or compressor (needs extra power to start)
        </label>
        {motor && <Num id="dev-su" text="Startup watts (leave blank if unknown)" unit="W" f={startup} set={setStartup} />}
      </div>

      {error && <p role="alert" style={{ color: '#f6a5a5', margin: 0, fontSize: 13.5 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn type="submit">Add to profile</Btn>
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
      </div>
    </form>
  )
}
