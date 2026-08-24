import { describe, it, expect } from 'vitest'
import { triageCategories, CATEGORY_TRIAGE } from '@/lib/energyCheckup/triage'

describe('triageCategories', () => {
  it('tags every category the checkup can produce', () => {
    const categories = [
      { category: 'cooling', kwh: 100, pct: 40 },
      { category: 'refrigeration', kwh: 50, pct: 20 },
      { category: 'water', kwh: 60, pct: 24 },
      { category: 'lighting', kwh: 20, pct: 8 },
      { category: 'electronics', kwh: 15, pct: 6 },
      { category: 'other', kwh: 5, pct: 2 },
    ]
    const rows = triageCategories(categories)
    expect(rows).toHaveLength(6)
    expect(rows.find((r) => r.category === 'refrigeration')?.tier).toBe('keep-running')
    expect(rows.find((r) => r.category === 'cooling')?.tier).toBe('turn-off-first')
    expect(rows.find((r) => r.category === 'water')?.tier).toBe('turn-off-first')
    expect(rows.find((r) => r.category === 'other')?.tier).toBe('case-by-case')
  })

  it('preserves the kwh/pct already computed rather than recomputing anything', () => {
    const rows = triageCategories([{ category: 'lighting', kwh: 12.5, pct: 33 }])
    expect(rows[0].kwh).toBe(12.5)
    expect(rows[0].pct).toBe(33)
  })

  it('silently drops an unrecognised category rather than throwing', () => {
    const rows = triageCategories([{ category: 'not-a-real-category', kwh: 10, pct: 10 }])
    expect(rows).toHaveLength(0)
  })

  it('every category has real guidance text, not a placeholder', () => {
    for (const meta of Object.values(CATEGORY_TRIAGE)) {
      expect(meta.guidance.length).toBeGreaterThan(10)
    }
  })

  it('personalises cooling guidance when the appliances show fans only, no AC', () => {
    const categories = [{ category: 'cooling', kwh: 40, pct: 39 }]
    const appliances = [{ id: 'fans', kwh: 40 }]
    const rows = triageCategories(categories, appliances)
    expect(rows[0].guidance).toMatch(/don't have AC/i)
    expect(rows[0].guidance).not.toMatch(/air conditioning is typically/i)
    // Still shed first, regardless of the wording — fans are still the lightest priority.
    expect(rows[0].tier).toBe('turn-off-first')
  })

  it('keeps the generic AC-aware guidance when AC actually contributed to the cooling load', () => {
    const categories = [{ category: 'cooling', kwh: 100, pct: 40 }]
    const appliances = [{ id: 'ac', kwh: 85 }, { id: 'fans', kwh: 15 }]
    const rows = triageCategories(categories, appliances)
    expect(rows[0].guidance).toMatch(/air conditioning is typically/i)
  })
})
