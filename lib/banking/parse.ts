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
  format: 'csv' | 'ofx' | 'mt940'
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

const DATE_HEADERS = [
  'date', 'transaction date', 'txn date', 'trans date', 'posting date', 'posted date', 'post date',
  'value date', 'entry date', 'effective date',
]
const DESC_HEADERS = [
  'description', 'details', 'narrative', 'narration', 'particulars', 'transaction details',
  'transaction description', 'memo', 'payee', 'remarks',
]
const AMOUNT_HEADERS = ['amount', 'transaction amount', 'value', 'txn amount']
const DEBIT_HEADERS = ['debit', 'debit amount', 'withdrawal', 'withdrawals', 'money out', 'paid out', 'dr', 'dr amount']
const CREDIT_HEADERS = ['credit', 'credit amount', 'deposit', 'deposits', 'money in', 'paid in', 'cr', 'cr amount']
const BALANCE_HEADERS = ['balance', 'running balance', 'closing balance', 'ledger balance', 'available balance', 'avail balance', 'running bal']
const REF_HEADERS = ['reference', 'ref', 'ref no', 'cheque', 'check', 'cheque no', 'transaction id', 'transaction ref', 'txn ref']

const findColumn = (headers: string[], candidates: string[]) => headers.findIndex((h) => candidates.includes(h))

/** How many of a row's cells match a recognised header name — used to find the real header row among preamble/title rows some banks prepend. */
function headerScore(headers: string[]): number {
  const all = [...DATE_HEADERS, ...DESC_HEADERS, ...AMOUNT_HEADERS, ...DEBIT_HEADERS, ...CREDIT_HEADERS, ...BALANCE_HEADERS, ...REF_HEADERS]
  return headers.filter((h) => all.includes(h)).length
}

/**
 * Some banks export a few metadata/title lines ("Account:", the date range,
 * a blank row) before the real header row. Scan the first handful of rows
 * and pick whichever looks most like one — needs at least a date-ish column
 * to count as a candidate at all, rather than assuming row 0 always is it —
 * preferring rows that also carry an amount-ish column when there's a
 * choice, but still returning the best date-only candidate otherwise so the
 * caller can raise the correct ("no amount column", not "no date column")
 * error.
 */
function findHeaderRow(rows: string[], splitter: (line: string) => string[]): number {
  const scan = Math.min(rows.length, 15)
  let best = -1
  let bestScore = -1
  for (let i = 0; i < scan; i++) {
    const headers = splitter(rows[i]).map((h) => h.toLowerCase().replace(/[^a-z ]/g, '').trim())
    if (findColumn(headers, DATE_HEADERS) < 0) continue
    const hasAmount = findColumn(headers, AMOUNT_HEADERS) >= 0 || findColumn(headers, DEBIT_HEADERS) >= 0 || findColumn(headers, CREDIT_HEADERS) >= 0
    const score = headerScore(headers) + (hasAmount ? 100 : 0)
    if (score > bestScore) {
      bestScore = score
      best = i
    }
  }
  return best
}

/** Comma is the default, but some exports use ; or tab — pick whichever splits the header row into the most plausible number of columns. */
function detectDelimiter(line: string): ',' | ';' | '\t' {
  const counts: Record<',' | ';' | '\t', number> = {
    ',': (line.match(/,/g) ?? []).length,
    ';': (line.match(/;/g) ?? []).length,
    '\t': (line.match(/\t/g) ?? []).length,
  }
  const [best] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  return counts[best as ',' | ';' | '\t'] > 0 ? (best as ',' | ';' | '\t') : ','
}

