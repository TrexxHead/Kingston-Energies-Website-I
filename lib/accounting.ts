import { prisma } from '@/lib/prisma'

/**
 * Accounting settings (Jamaica GCT). GCT-inclusive means the displayed prices
 * already include GCT, so the tax is backed out of sales for the P&L.
 */
export interface AccountingConfig {
  gctRate: number // percent, e.g. 15
  gctInclusive: boolean
}

const KEY = 'accounting'
export const DEFAULT_ACCOUNTING: AccountingConfig = { gctRate: 15, gctInclusive: true }

export async function getAccounting(): Promise<AccountingConfig> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: KEY } })
    return row ? { ...DEFAULT_ACCOUNTING, ...(JSON.parse(row.value) as Partial<AccountingConfig>) } : DEFAULT_ACCOUNTING
  } catch {
    return DEFAULT_ACCOUNTING
  }
}

export async function saveAccounting(cfg: AccountingConfig): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: JSON.stringify(cfg) },
    update: { value: JSON.stringify(cfg) },
  })
}
