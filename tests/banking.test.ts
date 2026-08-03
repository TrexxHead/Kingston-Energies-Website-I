import { describe, it, expect } from 'vitest'
import { parseStatement, parseCsv, parseMt940, parseOpPortalCsv, fingerprint } from '../lib/banking/parse'
import { suggestMatches, scoreMatch, CONFIDENT, type BookLine } from '../lib/banking/match'

describe('parseCsv', () => {
  it('reads a single signed amount column', () => {
    const csv = [
      'Date,Description,Amount,Balance',
      '2026-01-05,NCB TRANSFER IN,15000.00,215000.00',
      '2026-01-06,POS PURCHASE HI-LO,-4250.75,210749.25',
    ].join('\n')
    const { lines, skipped } = parseCsv(csv)
    expect(skipped).toHaveLength(0)
    expect(lines).toHaveLength(2)
    expect(lines[0].amount).toBe(15000)
    expect(lines[1].amount).toBe(-4250.75)
    expect(lines[0].runningBalance).toBe(215000)
  })

  it('reads separate debit and credit columns, with debits as money out', () => {
    const csv = [
      'Transaction Date,Details,Debit,Credit',
      '05/01/2026,Deposit,,15000.00',
      '06/01/2026,Rent,80000.00,',
    ].join('\n')
    const { lines } = parseCsv(csv)
    expect(lines[0].amount).toBe(15000)
    expect(lines[1].amount).toBe(-80000)
  })

  it('reads day-first dates, which is how Jamaica writes them', () => {
    const { lines } = parseCsv('Date,Description,Amount\n06/01/2026,Rent,-1000')
    expect(lines[0].postedAt.toISOString().slice(0, 10)).toBe('2026-01-06')
  })

  it('handles parenthesised negatives and thousands separators', () => {
    const { lines } = parseCsv('Date,Description,Amount\n2026-02-01,Cheque,"(12,500.50)"')
    expect(lines[0].amount).toBe(-12500.5)
  })

  it('keeps commas inside quoted descriptions', () => {
    const { lines } = parseCsv('Date,Description,Amount\n2026-02-01,"WIPAY LTD, KINGSTON",5000')
    expect(lines[0].description).toBe('WIPAY LTD, KINGSTON')
  })

  it('reports unreadable rows instead of dropping them silently', () => {
    const csv = ['Date,Description,Amount', '2026-01-05,Good,100', 'not-a-date,Bad,200'].join('\n')
    const { lines, skipped } = parseCsv(csv)
    expect(lines).toHaveLength(1)
    expect(skipped).toHaveLength(1)
    expect(skipped[0].row).toBe(3)
  })

  it('refuses a file with no recognisable amount column', () => {
    expect(() => parseCsv('Date,Description\n2026-01-05,Something')).toThrow(/amount column/i)
  })

  it('refuses a file with no recognisable date column', () => {
    expect(() => parseCsv('Details,Amount\nSomething,500')).toThrow(/date column/i)
  })

  it('finds the header row past bank metadata/title rows', () => {
    const csv = [
      'Kingston Energies Ltd',
      'Account: OP1234567890',
      'Statement period: 01/07/2026 - 31/07/2026',
      '',
      'Date,Description,Amount,Balance',
      '2026-07-05,NCB TRANSFER IN,15000.00,215000.00',
    ].join('\n')
    const { lines, skipped } = parseCsv(csv)
    expect(skipped).toHaveLength(0)
    expect(lines).toHaveLength(1)
    expect(lines[0].amount).toBe(15000)
  })

  it('strips a UTF-8 BOM before reading the header', () => {
    const csv = '﻿Date,Description,Amount\n2026-01-05,Fee,-500'
    const { lines } = parseCsv(csv)
    expect(lines).toHaveLength(1)
    expect(lines[0].amount).toBe(-500)
  })

  it('auto-detects a semicolon-delimited export', () => {
    const csv = 'Date;Description;Amount\n2026-01-05;POS Purchase;-2500.00'
    const { lines } = parseCsv(csv)
    expect(lines).toHaveLength(1)
    expect(lines[0].amount).toBe(-2500)
    expect(lines[0].description).toBe('POS Purchase')
  })
})

