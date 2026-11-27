import { refuse, isPositive, isNonNegative, type CalcResult } from './result'

/**
 * Likely installed price for a solar system from an approved price record
 * (J$ per kWp installed, low–high; optional battery J$ per kWh). A range,
 * not a quote: a site visit sets the real price. Engine 1.6.0.
 */
export interface InstallPriceRates {
  perKwpLow: number
  perKwpHigh: number
  minimumJob?: number | null
  batteryPerKwhLow?: number | null
  batteryPerKwhHigh?: number | null
}

export interface InstallPriceInput {
  kwp: number
  rates: InstallPriceRates
  /** Usable battery kWh, when the visitor wants storage priced too. */
  batteryKwh?: number
  /** Yearly bill saving range (cautious daytime-only, upper), for a simple payback. */
  annualSaving?: { low: number; high: number }
}

export interface InstallPriceOutput {
  solar: { low: number; high: number }
  battery: { low: number; high: number } | null
  total: { low: number; high: number }
  /** Years for savings to repay the price, before financing costs; null without savings. */
  paybackYears: { low: number; high: number } | null
}

export function installPriceRange(i: InstallPriceInput): CalcResult<InstallPriceOutput> {
  const r = i.rates
  if (!isPositive(i.kwp)) return refuse('missing_input', ['kwp'], 'Draw or pick a roof first so we know the system size.')
  if (!isPositive(r.perKwpLow) || !isPositive(r.perKwpHigh) || r.perKwpHigh < r.perKwpLow) return refuse('invalid_input', ['rates'], 'The price record is incomplete.')
  const floor = isNonNegative(r.minimumJob) ? r.minimumJob : 0
  const solar = { low: Math.max(floor, i.kwp * r.perKwpLow), high: Math.max(floor, i.kwp * r.perKwpHigh) }
  let battery: InstallPriceOutput['battery'] = null
  if (isPositive(i.batteryKwh)) {
    if (!isPositive(r.batteryPerKwhLow) || !isPositive(r.batteryPerKwhHigh)) return refuse('missing_input', ['batteryPerKwh'], 'We don’t have battery prices yet.')
    battery = { low: i.batteryKwh * r.batteryPerKwhLow, high: i.batteryKwh * r.batteryPerKwhHigh }
  }
  const total = { low: solar.low + (battery?.low ?? 0), high: solar.high + (battery?.high ?? 0) }
  const s = i.annualSaving
  const paybackYears = s && isPositive(s.low) && isPositive(s.high) ? { low: total.low / Math.max(s.low, s.high), high: total.high / Math.min(s.low, s.high) } : null
  return {
    ok: true,
    value: { solar, battery, total, paybackYears },
    basis: 'assumed',
    assumptions: [
      { id: 'install.per_kwp', description: `Installed price J$${r.perKwpLow.toLocaleString('en-JM')}–${r.perKwpHigh.toLocaleString('en-JM')} per kWp (panels, inverter, mounting and labour) from our approved price list.` },
      ...(floor ? [{ id: 'install.minimum', description: `Smallest job J$${floor.toLocaleString('en-JM')}.` }] : []),
      ...(paybackYears ? [{ id: 'install.payback', description: 'Payback = price ÷ yearly saving, before loan interest, panel ageing or tariff changes. Fastest pairs the lowest price with the highest saving.' }] : []),
    ],
    warnings: ['A range, not a quote. Roof condition, wiring, permits and the equipment you choose set the final price after a site visit.'],
  }
}
