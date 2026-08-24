import { describe, it, expect } from 'vitest'
import { orderEditable } from '@/lib/orderEditability'
import { OUT_FOR_DELIVERY_STAGE } from '@/lib/pipeline'

describe('orderEditable', () => {
  it('is editable when unpaid, not cancelled, and before the out-for-delivery stage', () => {
    expect(orderEditable({ paid: false, status: 'PENDING', stage: 0 })).toBe(true)
    expect(orderEditable({ paid: false, status: 'PACKED', stage: OUT_FOR_DELIVERY_STAGE - 1 })).toBe(true)
  })

  it('is not editable once paid', () => {
    expect(orderEditable({ paid: true, status: 'PENDING', stage: 0 })).toBe(false)
  })

  it('is not editable once cancelled', () => {
    expect(orderEditable({ paid: false, status: 'CANCELLED', stage: 0 })).toBe(false)
  })

  it('is not editable at or past the out-for-delivery stage', () => {
    expect(orderEditable({ paid: false, status: 'OUT', stage: OUT_FOR_DELIVERY_STAGE })).toBe(false)
    expect(orderEditable({ paid: false, status: 'DONE', stage: OUT_FOR_DELIVERY_STAGE + 1 })).toBe(false)
  })
})