/** Split a line on the given delimiter, honouring quoted fields containing the delimiter. */
function splitDelimited(line: string, delimiter: string): string[] {
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
    else if (c === delimiter) {
      out.push(cur)
      cur = ''
    } else cur += c
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

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
  // Excel/online-banking exports often carry a UTF-8 BOM, which would
  // otherwise glue itself onto the first header cell and break matching.
  const clean = text.replace(/^﻿/, '')
  const rows = clean.split(/\r?\n/).filter((r) => r.trim().length > 0)
  if (rows.length < 2) return { lines: [], skipped: [{ row: 0, reason: 'The file has no data rows.' }], format: 'csv' }

  const delimiter = detectDelimiter(rows[0])
  const split = (line: string) => splitDelimited(line, delimiter)

  // Some exports prepend a few metadata/title lines (account name, the date
  // range, a blank row) before the real header — scan for it instead of
  // assuming row 0 is always it.
  const headerRow = findHeaderRow(rows, split)
  if (headerRow < 0) {
    throw new Error('No date column found. Expected a header like "Date" or "Transaction Date".')
  }

  const headers = split(rows[headerRow]).map((h) => h.toLowerCase().replace(/[^a-z ]/g, '').trim())
  const iDate = findColumn(headers, DATE_HEADERS)
  const iDesc = findColumn(headers, DESC_HEADERS)
  const iAmount = findColumn(headers, AMOUNT_HEADERS)
  const iDebit = findColumn(headers, DEBIT_HEADERS)
  const iCredit = findColumn(headers, CREDIT_HEADERS)
  const iBalance = findColumn(headers, BALANCE_HEADERS)
  const iRef = findColumn(headers, REF_HEADERS)

  if (iAmount < 0 && iDebit < 0 && iCredit < 0) {
    throw new Error('No amount column found. Expected "Amount", or separate "Debit" and "Credit" columns.')
  }

  const lines: ParsedLine[] = []
  const skipped: ParseResult['skipped'] = []

  for (let r = headerRow + 1; r < rows.length; r++) {
    const cells = split(rows[r])
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

// --- "Op" online-banking portal export --------------------------------------

/**
 * Some Jamaican online-banking portals (this one's own filename pattern is
 * "OpTransactionHistory…") export a report-style CSV rather than a plain
 * table: ~18 rows of "Account Details"/"Balance Details" metadata, a
 * "Transactions List" title row, then transaction rows with no column
 * headers at all — position is the only thing that tells you what a field
 * is. Recognised by that unmistakable shape rather than any header text,
 * since there isn't any to read.
 */
function looksLikeOpPortalExport(text: string): boolean {
  const firstLine = text.replace(/^﻿/, '').split(/\r?\n/, 1)[0] ?? ''
  const firstCell = firstLine.split(',')[0]?.trim() ?? ''
  return /^account details$/i.test(firstCell) && /transactions list/i.test(text)
}

/** This export's dates are month first (07/28/2026 = 28 July), unlike the day-first convention assumed elsewhere. */
function parseOpPortalDate(raw: string): Date | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw.trim())
  if (!m) return null
  const month = +m[1]
  const day = +m[2]
  const year = +m[3]
  if (month > 12 || day > 31) return null
  return new Date(Date.UTC(year, month - 1, day))
}

/**
 * Fixed column positions, read off a real export: 0 row number, 3 date,
 * 7 reference/instrument id, 13 debit, 15 credit, 17 running balance,
 * 20 description. Quoted amounts ("9,000.00") keep their thousands comma
 * from shifting these positions, since the delimiter splitter respects quotes.
 */
