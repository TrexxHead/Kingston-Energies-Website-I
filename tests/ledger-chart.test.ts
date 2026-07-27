import { describe, it, expect } from 'vitest'
import { naturalBalance, normalBalance } from '../lib/ledger/chart'

describe('normal balances', () => {
  it('assets and expenses are debit-natural', () => {
    expect(normalBalance('ASSET')).toBe('debit')
    expect(normalBalance('EXPENSE')).toBe('debit')
  })
  it('liabilities, equity and revenue are credit-natural', () => {
    expect(normalBalance('LIABILITY')).toBe('credit')
    expect(normalBalance('EQUITY')).toBe('credit')
    expect(normalBalance('REVENUE')).toBe('credit')
  })
  it('reads positive in the natural direction', () => {
    expect(naturalBalance('ASSET', 1000, 300)).toBe(700)
    expect(naturalBalance('REVENUE', 0, 5000)).toBe(5000)
    expect(naturalBalance('LIABILITY', 200, 900)).toBe(700)
  })
})