describe('parseOpPortalCsv', () => {
  // A real (anonymised-in-content, structurally identical) export from a
  // Jamaican online-banking portal: report-style metadata rows, a
  // "Transactions List" title, then headerless positional transaction rows.
  const sample = [
    'Account Details,,,,,,,,,,,,,,,,,,,,,,,,',
    ',General Details,,,,,,,,,,,,,,,,,,,,,,,',
    ',,,,Number:,,,,,,354826836,,,,,,,,Nickname:,,,KINGSTON,,,',
    ',,,,Currency:,,,,,,JMD,,,,,,,,Open Date:,,,17/07/2024,,,',
    ',Balance Details,,,,,,,,,,,,,,,,,,,,,,,',
    ',,,,Available Balance:,,,,,,"JMD 25,764.60",,,,,,,,Total Balance:,,,"JMD 25,764.60",,,',
    'Transactions List -  SBA - KINGSTON (JMD) - 354826836,,,,,,,,,,,,,,,,,,,,,,,,',
    '1,,,07/28/2026,,,,S70729455,,,,,,,,"9,000.00",,"25,764.60",,,ACH JMMB,,,,',
    '2,,,07/27/2026,,,,S70315294,,,,,,,,"8,900.00",,"16,764.60",,,"ACH EWEN,BOSWO",,,,',
    '3,,,07/27/2026,,,,JM133732,,,,,,27.00,,,,"7,864.60",,,GCT on Service Charge:27-07-2026,,,,',
    '4,,,07/27/2026,,,,JM133731,,,,,,180.00,,,,"7,891.60",,,RTGS Service Charge:27-07-2026,,,,',
    'Date and Time: ,,,,,,03/08/2026 12:55 AM,,,,,,,,,,,,,,,,,:Page 1 of, 1',
    '',
  ].join('\n')

  it('reads a headerless, positional report export via its structural shape', () => {
    const { lines, skipped, format } = parseOpPortalCsv(sample)
    expect(format).toBe('csv')
    expect(skipped).toHaveLength(0)
    expect(lines).toHaveLength(4)
  })

  it('reads dates month-first, as this portal exports them', () => {
    const { lines } = parseOpPortalCsv(sample)
    // 07/28/2026 can only be July 28 — day 28 isn't a valid month.
    expect(lines[0].postedAt.toISOString().slice(0, 10)).toBe('2026-07-28')
  })

  it('signs credits positive and debits negative from their fixed columns', () => {
    const { lines } = parseOpPortalCsv(sample)
    expect(lines[0].amount).toBe(9000) // credit column populated
    expect(lines[2].amount).toBe(-27) // debit column populated
  })

  it('keeps a comma inside a quoted description intact', () => {
    const { lines } = parseOpPortalCsv(sample)
    expect(lines[1].description).toBe('ACH EWEN,BOSWO')
  })

  it('stops at the footer row instead of misreading it as a transaction', () => {
    const { lines, skipped } = parseOpPortalCsv(sample)
    expect(lines.every((l) => l.description !== undefined)).toBe(true)
    expect(skipped).toHaveLength(0)
  })

  it('is auto-detected by parseStatement from its shape, no extension needed', () => {
    const res = parseStatement(sample, 'export.csv')
    expect(res.lines).toHaveLength(4)
  })
})

describe('parseMt940', () => {
  it('reads a credit and a debit transaction with their :86: descriptions', () => {
    const mt940 = [
      ':20:STMT0001',
      ':25:OP1234567890',
      ':28C:1',
      ':60F:C260701JMD0,00',
      ':61:2607050705C15000,00NTRFNONREF',
      ':86:TRANSFER IN FROM CUSTOMER',
      ':61:2607060706D4250,75NMSCNONREF',
      ':86:POS PURCHASE HI-LO',
      ':62F:C260706JMD10749,25',
    ].join('\n')
    const { lines, skipped } = parseMt940(mt940)
    expect(skipped).toHaveLength(0)
    expect(lines).toHaveLength(2)
    expect(lines[0].amount).toBe(15000)
    expect(lines[0].description).toBe('TRANSFER IN FROM CUSTOMER')
    expect(lines[0].postedAt.toISOString().slice(0, 10)).toBe('2026-07-05')
    expect(lines[1].amount).toBe(-4250.75)
    expect(lines[1].description).toBe('POS PURCHASE HI-LO')
  })

  it('refuses a file with no :61: transaction lines', () => {
    expect(() => parseMt940(':20:STMT0001\n:25:OP1234567890')).toThrow(/does not look like/i)
  })
})

