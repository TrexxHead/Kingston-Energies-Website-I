import { stableStringify } from '@/lib/energy/engine/stable'
import { parseData, type RefKind, type RefRecord } from './types'

/**
 * Price sheets (roadmap: automatic price sync). The owner keeps prices in a
 * Google Sheet, publishes each tab as CSV ("File → Share → Publish to web →
 * CSV"), and a daily job (plus "Sync now" in admin) turns the rows into
 * reference-data records. Every row needs a source (where the price was read)
 * — a sheet is only as good as what's typed into it, so records stay drafts
 * unless the sheet is marked auto-approve.
 *
 * Shared columns on every row: effective_from (YYYY-MM-DD; today when blank),
 * source_title, source_url (optional), name (optional).
 */

/** Who the sync records as having entered (and, for auto-approve sheets, approved) a record. */
export const SYNC_ACTOR = 'price sheet sync'

export const SHEET_KINDS = ['fuel_price', 'charging_price', 'lender_offer', 'install_price', 'tariff_fuel'] as const
export type SheetKind = (typeof SHEET_KINDS)[number]

export const SHEET_KIND_LABEL: Record<SheetKind, string> = {
  fuel_price: 'Fuel prices',
  charging_price: 'Public charging prices',
  lender_offer: 'Lender offers',
  install_price: 'Solar installed price',
  tariff_fuel: 'JPS fuel & IPP rate (updates the approved tariffs)',
}

const SHARED = ['effective_from', 'source_title', 'source_url', 'name']
/** Header row per kind — shown in admin so the owner can set the sheet up. */
export const SHEET_COLUMNS: Record<SheetKind, string[]> = {
  fuel_price: ['grade', 'price_per_litre', 'basis', ...SHARED],
  charging_price: [
    'operator',
    'price_per_kwh',
    'session_fee',
    'idle_fee_per_min',
    'idle_grace_min',
    'band1_label',
    'band1_start',
    'band1_end',
    'band1_days',
    'band1_price_per_kwh',
    'band2_label',
    'band2_start',
    'band2_end',
    'band2_days',
    'band2_price_per_kwh',
    'notes',
    ...SHARED,
  ],
  lender_offer: ['lender', 'product', 'rate_pct', 'rate_is_from', 'rate_type', 'max_term_months', 'min_deposit_pct', 'processing_fee_pct', 'other_upfront_fees', 'monthly_fee', 'life_insurance_pct', 'max_loan', 'notes', ...SHARED],
  install_price: ['basis', 'per_kwp_low', 'per_kwp_high', 'minimum_job', 'battery_per_kwh_low', 'battery_per_kwh_high', 'includes', ...SHARED],
  tariff_fuel: ['fuel_rate_per_kwh', 'customer_class', ...SHARED],
}

/** RFC 4180-ish CSV: quoted fields, doubled quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') (field += '"'), i++
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') row.push(field), (field = '')
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field || row.length) row.push(field), rows.push(row)
  return rows.filter((r) => r.some((x) => x.trim()))
}

type Row = Record<string, string>
const toRows = (csv: string[][]): Row[] => {
  const [head, ...body] = csv
  if (!head) return []
  const keys = head.map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, '_'))
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])))
}

/** "J$1,234.50" → 1234.5; blank → null; junk → NaN (rejected by validation). */
const num = (s: string | undefined): number | null => {
  const t = (s ?? '').replace(/[J$,\s%]/gi, '')
  return t ? Number(t) : null
}
const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
function days(s: string): number[] | undefined {
  const t = s.trim().toLowerCase()
  if (!t || t === 'all' || t === 'every day') return undefined
  if (/^mon\s*[-–]\s*fri$|^weekdays?$/.test(t)) return [1, 2, 3, 4, 5]
  if (/^sat\s*[-–]\s*sun$|^weekends?$/.test(t)) return [0, 6]
  return t.split(/[\s,/]+/).map((d) => DAY_NAMES.indexOf(d.slice(0, 3)))
}
const hhmm = (s: string) => (/^\d:\d\d$/.test(s) ? `0${s}` : s)

