import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseCsv, recordsFromSheet, isAllowedSheetUrl, SYNC_ACTOR } from '@/lib/refdata/priceSheets'
import type { RefRecord } from '@/lib/refdata/types'

// In-memory SiteSetting for the store.
let stored: string | null = null
vi.mock('@/lib/prisma', () => ({
  prisma: {
    siteSetting: {
      findUnique: async () => (stored === null ? null : { value: stored }),
      create: async ({ data }: { data: { value: string } }) => ((stored = data.value), {}),
      updateMany: async ({ where, data }: { where: { value: string }; data: { value: string } }) => (where.value === stored ? ((stored = data.value), { count: 1 }) : { count: 0 }),
    },
  },
}))
import { applySheetRecords, listRecords } from '@/lib/refdata/store.server'

const today = '2026-10-17'

describe('price sheets', () => {
  it('parses quoted CSV', () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi"""\n\n')).toEqual([['a', 'b'], ['x, y', 'say "hi"']])
  })

  it('builds one fuel record from the newest rows and reports bad lines', () => {
    const csv = 'grade,price_per_litre,effective_from,source_title\nE10 87,J$190.10,2026-10-08,TEST notice\nE10 87,195.50,2026-10-15,TEST notice\nULSD,"201.00",2026-10-15,TEST notice\nE10 90,abc,2026-10-15,\n'
    const { records, errors } = recordsFromSheet('fuel_price', csv, today)
    expect(records).toHaveLength(1)
    expect(records[0].effectiveFrom).toBe('2026-10-15')
    expect((records[0].data as { grades: unknown[] }).grades).toEqual([
      { grade: 'E10 87', pricePerLitre: 195.5 },
      { grade: 'ULSD', pricePerLitre: 201 },
    ])
    expect(errors[0]).toMatch(/Line 5: source_title is required/)
  })

  it('reads charging bands and rejects impossible times', () => {
    const csv = [
      'operator,price_per_kwh,session_fee,band1_label,band1_start,band1_end,band1_days,band1_price_per_kwh,source_title',
      'TEST Op,60,100,Evening,18:00,6:00,Mon-Fri,120,TEST app screenshot',
      'TEST Bad,60,,Evening,25:00,06:00,,120,TEST',
    ].join('\n')
    const { records, errors } = recordsFromSheet('charging_price', csv, today)
    expect(records).toHaveLength(1)
    expect(records[0].key).toBe('charging_price:test op')
    expect(records[0].data).toMatchObject({ operator: 'TEST Op', pricePerKwh: 60, sessionFee: 100, periods: [{ label: 'Evening', start: '18:00', end: '06:00', days: [1, 2, 3, 4, 5], pricePerKwh: 120 }] })
    expect(errors[0]).toMatch(/^Line 3: periods\.0\.start/)
  })

  it('updates the fuel line on approved tariffs', () => {
    const tariff = {
      id: 't1',
      kind: 'tariff',
      name: 'TEST Rate 10',
      status: 'approved',
      data: { customerClass: 'Rate 10 — Residential', geography: 'Jamaica (JPS)', components: [{ kind: 'fixed', label: 'Customer charge', amountPerPeriod: 500 }, { kind: 'per_kwh', label: 'Fuel & IPP charge', ratePerKwh: 30 }] },
    } as unknown as RefRecord<'tariff'>
    const { records, errors } = recordsFromSheet('tariff_fuel', 'fuel_rate_per_kwh,effective_from,source_title\n31.25,2026-10-01,TEST JPS notice\n', today, [tariff])
    expect(errors).toEqual([])
    expect(records[0].kind).toBe('tariff')
    expect((records[0].data as { components: { ratePerKwh?: number }[] }).components[1].ratePerKwh).toBe(31.25)
  })

  it('only fetches Google published-CSV links', () => {
    expect(isAllowedSheetUrl('https://docs.google.com/spreadsheets/d/e/x/pub?output=csv')).toBe(true)
    expect(isAllowedSheetUrl('http://docs.google.com/x')).toBe(false)
    expect(isAllowedSheetUrl('https://169.254.169.254/latest')).toBe(false)
  })
})

describe('applying a sheet', () => {
  beforeEach(() => {
    stored = null
  })
  const csv = (price: number, date = '2026-10-15') => `operator,price_per_kwh,effective_from,source_title\nTEST Op,${price},${date},TEST sheet\n`

  it('adds drafts once, skips unchanged prices, and replaces its own stale draft', async () => {
    const run = (price: number, autoApprove = false) => applySheetRecords(recordsFromSheet('charging_price', csv(price), today).records, { autoApprove, actor: SYNC_ACTOR })
    expect((await run(60)).added).toEqual(['TEST Op charging prices (draft)'])
    expect((await run(60)).unchanged).toBe(1)
    await run(65)
    const drafts = (await listRecords()).filter((r) => r.status === 'draft')
    expect(drafts).toHaveLength(1)
    expect((drafts[0].data as { pricePerKwh: number }).pricePerKwh).toBe(65)
  })

  it('auto-approve retires the version it replaces', async () => {
    const run = (price: number, date: string) => applySheetRecords(recordsFromSheet('charging_price', csv(price, date), today).records, { autoApprove: true, actor: SYNC_ACTOR })
    await run(60, '2026-10-01')
    await run(70, '2026-10-15')
    const all = await listRecords()
    expect(all.map((r) => [(r.data as { pricePerKwh: number }).pricePerKwh, r.status])).toEqual([
      [60, 'retired'],
      [70, 'approved'],
    ])
    expect((await run(70, '2026-10-16')).unchanged).toBe(1)
  })
})
