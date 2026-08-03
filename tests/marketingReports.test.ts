import { describe, it, expect, vi, beforeEach } from 'vitest'

const findManyCampaignMock = vi.fn()
const findManyMock = vi.fn()
const findUniqueMock = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    campaign: { findMany: (...args: unknown[]) => findManyCampaignMock(...args) },
    order: { findMany: (...args: unknown[]) => findManyMock(...args) },
  },
}))
vi.mock('@/lib/campaignAttribution', () => ({
  campaignStats: (...args: unknown[]) => findUniqueMock(...args),
}))

beforeEach(() => {
  findManyCampaignMock.mockReset()
  findManyMock.mockReset()
  findUniqueMock.mockReset()
})

describe('channelRoi', () => {
  it('returns null ROI for a channel with no logged spend, and a real number when spend exists', async () => {
    findManyCampaignMock.mockResolvedValueOnce([
      { id: 'c1', channel: 'EMAIL', spend: 1000 },
      { id: 'c2', channel: 'SOCIAL', spend: null },
    ])
    findUniqueMock.mockResolvedValueOnce({ orders: 2, revenue: 3000 }).mockResolvedValueOnce({ orders: 1, revenue: 500 })
    const { channelRoi } = await import('@/lib/marketingReports')
    const results = await channelRoi()

    const email = results.find((r) => r.channel === 'EMAIL')!
    expect(email.spend).toBe(1000)
    expect(email.revenue).toBe(3000)
    expect(email.roi).toBeCloseTo(2) // (3000-1000)/1000

    const social = results.find((r) => r.channel === 'SOCIAL')!
    expect(social.spend).toBe(0)
    expect(social.roi).toBeNull()

    const sms = results.find((r) => r.channel === 'SMS')!
    expect(sms.campaignsSent).toBe(0)
    expect(sms.roi).toBeNull()
  })
})

describe('cohortRetention', () => {
  it('groups customers by the month of their first order and computes repeat rate', async () => {
    findManyMock.mockResolvedValueOnce([
      { userId: 'u1', createdAt: new Date('2026-01-05') },
      { userId: 'u1', createdAt: new Date('2026-02-10') }, // u1 repeats
      { userId: 'u2', createdAt: new Date('2026-01-20') }, // u2 doesn't
      { userId: 'u3', createdAt: new Date('2026-02-01') }, // u3 alone in Feb cohort
    ])
    const { cohortRetention } = await import('@/lib/marketingReports')
    const rows = await cohortRetention()

    const jan = rows.find((r) => r.cohort === '2026-01')!
    expect(jan.newCustomers).toBe(2)
    expect(jan.repeatCustomers).toBe(1)
    expect(jan.retentionRate).toBeCloseTo(0.5)

    const feb = rows.find((r) => r.cohort === '2026-02')!
    expect(feb.newCustomers).toBe(1)
    expect(feb.repeatCustomers).toBe(0)
  })

  it('returns an empty array with no account-based orders', async () => {
    findManyMock.mockResolvedValueOnce([])
    const { cohortRetention } = await import('@/lib/marketingReports')
    expect(await cohortRetention()).toEqual([])
  })
})