export interface SheetRecord {
  kind: RefKind
  /** Identifies "the same thing" across syncs: operator, lender+product, or the kind itself. */
  key: string
  name: string
  effectiveFrom: string
  source: RefRecord['source']
  data: unknown
}

export interface SheetParse {
  records: SheetRecord[]
  errors: string[]
}

/**
 * Rows → validated record inputs. Rows that fail validation are reported by
 * line number and skipped; they never become records. `tariffs` are the
 * approved tariffs in effect (needed for tariff_fuel only).
 */
export function recordsFromSheet(kind: SheetKind, csvText: string, today: string, tariffs: RefRecord<'tariff'>[] = []): SheetParse {
  const rows = toRows(parseCsv(csvText))
  const errors: string[] = []
  const out: SheetRecord[] = []
  const meta = (r: Row, line: number) => {
    const effectiveFrom = r.effective_from || today
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) return errors.push(`Line ${line}: effective_from must be YYYY-MM-DD.`), null
    if (!r.source_title || r.source_title.length < 3) return errors.push(`Line ${line}: source_title is required (where was this price read?).`), null
    const url = r.source_url && /^https?:\/\//.test(r.source_url) ? r.source_url : null
    return { effectiveFrom, source: { title: r.source_title.slice(0, 200), url, retrievedAt: today } }
  }
  const push = (line: number, k: RefKind, key: string, name: string, m: { effectiveFrom: string; source: RefRecord['source'] }, data: unknown) => {
    const v = parseData(k, data)
    if (!v.ok) return void errors.push(`Line ${line}: ${v.error}`)
    out.push({ kind: k, key, name: name.slice(0, 120), ...m, data: v.data })
  }

  if (kind === 'fuel_price') {
    // All rows with the latest effective date form one record.
    const dated = rows.map((r, i) => ({ r, line: i + 2, m: meta(r, i + 2) })).filter((x) => x.m && x.r.grade)
    const latest = dated.map((x) => x.m!.effectiveFrom).sort().pop()
    const group = dated.filter((x) => x.m!.effectiveFrom === latest)
    if (group.length) {
      const first = group[0]
      push(first.line, 'fuel_price', 'fuel_price', first.r.name || `Fuel prices from ${latest}`, first.m!, {
        basis: first.r.basis === 'ex_refinery' ? 'ex_refinery' : 'pump_average',
        currency: 'JMD',
        grades: group.map((x) => ({ grade: x.r.grade, pricePerLitre: num(x.r.price_per_litre) })),
      })
    }
  } else if (kind === 'install_price') {
    const r = rows[rows.length - 1]
    const m = r && meta(r, rows.length + 1)
    if (r && m)
      push(rows.length + 1, 'install_price', 'install_price', r.name || `Installed solar prices from ${m.effectiveFrom}`, m, {
        basis: r.basis,
        perKwpLow: num(r.per_kwp_low),
        perKwpHigh: num(r.per_kwp_high),
        minimumJob: num(r.minimum_job),
        batteryPerKwhLow: num(r.battery_per_kwh_low),
        batteryPerKwhHigh: num(r.battery_per_kwh_high),
        includes: r.includes || null,
      })
  } else if (kind === 'charging_price') {
    rows.forEach((r, i) => {
      const m = meta(r, i + 2)
      if (!m || !r.operator) return
      const periods = [1, 2, 3, 4]
        .filter((n) => r[`band${n}_price_per_kwh`])
        .map((n) => ({ label: r[`band${n}_label`] || 'Peak', start: hhmm(r[`band${n}_start`] ?? ''), end: hhmm(r[`band${n}_end`] ?? ''), ...(days(r[`band${n}_days`] ?? '') ? { days: days(r[`band${n}_days`] ?? '') } : {}), pricePerKwh: num(r[`band${n}_price_per_kwh`]) }))
      push(i + 2, 'charging_price', `charging_price:${r.operator.toLowerCase().replace(/\s+/g, ' ')}`, r.name || `${r.operator} charging prices`, m, {
        operator: r.operator,
        pricePerKwh: num(r.price_per_kwh),
        ...(periods.length ? { periods } : {}),
        sessionFee: num(r.session_fee),
        idleFeePerMin: num(r.idle_fee_per_min),
        idleGraceMin: num(r.idle_grace_min),
        notes: r.notes || null,
      })
    })
  } else if (kind === 'lender_offer') {
    rows.forEach((r, i) => {
      const m = meta(r, i + 2)
      if (!m || !r.lender) return
      push(i + 2, 'lender_offer', `lender_offer:${r.lender.toLowerCase()}|${(r.product ?? '').toLowerCase()}`, r.name || `${r.lender} — ${r.product}`, m, {
        lender: r.lender,
        product: r.product,
        annualRatePct: num(r.rate_pct),
        rateIsFrom: /^(y|yes|true|from)$/i.test(r.rate_is_from ?? ''),
        rateType: (r.rate_type || 'fixed').toLowerCase(),
        maxTermMonths: num(r.max_term_months),
        minDepositPct: num(r.min_deposit_pct),
        processingFeePct: num(r.processing_fee_pct),
        otherUpfrontFees: num(r.other_upfront_fees),
        monthlyFee: num(r.monthly_fee),
        lifeInsurancePctPerYear: num(r.life_insurance_pct),
        maxLoan: num(r.max_loan),
        notes: r.notes || null,
      })
    })
  } else if (kind === 'tariff_fuel') {
    // The latest row's fuel rate replaces the fuel line on each matching approved tariff.
    const dated = rows.map((r, i) => ({ r, line: i + 2, m: meta(r, i + 2) })).filter((x) => x.m && x.r.fuel_rate_per_kwh)
    const latest = dated.map((x) => x.m!.effectiveFrom).sort().pop()
    for (const x of dated.filter((d) => d.m!.effectiveFrom === latest)) {
      const rate = num(x.r.fuel_rate_per_kwh)
      const targets = tariffs.filter((t) => !x.r.customer_class || t.data.customerClass.toLowerCase().includes(x.r.customer_class.toLowerCase()))
      if (!targets.length) errors.push(`Line ${x.line}: no approved tariff${x.r.customer_class ? ` matches “${x.r.customer_class}”` : ''} to update.`)
      for (const t of targets) {
        const fuel = t.data.components.findIndex((c) => c.kind === 'per_kwh' && /fuel/i.test(c.label))
        if (fuel < 0) {
          errors.push(`Line ${x.line}: “${t.name}” has no per-kWh line labelled “Fuel…” to update.`)
          continue
        }
        const components = t.data.components.map((c, i) => (i === fuel && c.kind === 'per_kwh' ? { ...c, ratePerKwh: rate as number } : c))
        push(x.line, 'tariff', `tariff:${t.data.customerClass.toLowerCase()}`, x.r.name || `${t.data.customerClass} — fuel rate from ${latest}`, x.m!, { ...t.data, components })
      }
    }
  }
  return { records: out, errors }
}

/** Equal data regardless of key order. */
export const sameData = (a: unknown, b: unknown) => stableStringify(a) === stableStringify(b)

/** The identity key of an existing record, matching SheetRecord.key. */
export function recordKey(r: RefRecord): string {
  const d = r.data as Record<string, unknown>
  if (r.kind === 'charging_price') return `charging_price:${String(d.operator).toLowerCase().replace(/\s+/g, ' ')}`
  if (r.kind === 'lender_offer') return `lender_offer:${String(d.lender).toLowerCase()}|${String(d.product ?? '').toLowerCase()}`
  if (r.kind === 'tariff') return `tariff:${String(d.customerClass).toLowerCase()}`
  return r.kind
}

/** Only Google's published-CSV hosts: the sync never fetches arbitrary URLs. */
export function isAllowedSheetUrl(u: string): boolean {
  try {
    const url = new URL(u)
    return url.protocol === 'https:' && (url.hostname === 'docs.google.com' || url.hostname.endsWith('.googleusercontent.com'))
  } catch {
    return false
  }
}
