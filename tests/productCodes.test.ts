import { describe, it, expect, vi, beforeEach } from 'vitest'

const countMock = vi.fn()
const findUniqueMock = vi.fn()
const findFirstMock = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      count: (...args: unknown[]) => countMock(...args),
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      findFirst: (...args: unknown[]) => findFirstMock(...args),
    },
  },
}))

beforeEach(() => {
  countMock.mockReset()
  findUniqueMock.mockReset()
  findFirstMock.mockReset()
})

describe('generateSku', () => {
  it('builds KE-<category code>-<seq> from the existing count in that category', async () => {
    countMock.mockResolvedValueOnce(4)
    findUniqueMock.mockResolvedValueOnce(null)
    const { generateSku } = await import('@/lib/productCodes')
    expect(await generateSku('CHARGERS')).toBe('KE-CH-005')
  })

  it('falls back to XX for no category', async () => {
    countMock.mockResolvedValueOnce(0)
    findUniqueMock.mockResolvedValueOnce(null)
    const { generateSku } = await import('@/lib/productCodes')
    expect(await generateSku(null)).toBe('KE-XX-001')
  })

  it('increments past a collision instead of returning a duplicate', async () => {
    countMock.mockResolvedValueOnce(0)
    findUniqueMock.mockResolvedValueOnce({ id: 'existing' }).mockResolvedValueOnce(null)
    const { generateSku } = await import('@/lib/productCodes')
    expect(await generateSku('POWERBANKS')).toBe('KE-PB-002')
  })
})

describe('generateBarcode', () => {
  it('generates a 13-digit code with a valid EAN-13 check digit', async () => {
    findFirstMock.mockResolvedValueOnce(null)
    const { generateBarcode } = await import('@/lib/productCodes')
    const code = await generateBarcode()
    expect(code).toMatch(/^\d{13}$/)
    let sum = 0
    for (let i = 0; i < 12; i++) sum += Number(code[i]) * (i % 2 === 0 ? 1 : 3)
    expect((10 - (sum % 10)) % 10).toBe(Number(code[12]))
  })

  it('retries on a barcode collision', async () => {
    findFirstMock.mockResolvedValueOnce({ id: 'existing' }).mockResolvedValueOnce(null)
    const { generateBarcode } = await import('@/lib/productCodes')
    const code = await generateBarcode()
    expect(code).toMatch(/^\d{13}$/)
    expect(findFirstMock).toHaveBeenCalledTimes(2)
  })
})