describe('fingerprint', () => {
  it('is identical for the same row re-imported', () => {
    const row = { postedAt: new Date('2026-01-05'), description: 'NCB  Transfer In', amount: 15000, reference: 'REF1' }
    const same = { postedAt: new Date('2026-01-05'), description: 'ncb transfer in', amount: 15000, reference: 'ref1' }
    expect(fingerprint(row)).toBe(fingerprint(same))
  })

  it('differs when the amount differs', () => {
    const base = { postedAt: new Date('2026-01-05'), description: 'Transfer', amount: 100 }
    expect(fingerprint(base)).not.toBe(fingerprint({ ...base, amount: 101 }))
  })

  it('differs for two same-day transactions with different references', () => {
    const base = { postedAt: new Date('2026-01-05'), description: 'ATM withdrawal', amount: -5000 }
    expect(fingerprint({ ...base, reference: 'A' })).not.toBe(fingerprint({ ...base, reference: 'B' }))
  })
})

describe('parseStatement', () => {
  it('detects OFX from the content, not the filename', () => {
    const ofx = `<OFX><STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260115120000<TRNAMT>-3500.00<FITID>202601150001<NAME>FLOW JAMAICA</STMTTRN></OFX>`
    const res = parseStatement(ofx, 'statement.txt')
    expect(res.format).toBe('ofx')
    expect(res.lines[0].amount).toBe(-3500)
    expect(res.lines[0].description).toBe('FLOW JAMAICA')
    expect(res.lines[0].postedAt.toISOString().slice(0, 10)).toBe('2026-01-15')
  })

  it('uses the bank FITID for identity when there is one', () => {
    const one = `<STMTTRN><DTPOSTED>20260115<TRNAMT>-3500.00<FITID>ABC123<NAME>FLOW</STMTTRN>`
    const renamed = `<STMTTRN><DTPOSTED>20260115<TRNAMT>-3500.00<FITID>ABC123<NAME>FLOW JAMAICA LTD</STMTTRN>`
    // Same transaction, description tidied up by the bank — must not re-import.
    expect(parseStatement(one).lines[0].fingerprint).toBe(parseStatement(renamed).lines[0].fingerprint)
  })
})

describe('match suggestions', () => {
  const book = (over: Partial<BookLine> = {}): BookLine => ({
    id: 'j1',
    entryId: 'e1',
    date: new Date('2026-01-05'),
    memo: 'Payment received — order KE-1001',
    entryMemo: null,
    amount: 15000,
    ...over,
  })
  const stmt = { id: 's1', postedAt: new Date('2026-01-05'), description: 'TRANSFER IN ORDER KE-1001', amount: 15000 }

  it('will not match a different amount however similar the wording', () => {
    expect(scoreMatch(stmt, book({ amount: 15000.5 }))).toBeNull()
  })

  it('will not match across more than a fortnight', () => {
    expect(scoreMatch(stmt, book({ date: new Date('2026-02-05') }))).toBeNull()
  })

  it('is confident about a same-day, same-amount, same-wording match', () => {
    const s = scoreMatch(stmt, book())
    expect(s).not.toBeNull()
    expect(s!.score).toBeGreaterThanOrEqual(CONFIDENT)
  })

  it('is less confident when only the amount agrees', () => {
    const s = scoreMatch(stmt, book({ date: new Date('2026-01-12'), memo: 'Something unrelated' }))
    expect(s!.score).toBeLessThan(CONFIDENT)
  })

  it('returns every plausible candidate rather than picking one', () => {
    const candidates = [book({ id: 'a' }), book({ id: 'b' })]
    const out = suggestMatches(stmt, candidates)
    expect(out).toHaveLength(2)
    expect(out[0].score).toBe(out[1].score)
  })

  it('always explains why it suggested something', () => {
    const s = scoreMatch(stmt, book())
    expect(s!.reasons.length).toBeGreaterThan(0)
    expect(s!.reasons[0]).toMatch(/amount matches/i)
  })
})
