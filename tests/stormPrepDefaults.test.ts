import { describe, it, expect } from 'vitest'
import { DEFAULT_STORM_PREP_CONTENT, CATEGORY_LABEL, TIMING_LABEL, TIMING_ORDER } from '@/lib/stormPrepDefaults'
import { CATALOG } from '@/lib/catalog'

describe('stormPrepDefaults', () => {
  it('every default checklist item has a unique id', () => {
    const ids = DEFAULT_STORM_PREP_CONTENT.checklist.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every default checklist item has a category/timing with a real label', () => {
    for (const item of DEFAULT_STORM_PREP_CONTENT.checklist) {
      expect(CATEGORY_LABEL[item.category]).toBeTruthy()
      expect(TIMING_LABEL[item.timing]).toBeTruthy()
      expect(TIMING_ORDER).toContain(item.timing)
    }
  })

  it('every default kit product id exists in the real catalog', () => {
    for (const id of DEFAULT_STORM_PREP_CONTENT.kitProductIds) {
      expect(CATALOG.some((p) => p.id === id)).toBe(true)
    }
  })
})
