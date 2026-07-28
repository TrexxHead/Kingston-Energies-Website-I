import { createHash } from 'crypto'

/**
 * Statement parsing.
 *
 * Every Jamaican bank exports a slightly different CSV, so rather than
 * hardcoding one layout the parser inspects the header row and maps whatever
 * it recognises. When it can't find a date or an amount it says so instead of
 * guessing — a silently mis-parsed statement is far worse than a failed import.
 */

export interface ParsedLine {
  postedAt: Date
  description: string
  reference: string | null
  /** Signed against the bank account: positive is money in. */
  amount: number
  runningBalance: number | null
  fingerprint: string
}

export interface ParseResult {
  lines: ParsedLine[]
  /** Rows that could not be read, with the reason, so nothing disappears quietly. */
  skipped: { row: number; reason: string }[]
  format: 'csv' | 'ofx'
}

/**
 * A stable identity for a statement row.
 *
 * Banks don't give every line a unique id, so the fingerprint is derived from
 * the fields that do identify it. Overlapping statement exports — the normal
 * case when you download "last 90 days" every month — then de-duplicate instead
 * of doubling up your bank balance.
 */
export function fingerprint(parts: { postedAt: Date; description: string; amount: number; reference?: string | null }): string {
  const key = [
    parts.postedAt.toISOString().slice(0, 10),
    parts.description.trim().toLowerCase().replace(/\s+/g, ' '),
    parts.amount.toFixed(2),
    parts.reference?.trim().toLowerCase() ?? '',
  ].join('|')
  return createHash('sha256').update(key).digest('hex').slice(0, 32)
}

// --- CSV -------------------------------------------------------------------

/** Split a CSV line, honouring quoted fields containing commas. */
function splitCsv(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quoted) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else quoted = false
      } else cur += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      out.push(cur)
      cur = ''
    } else cur += c
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

const DATE_HEADERS = ['date', 'transaction date', 'posting date', 'posted date', 'value date', 'trans date']
const DESC_HEADERS = ['description', 'details', 'narrative', 'particulars', 'transaction details', 'memo', 'payee']
const AMOUNT_HEADERS = ['amount', 'transaction amount', 'value']
const DEBIT_HEADERS = ['debit', 'withdrawal', 'withdrawals', 'money out', 'paid out', 'dr']
const CREDIT_HEADERS = ['credit', 'deposit', 'deposits', 'money in', 'paid in', 'cr']
const BALANCE_HEADERS = ['balance', 'running balance', 'closing balance', 'ledger balance']
const REF_HEADERS = ['reference', 'ref', 'cheque', 'check', 'transaction id', 'transaction ref']

const findColumn = (headers: string[], candidates: string[]) => headers.findIndex((h) => candidates.includes(h))

/** Parse "1,234.56", "(1,234.56)" and "-1,234.56" into a number. */
function parseAmount(raw: string): number | null {
  const s = raw.replace(/[^\d.,()-]/g, '').trim()
  if (!s) return null
  const negative = /^\(.*\)$/.test(s) || s.startsWith('-')
  const digits = s.replace(/[()\-]/g, '').replace(/,/g, '')
  if (!digits) return null
  const n = Number(digits)
  if (!Number.isFinite(n)) return null
  return negative ? -n : n
}

/**
 * Parse a date without guessing between the American and the rest-of-the-world
 * reading of an ambiguous d/m/y. Jamaica writes day first, so that's the
 * assumption — stated here rather than hidden.
 */
