import { describe, it, expect } from 'vitest'
import { resolveTiers, TIER_DEFS } from '@/lib/energyCheckup/backupSystemTiers'
import { getProduct } from '@/lib/catalog'

describe('resolveTiers', () => {
  it('resolves every tier to real catalog products', () => {
    const tiers = resolveTiers()
    expect(tiers).toHaveLength(TIER_DEFS.length)
    for (const tier of tiers) {
      expect(tier.products.length).toBe(tier.productIds.length)
    }
  })

  it('sums the tier total from live catalog prices, never a hardcoded figure', () => {
    const tiers = resolveTiers()
    const balanced = tiers.find((t) => t.id === 'balanced')!
    const station = getProduct('st300')!
    expect(balanced.totalPrice).toBe(station.price)
  })

  it('tiers are ordered cheapest to most expensive', () => {
    const tiers = resolveTiers()
    const prices = tiers.map((t) => t.totalPrice)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
  })
})
