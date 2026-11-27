import { describe, it, expect } from 'vitest'
import {
  dailyEnergy,
  runtime,
  checkContinuousOutput,
  checkSurge,
  compareBills,
  reconcileWithBill,
  periodCost,
  marginalSaving,
  evaluateScenario,
  whFromMah,
  weakestBasis,
  type TariffVersion,
  type ScenarioDevice,
} from '@/lib/energy/engine'
import { buildRun, stableStringify } from '@/lib/energy/engine/run'

const m = (value: number) => ({ value, basis: 'measured' as const })
const mf = (value: number) => ({ value, basis: 'manufacturer' as const })
const ce = (value: number) => ({ value, basis: 'customer_entered' as const })

describe('loads', () => {
  it('steady load: W × h ÷ 1000', () => {
    const r = dailyEnergy({ kind: 'steady', watts: m(100), hoursPerDay: m(5) })
    expect(r.ok && r.value.kwhPerDay.base).toBeCloseTo(0.5)
    expect(r.ok && r.basis).toBe('measured')
  })

  it('days per week averages the daily figure', () => {
    const r = dailyEnergy({ kind: 'steady', watts: m(1000), hoursPerDay: m(1), daysPerWeek: 2 })
    expect(r.ok && r.value.kwhPerDay.base).toBeCloseTo(2 / 7)
  })

  it('nameplate maximum is kept as the conservative high, with a warning', () => {
    const r = dailyEnergy({ kind: 'steady', watts: mf(200), wattsKind: 'nameplate_max', hoursPerDay: ce(4) })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.kwhPerDay.high).toBeCloseTo(0.8)
    expect(r.value.kwhPerDay.low).toBeCloseTo(0.4)
    expect(r.warnings.join(' ')).toMatch(/nameplate/i)
  })

  it('refridgerator cycling uses duty cycle, not hours at nameplate', () => {
    const r = dailyEnergy({ kind: 'cycling', runningWatts: mf(150), dutyCyclePct: ce(40) })
    expect(r.ok && r.value.kwhPerDay.base).toBeCloseTo(1.44)
    expect(r.ok && r.value.runningWatts).toBe(150)
  })

  it('inverter AC: refuses to treat BTU/h as watts', () => {
    const r = dailyEnergy({ kind: 'cooling', capacityBtuh: mf(12000), hoursPerDay: ce(8) })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.fields).toEqual(['inputWatts', 'eer'])
    expect(r.message).toMatch(/cooling output/i)
  })

  it('inverter AC: capacity ÷ EER gives electrical input', () => {
    const r = dailyEnergy({ kind: 'cooling', capacityBtuh: mf(12000), eer: mf(12), hoursPerDay: ce(8), averageLoadFraction: m(1) })
    expect(r.ok && r.value.runningWatts).toBeCloseTo(1000)
    expect(r.ok && r.value.kwhPerDay.base).toBeCloseTo(8)
  })

  it('inverter AC without a meter reading uses a documented load-fraction assumption', () => {
    const r = dailyEnergy({ kind: 'cooling', inputWatts: mf(1000), hoursPerDay: ce(8) })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.kwhPerDay.base).toBeCloseTo(6)
    expect(r.basis).toBe('assumed')
    expect(r.assumptions.map((a) => a.id)).toContain('cooling.average_load_fraction')
    expect(r.value.kwhPerDay.low).toBeLessThan(4)
    expect(r.value.kwhPerDay.high).toBeGreaterThan(8)
  })

  it('a short measured reading is flagged and not treated as a full-strength measurement', () => {
    const r = dailyEnergy({ kind: 'measured_energy', kwh: 0.5, overHours: 2 })
    expect(r.ok && r.value.kwhPerDay.base).toBeCloseTo(6)
    expect(r.ok && r.basis).toBe('customer_entered')
    expect(r.ok && r.warnings[0]).toMatch(/less than a full day/)
  })

  it('a week of readings is not a seasonal baseline', () => {
    const r = dailyEnergy({ kind: 'measured_energy', kwh: 7, overHours: 168 })
    expect(r.ok && r.basis).toBe('measured')
    expect(r.ok && r.warnings[0]).toMatch(/seasonal/)
  })

  it('rejects impossible hours', () => {
    const r = dailyEnergy({ kind: 'steady', watts: m(10), hoursPerDay: m(25) })
    expect(r.ok).toBe(false)
  })
})

