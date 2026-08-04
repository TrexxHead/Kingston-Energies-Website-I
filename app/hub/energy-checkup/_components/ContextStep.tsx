'use client'

import { PillGroup, Stepper, wizardCard, stepHeading, stepSubhead } from './shared'
import type { CuState } from './types'

const PARISHES = ['Kingston & St Andrew', 'St Catherine', 'Clarendon', 'St James', 'Other']
const HOME_TYPES = ['Apartment', 'Townhouse', 'Detached house']
const AC_OPTIONS = [{ value: 'none', label: 'No AC' }, { value: 'window', label: 'Window unit' }, { value: 'split', label: 'Split (inverter)' }]
const FRIDGE_AGE = [{ value: '<5', label: 'Under 5 yrs' }, { value: '5-10', label: '5–10 yrs' }, { value: '10+', label: '10+ yrs' }]
const WATER_OPTIONS = [
  { value: 'tank', label: 'Electric tank' }, { value: 'instant', label: 'Instant electric' },
  { value: 'solar', label: 'Solar' }, { value: 'gas', label: 'Gas' }, { value: 'none', label: 'None' },
]
const LIGHT_OPTIONS = [{ value: 'led', label: 'Mostly LED' }, { value: 'cfl', label: 'Mostly CFL' }, { value: 'incandescent', label: 'Mostly incandescent' }]
const BIZ_TYPES = ['Retail shop', 'Salon or barber', 'Food & beverage', 'Office', 'Other']

export default function ContextStep({ state, set }: { state: CuState; set: (patch: Partial<CuState>) => void }) {
  if (state.mode === 'biz') {
    return (
      <div style={wizardCard}>
        <h2 style={stepHeading}>About your business</h2>
        <p style={stepSubhead}>Context so the defaults start close to reality.</p>
        <PillGroup label="Business type" hint="drives equipment defaults" options={BIZ_TYPES.map((v) => ({ value: v, label: v }))} value={state.bizType} onChange={(v) => set({ bizType: v })} />
        <PillGroup
          label="Backup power today"
          hint="feeds the outage estimate"
          options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]}
          value={state.backup ? 'yes' : 'no'}
          onChange={(v) => set({ backup: v === 'yes' })}
        />
      </div>
    )
  }

  return (
    <div style={wizardCard}>
      <h2 style={stepHeading}>About your home</h2>
      <p style={stepSubhead}>Context so the defaults start close to reality.</p>
      <PillGroup label="Parish" hint="for future climate tuning" options={PARISHES.map((v) => ({ value: v, label: v }))} value={state.parish} onChange={(v) => set({ parish: v })} />
      <PillGroup label="Home type" options={HOME_TYPES.map((v) => ({ value: v, label: v }))} value={state.homeType} onChange={(v) => set({ homeType: v })} />
      <PillGroup
        label="Air conditioning"
        hint="window units draw far more than inverter splits"
        options={AC_OPTIONS}
        value={state.acType}
        onChange={(v) => set({ acType: v as CuState['acType'] })}
      />
      <PillGroup label="Fridge age" hint="older units lose efficiency" options={FRIDGE_AGE} value={state.fridgeAgeBand} onChange={(v) => set({ fridgeAgeBand: v as CuState['fridgeAgeBand'] })} />
      <PillGroup label="Water heating" options={WATER_OPTIONS} value={state.waterType} onChange={(v) => set({ waterType: v as CuState['waterType'] })} />
      <PillGroup label="Lighting" options={LIGHT_OPTIONS} value={state.lightType} onChange={(v) => set({ lightType: v as CuState['lightType'] })} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5 }}>People in the home</span>
        <Stepper value={state.occupants} onChange={(v) => set({ occupants: v })} min={1} max={15} />
      </div>
    </div>
  )
}
