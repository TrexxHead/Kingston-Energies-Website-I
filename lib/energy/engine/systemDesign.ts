import { type CalcResult, type Assumption, refuse, isPositive, isNonNegative } from './result'

/**
 * Whole-system design from a household's energy use: the six design steps
 * as taught in the owner's PV course notebook (Solar Coach Jamaica, expanded
 * and corrected, Nov 2026), with its design-critical corrections applied:
 *
 * - C02: array = daily energy ÷ (peak sun hours × derate), never without losses.
 * - C21: panels = array W ÷ panel W (Wh ÷ W gives hours, not panels).
 * - C03: battery nameplate = energy needed ÷ (depth of discharge × efficiency).
 * - Inverter: continuous rating ≥ 1.25 × simultaneous peak; peak rating ≥ surge.
 * - Battery-to-inverter current matching (gap G14).
 *
 * Sizes are requirements and nearest common sizes, not products: the survey
 * and the chosen equipment's datasheets set the final design. Engine 1.9.0.
 */

export type SystemType = 'grid_tied' | 'hybrid' | 'off_grid'

/** Notebook §6.2 loss chain for energy used directly by the loads (typical factors). */
export const LOSS_CHAIN: { id: string; label: string; factor: number }[] = [
  { id: 'temperature', label: 'Heat — cells run 25–40 °C above test conditions', factor: 0.9 },
  { id: 'soiling', label: 'Dust, salt and droppings', factor: 0.97 },
  { id: 'mismatch', label: 'Small differences between panels', factor: 0.98 },
  { id: 'dc_wiring', label: 'DC cables and connections', factor: 0.985 },
  { id: 'mppt', label: 'Charge-controller tracking', factor: 0.99 },
  { id: 'inverter', label: 'Inverter, DC to AC', factor: 0.943 },
  { id: 'ac_wiring', label: 'AC cables to your panel', factor: 0.99 },
]
/** Extra loss on energy stored before use: charger × lithium round trip (notebook §6.2, item 8). */
export const BATTERY_PATH_FACTOR = 0.9

/** Derate for energy used straight from the panels (≈ 0.779). */
export const DIRECT_DERATE = LOSS_CHAIN.reduce((a, l) => a * l.factor, 1)

/** Derate when a share of the day's energy passes through the battery first (notebook §6.3). */
export function derateFor(storedShare: number): number {
  const s = Math.min(1, Math.max(0, storedShare))
  return DIRECT_DERATE * (1 - s + s * BATTERY_PATH_FACTOR)
}

export const DESIGN_DEFAULTS = {
  /** Jamaica yields about 5–7 kWh/kWp/day; the course designs on 5 (notebook §14.6). */
  peakSunHours: 5,
  moduleWatts: 550,
  /** Lithium iron phosphate (LFP) usable depth of discharge. */
  depthOfDischarge: 0.9,
  batteryEfficiency: 0.95,
  batteryVoltage: 51.2,
  inverterEfficiency: 0.943,
  inverterMargin: 1.25,
  /** Typical hybrid inverter surge: 2 × rating for a few seconds — check the datasheet. */
  surgeMultiple: 2,
  /** Off-grid arrays get extra for cloudy-season recovery (notebook §17.4). */
  offGridArrayMargin: 1.2,
  /** Grid-tied: array may exceed the inverter by up to this ratio (DC:AC). */
  gridTiedDcAcRatio: 1.2,
  /** A load table should land within this of the JPS bill (notebook §7.3). */
  billTolerance: 0.15,
}

/** A healthy performance ratio for a Jamaican system (≈ the design derate). */
const DESIGN_DEFAULTS_PR = 0.75

/** Common inverter sizes, kW (single unit). */
export const INVERTER_SIZES_KW = [3, 5, 6, 8, 10, 12, 14, 16]

export interface SystemDesignInput {
  type: SystemType
  /** Energy used per day, Wh. */
  dailyWh: number
  /** Energy used while the sun is down, Wh. Defaults to half the day (stated). */
  nightWh?: number
  /** Energy the battery must carry through the night/outage, Wh (e.g. essentials only). Defaults to nightWh. */
  storageWh?: number
  /** Largest power drawn at the same time, W. */
  peakWatts?: number
  /** Peak plus the largest motor start, W. */
  surgeWatts?: number
  /** Days of reserve: 1 for a grid-backed hybrid, 1–2 off-grid. */
  autonomyDays?: number
  peakSunHours?: number
  moduleWatts?: number
  depthOfDischarge?: number
  batteryEfficiency?: number
  batteryVoltage?: number
  /** Override the computed derate (e.g. 0.75 design value). */
  derate?: number
  /** Monthly kWh from the JPS bill, to cross-check the load figures. */
  billMonthlyKwh?: number
}

