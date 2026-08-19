import { describe, it, expect } from 'vitest'
import {
  wattHours,
  usableWh,
  usableAcWh,
  runtimeHours,
  checkSurgeCapacity,
  checkContinuousLoad,
  DEFAULT_USABLE_BATTERY_FRACTION,
  DEFAULT_INVERTER_EFFICIENCY,
} from '@/lib/energyCheckup/backupPower'
import { capacityWh } from '@/lib/catalog'

describe('backupPower', () => {
  it('wattHours is a plain multiplication', () => {
    expect(wattHours(60, 3)).toBe(180)
  })

  it('usableWh is always less than nominal', () => {
    const nominal = 1000
    const usable = usableWh(nominal)
    expect(usable).toBeLessThan(nominal)
    expect(usable).toBe(nominal * DEFAULT_USABLE_BATTERY_FRACTION)
  })

  it('usableAcWh stacks battery loss and inverter loss (always less than usableWh)', () => {
    const nominal = 1000
    expect(usableAcWh(nominal)).toBe(nominal * DEFAULT_USABLE_BATTERY_FRACTION * DEFAULT_INVERTER_EFFICIENCY)
    expect(usableAcWh(nominal)).toBeLessThan(usableWh(nominal))
  })

  it('accepts a custom usable fraction / inverter efficiency', () => {
    expect(usableWh(1000, 0.9)).toBe(900)
    expect(usableAcWh(1000, 0.9, 0.8)).toBe(720)
  })

  it('runtimeHours divides usable energy by average load', () => {
    expect(runtimeHours(850, 50)).toBeCloseTo(17)
  })

  it('runtimeHours returns null instead of Infinity/garbage for a zero or negative load', () => {
    expect(runtimeHours(850, 0)).toBeNull()
    expect(runtimeHours(850, -5)).toBeNull()
  })

  describe('checkSurgeCapacity', () => {
    it('is unknown when either figure is missing', () => {
      expect(checkSurgeCapacity(null, 1200)).toBe('unknown')
      expect(checkSurgeCapacity(1500, null)).toBe('unknown')
      expect(checkSurgeCapacity(1500, 0)).toBe('unknown')
    })

    it('is ok with real headroom, tight right at the edge, insufficient below the appliance\'s draw', () => {
      expect(checkSurgeCapacity(1800, 1200)).toBe('ok') // 1.5x
      expect(checkSurgeCapacity(1250, 1200)).toBe('tight') // ~1.04x
      expect(checkSurgeCapacity(1000, 1200)).toBe('insufficient')
    })
  })

  describe('checkContinuousLoad', () => {
    it('is unknown when the source has no rated output or the load is zero', () => {
      expect(checkContinuousLoad(null, 60)).toBe('unknown')
      expect(checkContinuousLoad(87, 0)).toBe('unknown')
    })

    it('is ok with real headroom, tight right at the edge, insufficient above rated output', () => {
      expect(checkContinuousLoad(87, 60)).toBe('ok') // 1.45x
      expect(checkContinuousLoad(87, 80)).toBe('tight') // ~1.09x
      expect(checkContinuousLoad(87, 120)).toBe('insufficient')
    })
  })

  describe('catalog integration — never invents a capacity', () => {
    it('derives a Wh figure from any product\'s real mAh spec, regardless of category', () => {
      expect(capacityWh({ cap: '10,400mAh' })).toBeCloseTo((10400 * 3.7) / 1000)
      // The Anker Power Station's real spec (60,000mAh) — same formula, no special-casing by category.
      expect(capacityWh({ cap: '60,000mAh' })).toBeCloseTo((60000 * 3.7) / 1000)
    })

    it('never misreads a non-capacity spec (e.g. a solar panel\'s wattage rating) as mAh', () => {
      expect(capacityWh({ cap: '100W' })).toBeNull()
    })

    it('returns null (not a fabricated number) for a product with no capacity spec at all', () => {
      expect(capacityWh({ cap: undefined })).toBeNull()
    })
  })
})
