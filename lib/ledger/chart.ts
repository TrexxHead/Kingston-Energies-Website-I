import type { AccountType } from '@prisma/client'

/**
 * The default chart of accounts for a Jamaican SME retailer.
 *
 * Codes are stable identifiers — the posting engine references these by code,
 * so anything marked `system` must not be renumbered or deleted. Admins can add
 * their own accounts freely alongside these.
 */
export interface SeedAccount {
  code: string
  name: string
  type: AccountType
  subtype?: string
  isBank?: boolean
  system?: boolean
}

/** Account codes the posting engine depends on. */
export const ACC = {
  CASH: '1010',
  BANK: '1020',
  RECEIVABLES: '1100',
  INVENTORY: '1200',
  PAYABLES: '2010',
  GCT_PAYABLE: '2200',
  OPENING_BALANCE_EQUITY: '3000',
  RETAINED_EARNINGS: '3200',
  DEFERRED_REVENUE: '2400',
  SALES: '4000',
  DELIVERY_INCOME: '4100',
  DISCOUNTS: '4900',
  COGS: '5000',
  INVENTORY_SHRINKAGE: '5100',
  DEPRECIATION: '6800',
  SALARIES: '6200',
  EMPLOYER_CONTRIBUTIONS: '6210',
  PAYE_PAYABLE: '2500',
  NIS_PAYABLE: '2510',
  NHT_PAYABLE: '2520',
  EDTAX_PAYABLE: '2530',
  HEART_PAYABLE: '2540',
  NET_PAY_PAYABLE: '2550',
  FX_GAIN: '4950',
  FX_LOSS: '6950',
  PREPAID: '1300',
  EQUIPMENT: '1500',
  ACCUM_DEPRECIATION: '1590',
} as const

export const CHART: SeedAccount[] = [
  // ---- Assets (1000–1999) ----
  { code: '1010', name: 'Cash on hand', type: 'ASSET', subtype: 'Current asset', isBank: true, system: true },
  { code: '1020', name: 'Bank account', type: 'ASSET', subtype: 'Current asset', isBank: true, system: true },
  { code: '1100', name: 'Accounts receivable', type: 'ASSET', subtype: 'Current asset', system: true },
  { code: '1200', name: 'Inventory', type: 'ASSET', subtype: 'Current asset', system: true },
  { code: '1300', name: 'Prepaid expenses', type: 'ASSET', subtype: 'Current asset' },
  { code: '1500', name: 'Equipment', type: 'ASSET', subtype: 'Fixed asset' },
  { code: '1590', name: 'Accumulated depreciation', type: 'ASSET', subtype: 'Fixed asset' },

  // ---- Liabilities (2000–2999) ----
  { code: '2010', name: 'Accounts payable', type: 'LIABILITY', subtype: 'Current liability', system: true },
  { code: '2200', name: 'GCT payable', type: 'LIABILITY', subtype: 'Current liability', system: true },
  { code: '2300', name: 'Customer deposits', type: 'LIABILITY', subtype: 'Current liability' },
  { code: '2400', name: 'Deferred revenue', type: 'LIABILITY', subtype: 'Current liability', system: true },
  // Payroll liabilities — amounts withheld or accrued but not yet remitted.
  { code: '2500', name: 'PAYE payable', type: 'LIABILITY', subtype: 'Payroll liability', system: true },
  { code: '2510', name: 'NIS payable', type: 'LIABILITY', subtype: 'Payroll liability', system: true },
  { code: '2520', name: 'NHT payable', type: 'LIABILITY', subtype: 'Payroll liability', system: true },
  { code: '2530', name: 'Education tax payable', type: 'LIABILITY', subtype: 'Payroll liability', system: true },
  { code: '2540', name: 'HEART payable', type: 'LIABILITY', subtype: 'Payroll liability', system: true },
  { code: '2550', name: 'Net pay payable', type: 'LIABILITY', subtype: 'Payroll liability', system: true },

  // ---- Equity (3000–3999) ----
  { code: '3000', name: 'Opening balance equity', type: 'EQUITY', subtype: 'Equity', system: true },
  { code: '3100', name: "Owner's capital", type: 'EQUITY', subtype: 'Equity' },
  { code: '3150', name: "Owner's drawings", type: 'EQUITY', subtype: 'Equity' },
  { code: '3200', name: 'Retained earnings', type: 'EQUITY', subtype: 'Equity', system: true },

  // ---- Revenue (4000–4999) ----
  { code: '4000', name: 'Product sales', type: 'REVENUE', subtype: 'Operating income', system: true },
  { code: '4100', name: 'Delivery income', type: 'REVENUE', subtype: 'Operating income', system: true },
  { code: '4900', name: 'Discounts given', type: 'REVENUE', subtype: 'Contra revenue', system: true },
  { code: '4950', name: 'Foreign exchange gain', type: 'REVENUE', subtype: 'Other income', system: true },

  // ---- Cost of sales (5000–5999) ----
  { code: '5000', name: 'Cost of goods sold', type: 'EXPENSE', subtype: 'Cost of sales', system: true },
  { code: '5100', name: 'Inventory shrinkage & write-offs', type: 'EXPENSE', subtype: 'Cost of sales', system: true },

  // ---- Operating expenses (6000–6999) ----
  // These line up 1:1 with EXPENSE_CATEGORIES in lib/finance.ts so a logged
  // expense always has an account to post to.
  { code: '6000', name: 'Inventory / Purchases', type: 'EXPENSE', subtype: 'Operating expense' },
  { code: '6100', name: 'Marketing', type: 'EXPENSE', subtype: 'Operating expense' },
  { code: '6200', name: 'Salaries', type: 'EXPENSE', subtype: 'Operating expense' },
  { code: '6210', name: 'Employer statutory contributions', type: 'EXPENSE', subtype: 'Operating expense', system: true },
  { code: '6300', name: 'Rent', type: 'EXPENSE', subtype: 'Operating expense' },
  { code: '6400', name: 'Utilities', type: 'EXPENSE', subtype: 'Operating expense' },
  { code: '6500', name: 'Shipping & Delivery', type: 'EXPENSE', subtype: 'Operating expense' },
  { code: '6600', name: 'Software & Fees', type: 'EXPENSE', subtype: 'Operating expense' },
  { code: '6700', name: 'Bank charges', type: 'EXPENSE', subtype: 'Operating expense' },
  { code: '6800', name: 'Depreciation', type: 'EXPENSE', subtype: 'Operating expense', system: true },
  { code: '6900', name: 'Other', type: 'EXPENSE', subtype: 'Operating expense' },
  { code: '6950', name: 'Foreign exchange loss', type: 'EXPENSE', subtype: 'Other expense', system: true },
]

/** Map an EXPENSE_CATEGORIES label onto its ledger account code. */
export const EXPENSE_CATEGORY_ACCOUNT: Record<string, string> = {
  'Inventory / Purchases': '6000',
  Marketing: '6100',
  Salaries: '6200',
  Rent: '6300',
  Utilities: '6400',
  'Shipping & Delivery': '6500',
  'Software & Fees': '6600',
  Other: '6900',
}

/** Which side increases this account type. */
export function normalBalance(type: AccountType): 'debit' | 'credit' {
  return type === 'ASSET' || type === 'EXPENSE' ? 'debit' : 'credit'
}

/**
 * Signed balance in the account's own natural direction — so an asset with more
 * debits than credits reads positive, and so does a liability with more credits
 * than debits.
 */
export function naturalBalance(type: AccountType, debit: number, credit: number): number {
  return normalBalance(type) === 'debit' ? debit - credit : credit - debit
}