export interface SystemDesign {
  type: SystemType
  derate: number
  storedShare: number
  array: { minimumW: number; modules: number; moduleWatts: number; kwp: number; expectedDailyWh: number }
  inverter: { requiredW: number | null; sizeKw: number | null; multipleUnits: boolean; surgeOk: boolean | null }
  battery: { energyNeededWh: number; nameplateWh: number; ampHours: number; voltage: number; dcCurrentA: number | null } | null
  /** Share of the day's use the system can cover from the sun, 0–1. */
  solarShare: number
  billCheck: { loadMonthlyKwh: number; billMonthlyKwh: number; differencePct: number; withinTolerance: boolean } | null
}

const round = (n: number, d = 0) => Math.round(n * 10 ** d) / 10 ** d

export function designSystem(i: SystemDesignInput): CalcResult<SystemDesign> {
  if (!isPositive(i.dailyWh)) return refuse('missing_input', ['dailyWh'], 'Tell us how much electricity you use — from your bill or your equipment list.')
  if (i.nightWh != null && !(isNonNegative(i.nightWh) && i.nightWh <= i.dailyWh)) return refuse('invalid_input', ['nightWh'], 'Night-time use can’t be more than the whole day’s.')
  const D = DESIGN_DEFAULTS
  const assumptions: Assumption[] = []
  const warnings: string[] = []
  const psh = i.peakSunHours ?? D.peakSunHours
  if (!(psh > 1 && psh < 9)) return refuse('invalid_input', ['peakSunHours'], 'Peak sun hours should be about 3–7 in Jamaica.')
  if (i.peakSunHours == null) assumptions.push({ id: 'psh', description: 'Design peak sun hours for Jamaica (yields run about 5–7 kWh per kWp a day)', value: psh, unit: 'h' })
  const moduleW = i.moduleWatts ?? D.moduleWatts
  if (!(moduleW >= 200 && moduleW <= 800)) return refuse('invalid_input', ['moduleWatts'], 'Panel wattage should be about 300–700 W.')
  if (i.moduleWatts == null) assumptions.push({ id: 'module', description: 'Panel size (a current mono half-cut module); your installer may use another', value: moduleW, unit: 'W' })

  const nightWh = i.nightWh ?? i.dailyWh * 0.5
  if (i.nightWh == null) assumptions.push({ id: 'night', description: 'Half of the day’s use is after dark', value: 50, unit: '%' })
  const hasBattery = i.type !== 'grid_tied'
  const storageWh = hasBattery ? Math.min(i.storageWh ?? nightWh, i.type === 'off_grid' ? Infinity : i.dailyWh) : 0
  const storedShare = hasBattery ? Math.min(1, Math.min(storageWh, nightWh) / i.dailyWh) : 0

  let derate = i.derate ?? derateFor(storedShare)
  if (!(derate > 0.5 && derate <= 1)) return refuse('invalid_input', ['derate'], 'The loss factor should be between 0.5 and 1.')
  if (i.derate == null) assumptions.push({ id: 'derate', description: 'System losses from the loss chain (heat, dirt, wiring, inverter; battery round trip on stored energy)', value: round(derate, 3) })
  derate = round(derate, 4)

  // Step 2 & 4: array and panels.
  let minimumW = i.dailyWh / (psh * derate)
  if (i.type === 'off_grid') {
    minimumW *= D.offGridArrayMargin
    assumptions.push({ id: 'offgrid_margin', description: 'Extra array for cloudy-season recovery off-grid', value: Math.round((D.offGridArrayMargin - 1) * 100), unit: '%' })
  }
  const modules = Math.max(1, Math.ceil(minimumW / moduleW - 1e-9))
  const kwp = (modules * moduleW) / 1000
  const expectedDailyWh = kwp * 1000 * psh * derate

  // Step 3: inverter.
  let requiredW: number | null = null
  if (i.type === 'grid_tied') requiredW = (kwp * 1000) / D.gridTiedDcAcRatio
  else if (isPositive(i.peakWatts)) requiredW = i.peakWatts * D.inverterMargin
  else warnings.push('Add the biggest things that run at the same time to size the inverter.')
  let sizeKw: number | null = null
  let multipleUnits = false
  if (requiredW != null) {
    sizeKw = INVERTER_SIZES_KW.find((k) => k * 1000 >= requiredW! - 1e-6) ?? null
    if (sizeKw == null) {
      multipleUnits = true
      sizeKw = Math.ceil(requiredW / 1000)
      warnings.push('This needs more than one inverter working together — your installer will plan the split.')
    }
  }
  let surgeOk: boolean | null = null
  if (hasBattery && sizeKw != null && isPositive(i.surgeWatts)) {
    surgeOk = i.surgeWatts <= sizeKw * 1000 * D.surgeMultiple
    assumptions.push({ id: 'surge', description: 'Inverter can supply about twice its rating for a few seconds (check the chosen model’s datasheet)', value: D.surgeMultiple, unit: '×' })
    if (!surgeOk) warnings.push('Motor starts (pumps, compressors) exceed what this inverter size can supply — choose a larger inverter or a soft starter.')
  }

  // Step 5: battery.
  let battery: SystemDesign['battery'] = null
  if (hasBattery) {
    const autonomy = i.autonomyDays ?? 1
    if (!(autonomy > 0 && autonomy <= 5)) return refuse('invalid_input', ['autonomyDays'], 'Backup days should be between 1 and 5.')
    const dod = i.depthOfDischarge ?? D.depthOfDischarge
    const eff = i.batteryEfficiency ?? D.batteryEfficiency
    const volts = i.batteryVoltage ?? D.batteryVoltage
    if (!(dod > 0.3 && dod <= 1) || !(eff > 0.5 && eff <= 1)) return refuse('invalid_input', ['depthOfDischarge', 'batteryEfficiency'], 'Battery depth of discharge and efficiency must be fractions.')
    if (i.depthOfDischarge == null) assumptions.push({ id: 'dod', description: 'Usable share of a lithium (LFP) battery', value: Math.round(dod * 100), unit: '%' })
    if (i.batteryEfficiency == null) assumptions.push({ id: 'batt_eff', description: 'Battery efficiency', value: Math.round(eff * 100), unit: '%' })
    const energyNeededWh = storageWh * autonomy
    const nameplateWh = energyNeededWh / (dod * eff)
    const dcCurrentA = sizeKw != null ? (sizeKw * 1000) / (volts * D.inverterEfficiency) : null
    battery = { energyNeededWh, nameplateWh, ampHours: nameplateWh / volts, voltage: volts, dcCurrentA }
  }

  // Share of use from the sun: daytime use directly, night use only through the battery.
  const dayWh = i.dailyWh - nightWh
  const usable = hasBattery ? Math.min(expectedDailyWh, dayWh + Math.min(storageWh, nightWh)) : Math.min(expectedDailyWh, dayWh)
  const solarShare = Math.min(1, usable / i.dailyWh)
  if (i.type === 'grid_tied') warnings.push('A grid-tied system switches off when JPS power goes out — it gives no backup.')

  let billCheck: SystemDesign['billCheck'] = null
  if (isPositive(i.billMonthlyKwh)) {
    const loadMonthlyKwh = (i.dailyWh * 30) / 1000
    const differencePct = ((loadMonthlyKwh - i.billMonthlyKwh) / i.billMonthlyKwh) * 100
    const withinTolerance = Math.abs(differencePct) <= D.billTolerance * 100
    billCheck = { loadMonthlyKwh, billMonthlyKwh: i.billMonthlyKwh, differencePct, withinTolerance }
    if (!withinTolerance)
      warnings.push(differencePct > 0 ? 'Your equipment list adds up to more than your bill — some hours or wattages may be too high.' : 'Your equipment list adds up to less than your bill — something may be missing.')
  }

  return {
    ok: true,
    value: {
      type: i.type,
      derate,
      storedShare,
      array: { minimumW, modules, moduleWatts: moduleW, kwp, expectedDailyWh },
      inverter: { requiredW, sizeKw, multipleUnits, surgeOk },
      battery,
      solarShare,
      billCheck,
    },
    basis: 'assumed',
    assumptions,
    warnings,
  }
}

