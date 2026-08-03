import { describe, it, expect, vi, beforeEach } from 'vitest'

const findUniqueCampaignMock = vi.fn()
const updateCampaignMock = vi.fn()
const createExpenseMock = vi.fn()
const postExpenseMock = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    campaign: {
      findUnique: (...args: unknown[]) => findUniqueCampaignMock(...args),
      update: (...args: unknown[]) => updateCampaignMock(...args),
    },
    expense: {
      create: (...args: unknown[]) => createExpenseMock(...args),
    },
  },
}))
vi.mock('@/lib/ledger/post', () => ({
  postExpense: (...args: unknown[]) => postExpenseMock(...args),
}))
vi.mock('@/lib/suppression', () => ({ filterSuppressed: (emails: string[]) => Promise.resolve(emails) }))
vi.mock('@/lib/segments', () => ({ segmentMembers: vi.fn() }))
vi.mock('@/lib/unsubscribeToken', () => ({ unsubscribeToken: () => 'token' }))
vi.mock('@/lib/email', () => ({
  sendPersonalizedBulkEmail: vi.fn().mockResolvedValue(0),
  wrapEmailHtml: (title: string, body: string) => `<html>${title}${body}</html>`,
}))

const baseCampaign = {
  id: 'c1',
  name: 'Flash sale',
  channel: 'SOCIAL',
  subject: null,
  body: null,
  spend: null,
  expenseId: null,
  segment: null,
}

beforeEach(() => {
  findUniqueCampaignMock.mockReset()
  updateCampaignMock.mockReset().mockResolvedValue({})
  createExpenseMock.mockReset()
  postExpenseMock.mockReset().mockResolvedValue(undefined)
})

describe('sendCampaign spend-to-expense posting', () => {
  it('posts a Marketing expense and links it when spend is set and not yet posted', async () => {
    findUniqueCampaignMock.mockResolvedValueOnce({ ...baseCampaign, spend: 5000 })
    createExpenseMock.mockResolvedValueOnce({ id: 'exp1', category: 'Marketing', description: 'Campaign: Flash sale', amount: 5000, spentAt: new Date() })
    const { sendCampaign } = await import('@/lib/campaigns')
    await sendCampaign('c1')

    expect(createExpenseMock).toHaveBeenCalledWith({
      data: { category: 'Marketing', description: 'Campaign: Flash sale', amount: 5000, spentAt: expect.any(Date) },
    })
    expect(postExpenseMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'exp1' }))
    expect(updateCampaignMock).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { expenseId: 'exp1' } })
  })

  it('does not post an expense when spend is unset', async () => {
    findUniqueCampaignMock.mockResolvedValueOnce({ ...baseCampaign, spend: null })
    const { sendCampaign } = await import('@/lib/campaigns')
    await sendCampaign('c1')
    expect(createExpenseMock).not.toHaveBeenCalled()
  })

  it('does not double-post when an expense is already linked', async () => {
    findUniqueCampaignMock.mockResolvedValueOnce({ ...baseCampaign, spend: 5000, expenseId: 'exp1' })
    const { sendCampaign } = await import('@/lib/campaigns')
    await sendCampaign('c1')
    expect(createExpenseMock).not.toHaveBeenCalled()
  })
})
