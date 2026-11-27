import { describe, it, expect } from 'vitest'
import { defaultQuote, quoteTotals, designSnapshotSchema, quoteSchema, stageIndex, newProjectNo, type DesignSnapshot } from '@/lib/solarProjects'

const design: DesignSnapshot = {
  engine: '1.9.0', type: 'hybrid', source: 'bill', billMonthlyKwh: 380, dailyWh: 12667, nightWh: 6333, storageWh: 6333, peakW: 2550, surgeW: 3050, backup: 'night',
  peakSunHours: 5, derate: 0.74, modules: 7, moduleWatts: 550, kwp: 3.85, expectedDailyKwh: 14.2, inverterKw: 5, batteryKwh: 7.4, batteryDcCurrentA: 104, solarShare: 1, priceRange: null, assumptions: ['Half of the day’s use is after dark: 50 %'],
}

describe('solar projects', () => {
  it('validates the design snapshot the designer sends', () => {
    expect(designSnapshotSchema.safeParse(design).success).toBe(true)
    expect(designSnapshotSchema.safeParse({ ...design, kwp: -1 }).success).toBe(false)
  })

  it('starts a quote from the design with every price left blank (capstone structure)', () => {
    const q = defaultQuote(design, false)
    expect(quoteSchema.safeParse(q).success).toBe(true)
    expect(q.lines.every((l) => l.unitPrice === null)).toBe(true)
    expect(q.lines.find((l) => l.item === 'Solar panels')!.qty).toBe(7)
    expect(q.lines.find((l) => l.item === 'Battery bank')!.spec).toMatch(/7\.4 kWh/)
    expect(q.lines.find((l) => l.item === 'Battery main breaker')!.spec).toMatch(/≥ 130 A/)
    expect(q.lines.some((l) => l.section === 'inspection' && /inspection/i.test(l.item))).toBe(true)
    expect(q.lines.some((l) => /Standard Offer/.test(l.item))).toBe(false)
    expect(defaultQuote(design, true).lines.some((l) => /Standard Offer/.test(l.item))).toBe(true)
    expect(defaultQuote({ ...design, type: 'grid_tied', batteryKwh: null }, false).lines.some((l) => /Battery/.test(l.item))).toBe(false)
  })

  it('totals a quote with GCT only on marked lines, counting unpriced lines', () => {
    const t = quoteTotals({
      gctRatePct: 15,
      lines: [
        { id: 'a', section: 'equipment', item: 'Panels', spec: '', qty: 7, unit: 'ea', unitPrice: 28000, gct: false },
        { id: 'b', section: 'labour', item: 'Install', spec: '', qty: 1, unit: 'job', unitPrice: 100000, gct: true },
        { id: 'c', section: 'other', item: 'TBC', spec: '', qty: 1, unit: 'ea', unitPrice: null, gct: true },
      ],
    })
    expect(t).toEqual({ subtotal: 296000, gct: 15000, total: 311000, unpriced: 1 })
  })

  it('orders stages and makes project numbers', () => {
    expect(stageIndex('enquiry')).toBe(0)
    expect(stageIndex('handover')).toBe(9)
    expect(stageIndex('quote_sent')).toBeLessThan(stageIndex('quote_accepted'))
    expect(newProjectNo()).toMatch(/^SP-[A-HJ-NP-Z2-9]{6}$/)
  })
})