describe('battery runtime', () => {
  it('nominal capacity on AC applies usable fraction and inverter loss (assumed)', () => {
    const r = runtime({
      source: { capacityWh: mf(1000), capacityBasis: 'nominal' },
      outputPath: 'ac',
      averageLoadWatts: { low: 100, base: 100, high: 100 },
      loadBasis: 'measured',
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.hours.base).toBeCloseTo((1000 * 0.85 * 0.85) / 100)
    expect(r.basis).toBe('assumed')
    expect(r.warnings.join(' ')).toMatch(/idle/)
  })

  it('does not subtract losses already reflected in measured delivered AC capacity', () => {
    const r = runtime({
      source: { capacityWh: m(900), capacityBasis: 'delivered_ac_measured', idleWatts: m(0) },
      outputPath: 'ac',
      averageLoadWatts: { low: 90, base: 90, high: 90 },
      loadBasis: 'measured',
    })
    expect(r.ok && r.value.hours.base).toBeCloseTo(10)
    expect(r.ok && r.assumptions).toHaveLength(0)
  })

  it('includes reserve and inverter idle draw', () => {
    const r = runtime({
      source: { capacityWh: mf(1000), capacityBasis: 'usable_dc', inverterEfficiency: mf(0.9), idleWatts: mf(10) },
      outputPath: 'ac',
      averageLoadWatts: { low: 80, base: 80, high: 80 },
      loadBasis: 'measured',
      reserveFraction: 0.2,
    })
    expect(r.ok && r.value.hours.base).toBeCloseTo((1000 * 0.9 * 0.8) / 90)
    expect(r.ok && r.value.includesIdle).toBe(true)
  })

  it('refuses without a capacity', () => {
    const r = runtime({ source: { capacityWh: mf(0), capacityBasis: 'nominal' }, outputPath: 'dc', averageLoadWatts: { low: 5, base: 5, high: 5 }, loadBasis: 'assumed' })
    expect(r.ok).toBe(false)
  })

  it('runtime range widens with load uncertainty', () => {
    const r = runtime({
      source: { capacityWh: m(1000), capacityBasis: 'delivered_ac_measured', idleWatts: m(0) },
      outputPath: 'ac',
      averageLoadWatts: { low: 50, base: 100, high: 200 },
      loadBasis: 'customer_entered',
    })
    expect(r.ok && r.value.hours).toEqual({ low: 5, base: 10, high: 20 })
  })
})

describe('power checks', () => {
  it('rejects insufficient continuous output even when battery energy is ample', () => {
    const big = { capacityWh: mf(5000), capacityBasis: 'usable_dc' as const, continuousWatts: mf(300) }
    const rt = runtime({ source: big, outputPath: 'ac', averageLoadWatts: { low: 400, base: 400, high: 400 }, loadBasis: 'measured' })
    expect(rt.ok && rt.value.hours.base).toBeGreaterThan(5)
    expect(checkContinuousOutput(big, 400).status).toBe('fail')
  })

  it('unknown continuous rating is never a pass', () => {
    expect(checkContinuousOutput({}, 10).status).toBe('unknown')
  })

  it('marginal above 80% of the rating', () => {
    expect(checkContinuousOutput({ continuousWatts: mf(1000) }, 900).status).toBe('marginal')
    expect(checkContinuousOutput({ continuousWatts: mf(1000) }, 700).status).toBe('pass')
  })

  it('surge: unknown startup demand, insufficient surge, undocumented duration', () => {
    expect(checkSurge({ surgeWatts: mf(2000) }, null).status).toBe('unknown')
    expect(checkSurge({ surgeWatts: mf(1000) }, 1500).status).toBe('fail')
    expect(checkSurge({ surgeWatts: mf(2000) }, 1500, 500).status).toBe('marginal')
    expect(checkSurge({ surgeWatts: mf(2000), surgeDurationMs: mf(100) }, 1500, 500).status).toBe('fail')
    expect(checkSurge({ surgeWatts: mf(2000), surgeDurationMs: mf(1000) }, 1500, 500).status).toBe('pass')
    expect(checkSurge({}, 1500).status).toBe('unknown')
  })
})

describe('bills', () => {
  const prev = { periodStart: '2026-07-01', periodEnd: '2026-07-31', kwh: 300, readingType: 'actual' as const, currentCharges: 18000, fixedCharges: 1500 }

  it('decomposition sums exactly to the change in current charges', () => {
    const curr = { periodStart: '2026-07-31', periodEnd: '2026-09-03', kwh: 396, readingType: 'actual' as const, currentCharges: 25000, fixedCharges: 1600 }
    const r = compareBills(prev, curr)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const e = r.value.effects
    expect(e.period + e.consumption + e.price + e.fixed).toBeCloseTo(25000 - 18000, 6)
    expect(e.period).toBeGreaterThan(0)
    expect(r.value.flags.join(' ')).toMatch(/kWh per day/)
  })

  it('arrears raise the amount due but are not treated as consumption', () => {
    const curr = { periodStart: '2026-07-31', periodEnd: '2026-08-30', kwh: 300, readingType: 'actual' as const, currentCharges: 18000, fixedCharges: 1500, arrears: 9000 }
    const r = compareBills(prev, curr)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.effects.consumption).toBeCloseTo(0)
    expect(r.value.currentChargesChange).toBe(0)
    expect(r.value.amountDueChange.arrears).toBe(9000)
    expect(r.value.amountDueChange.total).toBe(9000)
    expect(r.value.flags.join(' ')).toMatch(/not new consumption/)
  })

  it('flags estimated readings', () => {
    const curr = { ...prev, periodStart: '2026-07-31', periodEnd: '2026-08-30', readingType: 'estimated' as const }
    const r = compareBills(prev, curr)
    expect(r.ok && r.value.flags.join(' ')).toMatch(/estimated/)
  })

  it('uses bill-specific periods', () => {
    const r = compareBills(prev, { ...prev, periodStart: '2026-07-31', periodEnd: '2026-08-15', kwh: 150 })
    expect(r.ok && r.value.current.days).toBe(15)
    expect(r.ok && r.value.current.kwhPerDay).toBeCloseTo(10)
  })

  it('rejects a period that ends before it starts', () => {
    expect(compareBills(prev, { ...prev, periodStart: '2026-09-01', periodEnd: '2026-08-01' }).ok).toBe(false)
  })

  it('reconciliation keeps the unexplained difference visible', () => {
    const r = reconcileWithBill({ low: 7, base: 8, high: 9 }, prev)
    expect(r.ok && r.value.billedKwhPerDay).toBeCloseTo(10)
    expect(r.ok && r.value.unexplainedKwhPerDay).toBeCloseTo(2)
    expect(r.ok && r.value.withinModelRange).toBe(false)
  })
})