export function parseOpPortalCsv(text: string): ParseResult {
  const clean = text.replace(/^﻿/, '')
  const rows = clean.split(/\r?\n/)
  const titleRow = rows.findIndex((r) => /transactions list/i.test(r))
  if (titleRow < 0) throw new Error('No transactions found in this statement export.')

  const lines: ParsedLine[] = []
  const skipped: ParseResult['skipped'] = []

  for (let r = titleRow + 1; r < rows.length; r++) {
    const row = rows[r]
    if (!row.trim()) continue
    const cells = splitDelimited(row, ',')
    // The footer ("Date and Time: … Page 1 of 1") isn't a transaction — every
    // real row starts with its own sequence number, so that's where to stop.
    if (!/^\d+$/.test(cells[0]?.trim() ?? '')) break

    const postedAt = parseOpPortalDate(cells[3] ?? '')
    if (!postedAt) {
      skipped.push({ row: r + 1, reason: `Could not read the date "${cells[3] ?? ''}".` })
      continue
    }

    const debit = parseAmount(cells[13] ?? '')
    const credit = parseAmount(cells[15] ?? '')
    const amount = credit != null ? Math.abs(credit) : debit != null ? -Math.abs(debit) : null
    if (amount === null || amount === 0) {
      skipped.push({ row: r + 1, reason: 'No amount on this row.' })
      continue
    }

    const runningBalance = parseAmount(cells[17] ?? '')
    const reference = cells[7]?.trim() || null
    const description = cells[20]?.trim() || 'Bank transaction'

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

// --- MT940 (SWIFT customer statement) ---------------------------------------

/**
 * A single :61: transaction line, per the SWIFT MT940 field spec:
 * YYMMDD + optional entry date (MMDD) + C/D (or RC/RD for a reversal) +
 * optional funds code letter + amount (comma decimal) + the rest (type code,
 * customer reference, optional //bank reference) which we don't need to
 * split further — the following :86: line supplies the human description.
 */
const MT940_LINE_61 = /^:61:(\d{6})(\d{4})?(RC|RD|C|D)([A-Z])?(\d+,\d*)(.*)$/

function parseMt940Date(yymmdd: string): Date | null {
  const y = Number(yymmdd.slice(0, 2))
  const m = Number(yymmdd.slice(2, 4))
  const d = Number(yymmdd.slice(4, 6))
  if (!m || !d || m > 12 || d > 31) return null
  // MT940 has no century digit — treat as 2000s, correct for any statement this app will ever import.
  return new Date(Date.UTC(2000 + y, m - 1, d))
}

export function parseMt940(text: string): ParseResult {
  const rawLines = text.split(/\r?\n/)
  if (!rawLines.some((l) => l.startsWith(':61:'))) {
    throw new Error('No transactions found. This does not look like an MT940 statement.')
  }

  const lines: ParsedLine[] = []
  const skipped: ParseResult['skipped'] = []

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i]
    if (!raw.startsWith(':61:')) continue

    const m = MT940_LINE_61.exec(raw.trim())
    if (!m) {
      skipped.push({ row: i + 1, reason: `Could not read the transaction line "${raw.trim()}".` })
      continue
    }
    const [, valueDate, , dc, , amountRaw] = m
    const postedAt = parseMt940Date(valueDate)
    const amount = parseAmount(amountRaw.replace(',', '.'))
    if (!postedAt || amount === null || amount === 0) {
      skipped.push({ row: i + 1, reason: `Could not read the date or amount on "${raw.trim()}".` })
      continue
    }
    const signed = dc.endsWith('D') ? -Math.abs(amount) : Math.abs(amount)

    // :86: (the description) follows on the next line(s), up to the next tag.
    let description = ''
    let j = i + 1
    while (j < rawLines.length && (rawLines[j].startsWith(':86:') || (description && !/^:\w/.test(rawLines[j])))) {
      description += (description ? ' ' : '') + rawLines[j].replace(/^:86:/, '').trim()
      j++
    }

    lines.push({
      postedAt,
      description: description || 'Bank transaction',
      reference: null,
      amount: Math.round(signed * 100) / 100,
      runningBalance: null,
      fingerprint: fingerprint({ postedAt, description: description || 'Bank transaction', amount: signed }),
    })
  }

  return { lines, skipped, format: 'mt940' }
}

/** Pick a parser from the file itself rather than trusting the extension. */
export function parseStatement(text: string, filename?: string): ParseResult {
  if (looksLikeOpPortalExport(text)) return parseOpPortalCsv(text)

  const looksOfx = /<STMTTRN>|<OFX>/i.test(text) || /\.(ofx|qfx)$/i.test(filename ?? '')
  if (looksOfx) return parseOfx(text)

  const looksMt940 = /^:61:/m.test(text) || /^:20:/m.test(text) || /\.(sta|940|mt940)$/i.test(filename ?? '')
  if (looksMt940) return parseMt940(text)

  return parseCsv(text)
}
