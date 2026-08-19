import { describe, it, expect } from 'vitest'
import { recommendedAverageWatts, buildEnergyBudget, CONSERVATION_TIPS } from '@/lib/energyCheckup/energyBudget'

describe('recommendedAverageWatts', () => {
  it('divides reserve by target hours', () => {
    expect(recommendedAverageWatts(650, 10)).toBe(65)
  })

  it('returns null for a zero or negative target', () => {
    expect(recommendedAverageWatts(650, 0)).toBeNull()
    expect(recommendedAverageWatts(650, -3)).toBeNull()
  })
})

describe('buildEnergyBudget', () => {
  it('sorts tips by priority (lowest first)', () => {
    const budget = buildEnergyBudget(650, 10)
    const priorities = budget.tips.map((t) => t.priority)
    expect(priorities).toEqual([...priorities].sort((a, b) => a - b))
  })

  it('every tip has real, non-empty guidance', () => {
    for (const tip of CONSERVATION_TIPS) {
      expect(tip.text.length).toBeGreaterThan(15)
    }
  })
})
