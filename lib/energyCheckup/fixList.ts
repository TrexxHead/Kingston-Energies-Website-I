import type { ApplianceResult, ApplianceRow } from './calc'
import type { Category, LightType } from './applianceLibrary'

export interface FixAction {
  id: string
  label: string
  detail: string
  kwhSaved: number
}

const kwhFor = (results: ApplianceResult[], id: string) => results.find((r) => r.applianceId === id)?.kwh ?? 0
const categoryKwh = (results: ApplianceResult[], category: Category) =>
  results.filter((r) => r.category === category).reduce((s, r) => s + r.kwh, 0)

export interface FixListInputs {
  mode: 'home' | 'biz'
  results: ApplianceResult[]
  rows: Map<string, ApplianceRow>
  lightType?: LightType
  fridgeAgeBand?: '<5' | '5-10' | '10+'
}

/**
 * The ten conditional actions from the build spec (section 3.9) — each only
 * appears when the customer's own inputs trigger it, and each is costed
 * against their own load, not a generic estimate.
 */
export function buildFixActions(inputs: FixListInputs): FixAction[] {
  const { mode, results, rows, lightType, fridgeAgeBand } = inputs
  const acId = mode === 'home' ? 'ac' : 'bizAc'
  const waterId = mode === 'home' ? 'water' : 'bizWater'
  const fansId = mode === 'home' ? 'fans' : 'bizFans'

  const acKwh = kwhFor(results, acId)
  const acHours = rows.get(acId)?.hours ?? 0
  const waterKwh = kwhFor(results, waterId)
  const lightingKwh = kwhFor(results, 'lighting')
  const fridgeKwh = kwhFor(results, 'fridge')
  const coolersKwh = kwhFor(results, 'coolers')
  const electronicsKwh = categoryKwh(results, 'electronics')
  const fansKwh = kwhFor(results, fansId)
  const dryerKwh = kwhFor(results, 'dryer')

  const actions: FixAction[] = []

  if (acKwh > 0) {
    actions.push({
      id: 'ac-25',
      label: 'Set AC to 25°C, not 20°C',
      detail: 'Every degree colder than 25°C costs more to hold.',
      kwhSaved: acKwh * 0.2,
    })
  }
  if (acKwh > 0 && acHours > 4) {
    actions.push({
      id: 'ac-hours',
      label: 'Run the AC two hours less',
      detail: `Cutting from ${acHours}h to ${Math.max(0, acHours - 2)}h a day.`,
      kwhSaved: acKwh * (2 / acHours),
    })
  }
  if (waterKwh > 0) {
    actions.push({
      id: 'water-timer',
      label: 'Put the water heater on a timer',
      detail: 'Two heating windows instead of standing hot all day.',
      kwhSaved: waterKwh * 0.4,
    })
  }
  if (mode === 'home' && lightType && lightType !== 'led' && lightingKwh > 0) {
    actions.push({
      id: 'led-swap',
      label: 'Swap every bulb to LED',
      detail: `From mostly ${lightType === 'cfl' ? 'CFL' : 'incandescent'} — LED cuts lighting draw the most.`,
      kwhSaved: lightingKwh * 0.75,
    })
  }
  if (mode === 'home' && fridgeAgeBand === '10+' && fridgeKwh > 0) {
    actions.push({
      id: 'fridge-replace',
      label: 'Replace the 10+ year fridge',
      detail: 'Older compressors lose efficiency — this is the single biggest fridge fix.',
      kwhSaved: fridgeKwh * 0.3,
    })
  }
  if (mode === 'home' && (fridgeAgeBand === '5-10' || fridgeAgeBand === '10+') && fridgeKwh > 0) {
    actions.push({
      id: 'fridge-seal',
      label: 'Fix the fridge door seal',
      detail: 'A paper-strip test catches a leak that keeps the compressor running longer than it should.',
      kwhSaved: fridgeKwh * 0.08,
    })
  }
  if (mode === 'biz' && coolersKwh > 0) {
    actions.push({
      id: 'cooler-covers',
      label: 'Night covers on display coolers',
      detail: 'No equipment change — just covering overnight.',
      kwhSaved: coolersKwh * 0.15,
    })
  }
  if (electronicsKwh > 0) {
    actions.push({
      id: 'standby-kill',
      label: 'Kill standby draw overnight',
      detail: 'Switch off at the wall instead of leaving on standby.',
      kwhSaved: electronicsKwh * 0.1,
    })
  }
  if (fansKwh > 0 && acKwh > 0) {
    actions.push({
      id: 'fan-before-ac',
      label: 'Reach for the fan before the AC',
      detail: 'Fans use a fraction of the power for a lot of the comfort.',
      kwhSaved: acKwh * 0.08,
    })
  }
  if (mode === 'home' && dryerKwh > 0) {
    actions.push({
      id: 'line-dry',
      label: 'Line-dry instead of tumble-drying',
      detail: 'The dryer is one of the single heaviest loads in the house.',
      kwhSaved: dryerKwh * 0.6,
    })
  }

  return actions
}