function parseDate(raw: string): Date | null {
  const s = raw.trim()
  if (!s) return null

  // ISO first: unambiguous.
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (iso) return new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]))

  // d/m/y or d-m-y, day first.
  const dmy = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/.exec(s)
  if (dmy) {
    const year = dmy[3].length === 2 ? 2000 + +dmy[3] : +dmy[3]
    const day = +dmy[1]
    const month = +dmy[2]
    if (month > 12) return null
    return new Date(Date.UTC(year, month - 1, day))
  }

  // "12 Jan 2026" / "Jan 12, 2026"
  const parsed = new Date(s)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function parseCsv(text: string): ParseResult {
  const rows = text.split(/\r?\n/).filter((r) => r.trim().length > 0)
  if (rows.length < 2) return { lines: [], skipped: [{ row: 0, reason: 'The file has no data rows.' }], format: 'csv' }

  const headers = splitCsv(rows[0]).map((h) => h.toLowerCase().replace(/[^a-z ]/g, '').trim())
  const iDate = findColumn(headers, DATE_HEADERS)
  const iDesc = findColumn(headers, DESC_HEADERS)
  const iAmount = findColumn(headers, AMOUNT_HEADERS)
  const iDebit = findColumn(headers, DEBIT_HEADERS)
  const iCredit = findColumn(headers, CREDIT_HEADERS)
  const iBalance = findColumn(headers, BALANCE_HEADERS)
  const iRef = findColumn(headers, REF_HEADERS)

  if (iDate < 0) throw new Error('No date column found. Expected a header like "Date" or "Transaction Date".')
  if (iAmount < 0 && iDebit < 0 && iCredit < 0) {
    throw new Error('No amount column found. Expected "Amount", or separate "Debit" and "Credit" columns.')
  }

  const lines: ParsedLine[] = []
  const skipped: ParseResult['skipped'] = []

  for (let r = 1; r < rows.length; r++) {
    const cells = splitCsv(rows[r])
    const postedAt = parseDate(cells[iDate] ?? '')
    if (!postedAt) {
      skipped.push({ row: r + 1, reason: `Could not read the date "${cells[iDate] ?? ''}".` })
      continue
    }

    let amount: number | null = null
    if (iAmount >= 0) amount = parseAmount(cells[iAmount] ?? '')
    if (amount === null && (iDebit >= 0 || iCredit >= 0)) {
      const debit = iDebit >= 0 ? parseAmount(cells[iDebit] ?? '') : null
      const credit = iCredit >= 0 ? parseAmount(cells[iCredit] ?? '') : null
      // Separate columns: a debit is money leaving the account.
      if (credit) amount = Math.abs(credit)
      else if (debit) amount = -Math.abs(debit)
    }
    if (amount === null || amount === 0) {
      skipped.push({ row: r + 1, reason: 'No amount on this row.' })
      continue
    }

    const description = (iDesc >= 0 ? cells[iDesc] : '')?.trim() || 'Bank transaction'
    const reference = iRef >= 0 ? cells[iRef]?.trim() || null : null
    const runningBalance = iBalance >= 0 ? parseAmount(cells[iBalance] ?? '') : null

    lines.push({
      postedAt,
      description,
      reference,
      amount: Math.round(amount * 100) / 100,
      runningBalance,
      fingerprint: fingerprint({ postedAt, description, amount, reference }),
    })
  }

  return { lines, skipped, format: 'csv' }
}

// --- OFX / QFX -------------------------------------------------------------

const ofxTag = (block: string, tag: string): string | null => {
  const m = new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i').exec(block)
  return m ? m[1].trim() : null
}

/** OFX dates are YYYYMMDD, optionally followed by a time and timezone. */
function parseOfxDate(raw: string): Date | null {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(raw)
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null
}

export function parseOfx(text: string): ParseResult {
  const blocks = text.split(/<STMTTRN>/i).slice(1)
  if (blocks.length === 0) throw new Error('No transactions found. This does not look like an OFX/QFX statement.')

  const lines: ParsedLine[] = []
  const skipped: ParseResult['skipped'] = []

  blocks.forEach((block, i) => {
    const postedAt = parseOfxDate(ofxTag(block, 'DTPOSTED') ?? '')
    const amountRaw = ofxTag(block, 'TRNAMT')
    const amount = amountRaw ? Number(amountRaw) : NaN
    if (!postedAt || !Number.isFinite(amount) || amount === 0) {
      skipped.push({ row: i + 1, reason: 'Transaction is missing a usable date or amount.' })
      return
    }
    const description = ofxTag(block, 'NAME') || ofxTag(block, 'MEMO') || 'Bank transaction'
    // FITID is the bank's own unique id — far better than a derived hash when
    // it's present, because it survives a changed description.
    const fitid = ofxTag(block, 'FITID')
    const reference = fitid || ofxTag(block, 'CHECKNUM')

    lines.push({
      postedAt,
      description,
      reference,
      amount: Math.round(amount * 100) / 100,
      runningBalance: null,
      fingerprint: fitid
        ? createHash('sha256').update(`fitid|${fitid}`).digest('hex').slice(0, 32)
        : fingerprint({ postedAt, description, amount, reference }),
    })
  })

  return { lines, skipped, format: 'ofx' }
}

/** Pick a parser from the file itself rather than trusting the extension. */
export function parseStatement(text: string, filename?: string): ParseResult {
  const looksOfx = /<STMTTRN>|<OFX>/i.test(text) || /\.(ofx|qfx)$/i.test(filename ?? '')
  return looksOfx ? parseOfx(text) : parseCsv(text)
}
