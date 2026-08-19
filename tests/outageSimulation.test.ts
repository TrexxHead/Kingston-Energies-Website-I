import { describe, it, expect } from 'vitest'
import { simulateDepletion, compareScenarios } from '@/lib/energyCheckup/outageSimulation'

describe('simulateDepletion', () => {
  it('returns an empty projection for a non-positive reserve or load', () => {
    expect(simulateDepletion(0, 50)).toEqual([])
    expect(simulateDepletion(500, 0)).toEqual([])
  })

  it('depletes linearly by the average load each hour', () => {
    const points = simulateDepletion(300, 100)
    expect(points[0]).toEqual({ hour: 0, remainingWh: 300 })
    expect(points[1]).toEqual({ hour: 1, remainingWh: 200 })
    expect(points[2]).toEqual({ hour: 2, remainingWh: 100 })
    expect(points[3]).toEqual({ hour: 3, remainingWh: 0 })
  })

  it('never goes negative and stops once it hits zero', () => {
    const points = simulateDepletion(50, 100)
    expect(points.at(-1)!.remainingWh).toBe(0)
    expect(points.every((p) => p.remainingWh >= 0)).toBe(true)
  })

  it('respects the maxHours cap for a very small load', () => {
    const points = simulateDepletion(100000, 1, 10)
    expect(points.at(-1)!.hour).toBe(10)
  })
})

describe('compareScenarios', () => {
  it('a lower average load produces a longer runtime', () => {
    const [current, saver] = compareScenarios(1000, [
      { label: 'Current', avgLoadWatts: 100 },
      { label: 'Energy Saver', avgLoadWatts: 50 },
    ])
    expect(saver.runtimeHours!).toBeGreaterThan(current.runtimeHours!)
  })

  it('returns null runtime for a zero-watt scenario', () => {
    const [result] = compareScenarios(1000, [{ label: 'Idle', avgLoadWatts: 0 }])
    expect(result.runtimeHours).toBeNull()
  })
})