describe('tariffs', () => {
  // Synthetic fixture — not a real JPS tariff.
  const tariff: TariffVersion = {
    id: 'test-fixture-1',
    name: 'Test fixture tariff',
    geography: 'test',
    customerClass: 'residential',
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    source: { title: 'Unit-test fixture', retrievedAt: '2026-10-12' },
    reviewStatus: 'approved',
    currency: 'JMD',
    components: [
      { kind: 'fixed', label: 'Customer charge', amountPerPeriod: 2500 },
      { kind: 'energy_blocks', label: 'Energy', blocks: [{ upToKwh: 100, ratePerKwh: 10 }, { upToKwh: null, ratePerKwh: 20 }] },
      { kind: 'per_kwh', label: 'Fuel', ratePerKwh: 30 },
      { kind: 'percent', label: 'Tax', percent: 10 },
    ],
  }

  it('prices components in order, tax on subtotal', () => {
    const r = periodCost(tariff, 200, '2026-06-01')
    expect(r.ok && r.value.total).toBeCloseTo((2500 + 1000 + 2000 + 6000) * 1.1)
  })

  it('average cost is not the marginal saving', () => {
    const avg = periodCost(tariff, 200, '2026-06-01')
    const marg = marginalSaving(tariff, 200, 10, '2026-06-01')
    expect(avg.ok && marg.ok).toBe(true)
    if (!avg.ok || !marg.ok) return
    expect(marg.value.perKwh).toBeCloseTo((20 + 30) * 1.1)
    expect(avg.value.averagePerKwh).not.toBeCloseTo(marg.value.perKwh)
  })

  it('refuses draft or out-of-date tariffs', () => {
    expect(periodCost({ ...tariff, reviewStatus: 'draft' }, 100, '2026-06-01').ok).toBe(false)
    expect(periodCost(tariff, 100, '2025-12-31').ok).toBe(false)
    expect(periodCost({ ...tariff, effectiveTo: '2026-05-01' }, 100, '2026-06-01').ok).toBe(false)
  })
})

