import { describe, it, expect } from 'vitest'
import { evCostComparison, EV_DEFAULTS } from '@/lib/energy/engine/ev'
import { periodCost, type TariffVersion } from '@/lib/energy/engine/tariff'
import { CALC_ENGINE_VERSION } from '@/lib/energy/engine/version'

// Synthetic test tariff — not JPS rates.
const t: TariffVersion = {
  id: 't', name: 'TEST', geography: 'Test', customerClass: 'Test', effectiveFrom: '2026-01-01', effectiveTo: null,
  source: { title: 'test', retrievedAt: '2026-01-01' }, reviewStatus: 'approved', currency: 'JMD',
  components: [
    { kind: 'fixed', label: 'Customer', amountPerPeriod: 500 },
    { kind: 'energy_blocks', label: 'Energy', blocks: [{ upToKwh: 100, ratePerKwh: 10 }, { upToKwh: null, ratePerKwh: 20 }] },
  ],
}
const base = { kmPerYear: 15000, petrolLPer100km: 8, petrolPricePerL: 200, evKwhPer100km: 16, onDate: '2026-10-01' }

describe('EV vs petrol energy cost', () => {
  it('prices petrol from distance, consumption and pump price', () => {
    const r = evCostComparison({ ...base, homeShare: 1, homePricePerKwh: 40 })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.petrolPerYear).toBe(150 * 8 * 200) // 240,000
    // 2,400 kWh at the battery ÷ 0.9 = 2,666.7 kWh × J$40
    expect(r.value.homeKwhPerYear).toBeCloseTo(2400 / EV_DEFAULTS.homeChargingEfficiency)
    expect(r.value.evPerYear).toBeCloseTo((2400 / 0.9) * 40)
    expect(r.warnings.join(' ')).toMatch(/Energy costs only/)
  })

  it('home charging at a tariff is the extra cost on the household bill, not the average price', () => {
    const r = evCostComparison({ ...base, homeShare: 1, tariff: t, householdMonthlyKwh: 80 })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const evMonthly = 2400 / 0.9 / 12
    const expected = ((periodCost(t, 80 + evMonthly, base.onDate) as { ok: true; value: { total: number } }).value.total - (periodCost(t, 80, base.onDate) as { ok: true; value: { total: number } }).value.total) * 12
    expect(r.value.evPerYear).toBeCloseTo(expected)
    // Mostly top-block kWh, so close to J$20/kWh — never the average including the fixed charge.
    expect(r.value.homePricePerKwh).toBeGreaterThan(19)
    expect(r.value.homePricePerKwh).toBeLessThan(20.01)
  })

  it('splits home and public charging and computes a simple payback', () => {
    const r = evCostComparison({ ...base, homeShare: 0.5, homePricePerKwh: 40, publicPricePerKwh: 80, purchasePremium: 1_000_000 })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.publicKwhPerYear).toBeCloseTo(1200 / 0.95)
    expect(r.value.paybackYears).toBeCloseTo(1_000_000 / r.value.savingPerYear)
  })

  it('refuses to guess missing prices', () => {
    expect(evCostComparison({ ...base, homeShare: 1 }).ok).toBe(false)
    expect(evCostComparison({ ...base, homeShare: 0.5, homePricePerKwh: 40 }).ok).toBe(false)
    expect(evCostComparison({ ...base, petrolPricePerL: 0, homeShare: 1, homePricePerKwh: 40 }).ok).toBe(false)
    expect(evCostComparison({ ...base, homeShare: 1, tariff: { ...t, reviewStatus: 'draft' }, householdMonthlyKwh: 200 }).ok).toBe(false)
  })

  it('engine version records the EV formulas', () => {
    expect(CALC_ENGINE_VERSION).toBe('1.2.0')
  })
})
