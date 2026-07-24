import { describe, it, expect } from 'vitest'
import { editDistance, fuzzyScore } from '@/lib/search'

describe('editDistance', () => {
  it('is zero for identical strings', () => {
    expect(editDistance('charger', 'charger')).toBe(0)
  })
  it('counts single edits', () => {
    expect(editDistance('charger', 'charer')).toBe(1)
    expect(editDistance('solar', 'polar')).toBe(1)
  })
})

describe('fuzzyScore', () => {
  it('scores exact and prefix matches highest', () => {
    expect(fuzzyScore('power bank', 'Power bank')).toBeGreaterThanOrEqual(90)
    expect(fuzzyScore('char', 'Charmast 10,400')).toBeGreaterThanOrEqual(80)
  })

  it('tolerates typos', () => {
    // "chargr" -> "charger"
    expect(fuzzyScore('chargr', 'Fast Charger')).toBeGreaterThan(0)
    // "solr" -> "solar"
    expect(fuzzyScore('solr', 'Solar Station')).toBeGreaterThan(0)
  })

  it('returns 0 for unrelated text', () => {
    expect(fuzzyScore('umbrella', 'Power bank')).toBe(0)
  })

  it('ranks a closer match above a looser one', () => {
    const exact = fuzzyScore('charger', 'Charger')
    const loose = fuzzyScore('charger', 'USB-C cable and charger kit')
    expect(exact).toBeGreaterThan(loose)
  })
})