describe('scenarios', () => {
  const fridge: ScenarioDevice = {
    deviceId: 'd-fridge', name: 'Fridge', quantity: 1, simultaneous: true, essential: true, motorLoad: true,
    load: { kind: 'cycling', runningWatts: mf(150), dutyCyclePct: ce(40) }, startupWatts: mf(600),
  }
  const router: ScenarioDevice = {
    deviceId: 'd-router', name: 'Router', quantity: 1, simultaneous: true, essential: true,
    load: { kind: 'steady', watts: m(12), hoursPerDay: m(24) },
  }
  const fans: ScenarioDevice = {
    deviceId: 'd-fan', name: 'Fan', quantity: 2, simultaneous: false, essential: false,
    load: { kind: 'steady', watts: mf(50), hoursPerDay: ce(6) },
  }

  it('separates nameplate sum, simultaneous load, startup peak and energy', () => {
    const r = evaluateScenario([fridge, router, fans])
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.nameplateSumWatts).toBe(150 + 12 + 100)
    expect(r.value.simultaneousWatts).toBe(162)
    expect(r.value.startupPeakWatts).toBe(162 + 450)
    expect(r.value.kwhPerDay.base).toBeCloseTo(1.44 + 0.288 + 0.6)
    expect(r.value.essentialKwhPerDay.base).toBeCloseTo(1.44 + 0.288)
  })

  it('does not double count a device listed twice', () => {
    const r = evaluateScenario([fridge, fridge])
    expect(r.ok && r.value.kwhPerDay.base).toBeCloseTo(1.44)
    expect(r.ok && r.warnings[0]).toMatch(/counted once/)
  })

  it('preserves unknown loads instead of zeroing them', () => {
    const ac: ScenarioDevice = {
      deviceId: 'd-ac', name: 'Bedroom AC', quantity: 1, simultaneous: true, essential: false, motorLoad: true,
      load: { kind: 'cooling', capacityBtuh: mf(12000), hoursPerDay: ce(8) },
    }
    const r = evaluateScenario([router, ac])
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.unresolved.map((u) => u.deviceId)).toContain('d-ac')
    expect(r.value.kwhPerDay.base).toBeCloseTo(0.288)
  })

  it('an unresolved simultaneous motor load makes the startup peak unknown', () => {
    const ac: ScenarioDevice = {
      deviceId: 'd-ac', name: 'Bedroom AC', quantity: 1, simultaneous: true, essential: false, motorLoad: true,
      load: { kind: 'cooling', capacityBtuh: mf(12000), hoursPerDay: ce(8) },
    }
    const r = evaluateScenario([router, ac])
    expect(r.ok && r.value.startupPeakWatts).toBeNull()
    expect(r.ok && r.value.startupUnknown).toEqual(['Bedroom AC'])
  })

  it('startup peak is unknown when a motor has no startup figure', () => {
    const r = evaluateScenario([{ ...fridge, startupWatts: undefined }])
    expect(r.ok && r.value.startupPeakWatts).toBeNull()
    expect(r.ok && r.value.startupUnknown).toEqual(['Fridge'])
  })

  it('recalculates when an appliance is removed', () => {
    const a = evaluateScenario([fridge, router])
    const b = evaluateScenario([router])
    expect(a.ok && b.ok).toBe(true)
    if (!a.ok || !b.ok) return
    expect(b.value.kwhPerDay.base).toBeLessThan(a.value.kwhPerDay.base)
    expect(b.value.startupPeakWatts).toBe(12)
  })
})

describe('helpers and runs', () => {
  it('mAh needs its voltage to become energy', () => {
    expect(whFromMah(10000, 3.7)).toBeCloseTo(37)
  })

  it('weakest basis wins', () => {
    expect(weakestBasis(['measured', 'assumed', 'manufacturer'])).toBe('assumed')
  })

  it('run hash ignores key order and carries the engine version', () => {
    const a = buildRun('scenario', { b: 1, a: [1, { y: 2, x: 1 }] }, {})
    const b = buildRun('scenario', { a: [1, { x: 1, y: 2 }], b: 1 }, {})
    expect(a.inputHash).toBe(b.inputHash)
    expect(a.engineVersion).toMatch(/^\d+\.\d+\.\d+$/)
    expect(stableStringify({ z: undefined, a: 1 })).toBe('{"a":1}')
  })
})