/** Which system type fits, from what the customer cares about (notebook §3.5–3.6). */
export function recommendSystemType(o: { wantsBackup: boolean; hasGrid: boolean }): SystemType {
  if (!o.hasGrid) return 'off_grid'
  return o.wantsBackup ? 'hybrid' : 'grid_tied'
}

/**
 * Performance ratio check for an installed system (notebook §15.4):
 * PR = kWh produced ÷ (kWp × peak sun hours). About 0.75 is healthy for a
 * Jamaican hybrid; lower can be normal in a zero-export system with a full
 * battery (curtailment).
 */
export function performanceRatio(i: { kwhProduced: number; kwp: number; peakSunHours: number; days?: number }): CalcResult<{ pr: number; expectedKwh: number; status: 'healthy' | 'low' | 'very_low' | 'high' }> {
  const days = i.days ?? 1
  if (!isPositive(i.kwp)) return refuse('missing_input', ['kwp'], 'Enter your system size in kWp (on your design or the inverter app).')
  if (!isNonNegative(i.kwhProduced)) return refuse('missing_input', ['kwhProduced'], 'Enter the kWh your system made.')
  if (!(i.peakSunHours > 0.5 && i.peakSunHours < 9)) return refuse('invalid_input', ['peakSunHours'], 'Peak sun hours should be about 1–7.')
  if (!(days >= 1 && days <= 366)) return refuse('invalid_input', ['days'], 'Days should be 1–366.')
  const ideal = i.kwp * i.peakSunHours * days
  const pr = i.kwhProduced / ideal
  const status = pr > 0.92 ? 'high' : pr >= 0.68 ? 'healthy' : pr >= 0.5 ? 'low' : 'very_low'
  return {
    ok: true,
    value: { pr, expectedKwh: ideal * DESIGN_DEFAULTS_PR, status },
    basis: 'customer_entered',
    assumptions: [{ id: 'pr_design', description: 'Healthy performance ratio for a Jamaican system', value: DESIGN_DEFAULTS_PR }],
    warnings: status === 'high' ? ['That’s higher than physics usually allows — check the sun-hours figure and the dates.'] : [],
  }
}
