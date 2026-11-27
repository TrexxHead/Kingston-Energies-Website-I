import { z } from 'zod'

/**
 * Reading a JPS bill from a photo or PDF (roadmap P2 upgrade). The model
 * fills this schema; every field carries how sure it is and the text it read,
 * so the customer can check it. Nothing here is trusted until the customer
 * confirms it in the form. Account numbers, names and addresses are not
 * asked for, so they're never extracted.
 */

const confidence = z.enum(['high', 'medium', 'low'])
const field = <T extends z.ZodType>(value: T) =>
  z.object({
    value: value.nullable(),
    confidence,
    /** The text exactly as printed, for the customer to compare. */
    seen: z.string().nullable(),
  })

export const billReadingSchema = z.object({
  isUtilityBill: z.boolean(),
  provider: z.string().nullable(),
  periodStart: field(z.string()),
  periodEnd: field(z.string()),
  kwh: field(z.number()),
  readingType: field(z.enum(['actual', 'estimated', 'unknown'])),
  currentCharges: field(z.number()),
  fixedCharges: field(z.number()),
  arrears: field(z.number()),
  credits: field(z.number()),
  amountDue: field(z.number()),
  /** Fuel & IPP charge per kWh printed on the bill, if shown. */
  fuelRatePerKwh: field(z.number()),
  notes: z.string().nullable(),
})
export type BillReading = z.infer<typeof billReadingSchema>
export type ReadField = keyof Omit<BillReading, 'isUtilityBill' | 'provider' | 'notes'>

export const BILL_READING_PROMPT = `You are reading a Jamaica Public Service (JPS) electricity bill (a photo or a PDF) so a customer can understand it.

Fill every field from what is printed. Rules:
- Only report what you can actually read. If a field isn't on the bill or you can't read it, set value to null and confidence to "low". Never estimate, calculate or guess a value that isn't printed — except dates, which you convert to YYYY-MM-DD.
- "seen" is the text exactly as printed for that value (null if not found).
- kwh: the energy used in this billing period (kWh), not a meter reading.
- readingType: "actual" if the reading is marked actual (A), "estimated" if marked estimated (E), else "unknown".
- currentCharges: total charges for this period only (before balance brought forward and payments).
- fixedCharges: the customer charge line. arrears: balance brought forward from the previous bill. credits: payments and credits received. amountDue: total amount due.
- fuelRatePerKwh: the fuel & IPP rate per kWh if it is printed (J$/kWh), else null.
- Money is in Jamaican dollars; give plain numbers without currency symbols or commas.
- confidence: "high" when the value is clearly printed and legible, "medium" if partly obscured or you had to choose between similar lines, "low" if uncertain.
- isUtilityBill: false if this is not an electricity bill. provider: the utility's name.
- Do not include account numbers, names, addresses or meter numbers anywhere, including notes.
- notes: one short sentence about anything the customer should check (e.g. blurred area, multiple meters), or null.`

const isoDate = (s: string | null) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))
const lower = (f: { confidence: 'high' | 'medium' | 'low' }, to: 'medium' | 'low') => {
  if (f.confidence === 'high' || (f.confidence === 'medium' && to === 'low')) f.confidence = to
}

/**
 * Sanity-check what the model read. Impossible values are cleared; values
 * that don't add up are marked low confidence with a reason the customer sees.
 */
export function checkReading(r: BillReading): { reading: BillReading; checks: string[] } {
  const out: BillReading = JSON.parse(JSON.stringify(r))
  const checks: string[] = []
  for (const k of ['periodStart', 'periodEnd'] as const) {
    if (out[k].value != null && !isoDate(out[k].value)) {
      out[k].value = null
      out[k].confidence = 'low'
    }
  }
  if (out.periodStart.value && out.periodEnd.value) {
    const days = (Date.parse(out.periodEnd.value) - Date.parse(out.periodStart.value)) / 86_400_000
    if (days <= 0 || days > 120) {
      lower(out.periodStart, 'low')
      lower(out.periodEnd, 'low')
      checks.push(`The billing period dates don’t look right (${Math.round(days)} days) — check them.`)
    }
  }
  for (const k of ['kwh', 'currentCharges', 'fixedCharges', 'arrears', 'credits', 'amountDue', 'fuelRatePerKwh'] as const) {
    const v = out[k].value
    if (v != null && (!Number.isFinite(v) || v < 0 || v > 100_000_000)) {
      out[k].value = null
      out[k].confidence = 'low'
    }
  }
  const { currentCharges: cc, arrears: ar, credits: cr, amountDue: due, kwh } = out
  if (cc.value != null && due.value != null) {
    const expected = cc.value + (ar.value ?? 0) - (cr.value ?? 0)
    if (Math.abs(expected - due.value) > Math.max(5, due.value * 0.01) && ar.value != null) {
      lower(cc, 'medium')
      lower(due, 'medium')
      checks.push('Current charges, balance brought forward and payments don’t add up to the amount due — check those lines.')
    }
  }
  if (kwh.value != null && cc.value != null && kwh.value > 0) {
    const perKwh = cc.value / kwh.value
    if (perKwh < 10 || perKwh > 200) {
      lower(kwh, 'low')
      lower(cc, 'low')
      checks.push(`That works out at J$${perKwh.toFixed(0)} per kWh, which is unusual — check the kWh and current charges.`)
    }
  }
  return { reading: out, checks }
}
