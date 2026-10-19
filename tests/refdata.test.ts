import { describe, it, expect } from 'vitest'
import { parseData, activeRecord, toTariffVersion, inEffect, publicView, type RefRecord } from '@/lib/refdata/types'
import { periodCost } from '@/lib/energy/engine/tariff'

// Synthetic numbers for tests only — never shipped as real rates.
const tariffData = {
  customerClass: 'TEST class',
  geography: 'Test',
  components: [
    { kind: 'fixed', label: 'Customer charge', amountPerPeriod: 500 },
    { kind: 'energy_blocks', label: 'Energy', blocks: [{ upToKwh: 100, ratePerKwh: 10 }, { upToKwh: null, ratePerKwh: 20 }] },
    { kind: 'per_kwh', label: 'Fuel', ratePerKwh: 5 },
    { kind: 'percent', label: 'Tax', percent: 10 },
  ],
}

function rec(over: Partial<RefRecord>): RefRecord {
  return {
    id: 'r1',
    kind: 'tariff',
    name: 'TEST tariff',
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    source: { title: 'Test schedule', retrievedAt: '2026-01-01' },
    status: 'approved',
    createdBy: 'a@x',
    createdAt: '2026-01-01T00:00:00Z',
    reviewedBy: 'b@x',
    reviewedAt: '2026-01-02T00:00:00Z',
    data: parseData('tariff', tariffData).ok ? (tariffData as RefRecord['data']) : (null as never),
    ...over,
  } as RefRecord
}

describe('reference data validation', () => {
  it('accepts a well-formed tariff and rejects broken block structures', () => {
    expect(parseData('tariff', tariffData).ok).toBe(true)
    const noOpenBlock = { ...tariffData, components: [{ kind: 'energy_blocks', label: 'E', blocks: [{ upToKwh: 100, ratePerKwh: 10 }] }] }
    expect(parseData('tariff', noOpenBlock)).toMatchObject({ ok: false })
    const decreasing = { ...tariffData, components: [{ kind: 'energy_blocks', label: 'E', blocks: [{ upToKwh: 200, ratePerKwh: 1 }, { upToKwh: 100, ratePerKwh: 2 }, { upToKwh: null, ratePerKwh: 3 }] }] }
    expect(parseData('tariff', decreasing)).toMatchObject({ ok: false })
    expect(parseData('tariff', { ...tariffData, components: [] })).toMatchObject({ ok: false })
  })

  it('fuel prices must say whether they are pump or ex-refinery', () => {
    expect(parseData('fuel_price', { basis: 'pump_average', grades: [{ grade: 'E10 Gasolene 87', pricePerLitre: 200 }] }).ok).toBe(true)
    expect(parseData('fuel_price', { grades: [{ grade: 'E10 Gasolene 87', pricePerLitre: 200 }] }).ok).toBe(false)
  })

  it('shelters with coordinates must be in Jamaica', () => {
    expect(parseData('shelter_list', { shelters: [{ name: 'Test school', parish: 'Kingston', lat: 18.0, lng: -76.8 }] }).ok).toBe(true)
    expect(parseData('shelter_list', { shelters: [{ name: 'Test school', parish: 'Kingston', lat: 40, lng: -76.8 }] }).ok).toBe(false)
  })
})

describe('which record a calculator uses', () => {
  it('only approved records in effect on the date; the newest start wins', () => {
    const old = rec({ id: 'old', effectiveFrom: '2026-01-01', effectiveTo: '2026-07-01' })
    const cur = rec({ id: 'cur', effectiveFrom: '2026-07-01' })
    const draft = rec({ id: 'draft', effectiveFrom: '2026-09-01', status: 'draft' })
    expect(activeRecord([old, cur, draft], 'tariff', '2026-03-01')?.id).toBe('old')
    expect(activeRecord([old, cur, draft], 'tariff', '2026-10-01')?.id).toBe('cur')
    expect(activeRecord([draft], 'tariff', '2026-10-01')).toBeNull()
    expect(activeRecord([rec({ status: 'retired' })], 'tariff', '2026-10-01')).toBeNull()
    expect(inEffect({ effectiveFrom: '2026-01-01', effectiveTo: '2026-07-01' }, '2026-07-01')).toBe(false)
  })

  it('an approved tariff record prices bills through the engine', () => {
    const t = toTariffVersion(rec({}) as RefRecord<'tariff'>)
    const r = periodCost(t, 150, '2026-10-01')
    expect(r.ok).toBe(true)
    // 500 + (100×10 + 50×20) + 150×5 = 3250; tax 10% → 3575
    if (r.ok) expect(r.value.total).toBeCloseTo(3575)
    const draft = toTariffVersion(rec({ status: 'draft' }) as RefRecord<'tariff'>)
    expect(periodCost(draft, 150, '2026-10-01').ok).toBe(false)
  })

  it('the public view never exposes who entered or approved the data', () => {
    const v = publicView(rec({}))
    expect(JSON.stringify(v)).not.toMatch(/a@x|b@x/)
  })
})
