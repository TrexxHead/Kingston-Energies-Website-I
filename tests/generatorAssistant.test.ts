import { describe, it, expect } from 'vitest'
import { sizeGenerator, CO_SAFETY_RULES } from '@/lib/energyCheckup/generatorAssistant'

describe('sizeGenerator', () => {
  it('sums running watts across all loads', () => {
    const result = sizeGenerator([
      { name: 'Fridge', runningWatts: 150, startupWatts: null },
      { name: 'Fan', runningWatts: 60, startupWatts: null },
    ])
    expect(result.totalRunningWatts).toBe(210)
    expect(result.largestStartupWatts).toBeNull()
    expect(result.recommendedMinWatts).toBe(210)
  })

  it('adds only the single largest startup surge, not the sum of all surges', () => {
    const result = sizeGenerator([
      { name: 'Fridge', runningWatts: 150, startupWatts: 1200 },
      { name: 'AC', runningWatts: 900, startupWatts: 2400 },
      { name: 'Lights', runningWatts: 40, startupWatts: null },
    ])
    expect(result.totalRunningWatts).toBe(1090)
    expect(result.largestStartupWatts).toBe(2400)
    // other running watts (150 + 40) + the AC's own surge (2400)
    expect(result.recommendedMinWatts).toBe(190 + 2400)
  })

  it('handles an empty load list', () => {
    const result = sizeGenerator([])
    expect(result.totalRunningWatts).toBe(0)
    expect(result.recommendedMinWatts).toBe(0)
  })
})

describe('CO_SAFETY_RULES', () => {
  it('always includes the never-run-indoors rule', () => {
    expect(CO_SAFETY_RULES.some((r) => /never run a generator indoors/i.test(r))).toBe(true)
  })

  it('every rule is real, substantive guidance', () => {
    for (const rule of CO_SAFETY_RULES) {
      expect(rule.length).toBeGreaterThan(20)
    }
  })
})
