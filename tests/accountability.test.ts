import { describe, it, expect } from 'vitest'
import { buildNextActions } from '@/app/hub/storm-prep/_lib/accountability'

const ALL_DONE = {
  checkupDone: true,
  hasBackupDevice: true,
  checklistPct: 100,
  familyPlanSaved: true,
  resourcesTracked: true,
}

describe('buildNextActions', () => {
  it('returns nothing when every signal is complete', () => {
    expect(buildNextActions(ALL_DONE)).toEqual([])
  })

  it('prioritizes the Energy Checkup above everything else when nothing is done', () => {
    const actions = buildNextActions({
      checkupDone: false,
      hasBackupDevice: false,
      checklistPct: 0,
      familyPlanSaved: false,
      resourcesTracked: false,
    })
    expect(actions[0].id).toBe('checkup')
    expect(actions).toHaveLength(5)
  })

  it('only surfaces the checklist action when checklist is incomplete', () => {
    const actions = buildNextActions({ ...ALL_DONE, checklistPct: 60 })
    expect(actions).toEqual([{ id: 'checklist', text: expect.any(String), href: '/hub/storm-prep/checklist', priority: 3 }])
  })

  it('sorts by priority', () => {
    const actions = buildNextActions({ ...ALL_DONE, hasBackupDevice: false, familyPlanSaved: false })
    const priorities = actions.map((a) => a.priority)
    expect(priorities).toEqual([...priorities].sort((a, b) => a - b))
  })
})
