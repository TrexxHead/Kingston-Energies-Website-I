import { describe, it, expect } from 'vitest'
import { inferPhase, PHASE_ORDER, PHASE_META } from '@/app/hub/storm-prep/_lib/phase'

describe('inferPhase', () => {
  it('an active outage always reads as survive, regardless of checklist state', () => {
    expect(inferPhase({ outageActive: true, checklistPct: 0 })).toBe('survive')
    expect(inferPhase({ outageActive: true, checklistPct: 100 })).toBe('survive')
  })

  it('a mostly-complete checklist with no active outage reads as monitor', () => {
    expect(inferPhase({ outageActive: false, checklistPct: 80 })).toBe('monitor')
    expect(inferPhase({ outageActive: false, checklistPct: 100 })).toBe('monitor')
  })

  it('an incomplete checklist with no active outage reads as prepare', () => {
    expect(inferPhase({ outageActive: false, checklistPct: 0 })).toBe('prepare')
    expect(inferPhase({ outageActive: false, checklistPct: 79 })).toBe('prepare')
  })

  it('never infers recover automatically', () => {
    for (const checklistPct of [0, 50, 80, 100]) {
      for (const outageActive of [true, false]) {
        expect(inferPhase({ outageActive, checklistPct })).not.toBe('recover')
      }
    }
  })
})

describe('PHASE_META', () => {
  it('has real copy for every phase in PHASE_ORDER', () => {
    for (const phase of PHASE_ORDER) {
      expect(PHASE_META[phase].label.length).toBeGreaterThan(2)
      expect(PHASE_META[phase].description.length).toBeGreaterThan(10)
    }
  })
})
