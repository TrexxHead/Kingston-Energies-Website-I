import { z } from 'zod'
import type { TariffVersion, TariffComponent } from '@/lib/energy/engine/tariff'

/**
 * Reference data (roadmap R0): the public numbers our calculators depend on —
 * electricity tariffs, fuel prices, shelters, lenders. Every record carries
 * its source, the dates it applies, and who entered and approved it.
 * Calculators only ever read APPROVED records in effect on the date asked;
 * with none, they refuse rather than guess.
 */

export const REF_KINDS = ['tariff', 'fuel_price', 'shelter_list', 'charging_price', 'lender_offer'] as const
export type RefKind = (typeof REF_KINDS)[number]
export const REF_STATUS = ['draft', 'approved', 'retired'] as const
export type RefStatus = (typeof REF_STATUS)[number]

export const REF_KIND_LABEL: Record<RefKind, string> = {
  tariff: 'Electricity tariff',
  fuel_price: 'Fuel prices',
  shelter_list: 'Emergency shelters',
  charging_price: 'Public charging price',
  lender_offer: 'Lender offer',
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.')

export const sourceSchema = z.object({
  title: z.string().trim().min(3).max(200),
  url: z.string().url().max(1000).nullable().optional(),
  /** When staff read the source (YYYY-MM-DD). */
  retrievedAt: isoDate,
})

const money = z.number().finite().min(0).max(1_000_000)

export const tariffComponentSchema: z.ZodType<TariffComponent> = z.union([
  z.object({ kind: z.literal('fixed'), label: z.string().trim().min(1).max(80), amountPerPeriod: money }),
  z.object({
    kind: z.literal('energy_blocks'),
    label: z.string().trim().min(1).max(80),
    blocks: z
      .array(z.object({ upToKwh: z.number().positive().nullable(), ratePerKwh: money }))
      .min(1)
      .max(10)
      .refine((b) => b[b.length - 1].upToKwh === null, 'The last block must be open-ended (no upper limit).')
      .refine((b) => b.slice(0, -1).every((x, i, a) => x.upToKwh != null && (i === 0 || x.upToKwh > (a[i - 1].upToKwh ?? 0))), 'Block limits must increase.'),
  }),
  z.object({ kind: z.literal('per_kwh'), label: z.string().trim().min(1).max(80), ratePerKwh: money }),
  z.object({ kind: z.literal('percent'), label: z.string().trim().min(1).max(80), percent: z.number().min(0).max(100) }),
])

export const tariffDataSchema = z.object({
  /** e.g. "Rate 10 — Residential". */
  customerClass: z.string().trim().min(2).max(80),
  geography: z.string().trim().min(2).max(80).default('Jamaica (JPS)'),
  components: z.array(tariffComponentSchema).min(1).max(20),
  /** What the published schedule does not cover here (e.g. "GCT threshold not modelled"). */
  notes: z.string().trim().max(1000).nullable().optional(),
})

export const FUEL_GRADES = ['E10 Gasolene 87', 'E10 Gasolene 90', 'Ultra-low sulphur diesel', 'Auto diesel', 'Kerosene', 'LPG (per litre)'] as const

export const fuelPriceDataSchema = z.object({
  /** Pump prices are what a driver pays; ex-refinery prices exclude taxes and retail margin. */
  basis: z.enum(['pump_average', 'ex_refinery']),
  currency: z.literal('JMD').default('JMD'),
  grades: z.array(z.object({ grade: z.string().trim().min(2).max(60), pricePerLitre: money })).min(1).max(12),
})

export const shelterSchema = z.object({
  name: z.string().trim().min(2).max(160),
  parish: z.string().trim().min(2).max(40),
  address: z.string().trim().max(300).nullable().optional(),
  lat: z.number().min(17.6).max(18.6).nullable().optional(),
  lng: z.number().min(-78.5).max(-76.1).nullable().optional(),
})
export const shelterListDataSchema = z.object({ shelters: z.array(shelterSchema).min(1).max(2000) })

export const chargingPriceDataSchema = z.object({
  operator: z.string().trim().min(2).max(120),
  /** JMD per kWh (or per session/minute if the operator prices that way — then explain in notes). */
  pricePerKwh: money.nullable(),
  notes: z.string().trim().max(500).nullable().optional(),
})

/**
 * A lender's ADVERTISED terms for an energy / solar / general loan, copied
 * from the lender's own page with the date read. Not an offer, and not a
 * partnership — the financing page says so.
 */
export const lenderOfferDataSchema = z
  .object({
    lender: z.string().trim().min(2).max(120),
    product: z.string().trim().min(2).max(120),
    /** Advertised annual rate, %; "from" rates go in as the lowest advertised. */
    annualRatePct: z.number().min(0).max(60),
    rateIsFrom: z.boolean().default(false),
    rateType: z.enum(['fixed', 'variable']),
    maxTermMonths: z.number().int().min(1).max(360).nullable().optional(),
    minDepositPct: z.number().min(0).max(100).nullable().optional(),
    // Published charges, when the lender states them (blank = not published, never assumed).
    processingFeePct: z.number().min(0).max(20).nullable().optional(),
    otherUpfrontFees: z.number().min(0).max(10_000_000).nullable().optional(),
    monthlyFee: z.number().min(0).max(1_000_000).nullable().optional(),
    lifeInsurancePctPerYear: z.number().min(0).max(10).nullable().optional(),
    maxLoan: z.number().min(0).max(1_000_000_000).nullable().optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  })

export const DATA_SCHEMA = {
  tariff: tariffDataSchema,
  fuel_price: fuelPriceDataSchema,
  shelter_list: shelterListDataSchema,
  charging_price: chargingPriceDataSchema,
  lender_offer: lenderOfferDataSchema,
} as const

export type RefData = {
  tariff: z.infer<typeof tariffDataSchema>
  fuel_price: z.infer<typeof fuelPriceDataSchema>
  shelter_list: z.infer<typeof shelterListDataSchema>
  charging_price: z.infer<typeof chargingPriceDataSchema>
  lender_offer: z.infer<typeof lenderOfferDataSchema>
}

export interface RefRecord<K extends RefKind = RefKind> {
  id: string
  kind: K
  name: string
  effectiveFrom: string
  effectiveTo: string | null
  source: z.infer<typeof sourceSchema>
  status: RefStatus
  createdBy: string | null
  createdAt: string
  reviewedBy: string | null
  reviewedAt: string | null
  data: RefData[K]
}

export const recordInputSchema = z.object({
  kind: z.enum(REF_KINDS),
  name: z.string().trim().min(3).max(120),
  effectiveFrom: isoDate,
  effectiveTo: isoDate.nullable().optional(),
  source: sourceSchema,
  data: z.unknown(),
})

/** Validate a record's data against its kind. Returns an error message or the parsed data. */
export function parseData(kind: RefKind, data: unknown): { ok: true; data: RefData[RefKind] } | { ok: false; error: string } {
  const r = DATA_SCHEMA[kind].safeParse(data)
  if (!r.success) {
    const i = r.error.issues[0]
    return { ok: false, error: `${i?.path.join('.') || 'data'}: ${i?.message ?? 'invalid'}` }
  }
  return { ok: true, data: r.data as RefData[RefKind] }
}

export function inEffect(r: Pick<RefRecord, 'effectiveFrom' | 'effectiveTo'>, onDate: string): boolean {
  return onDate >= r.effectiveFrom && (!r.effectiveTo || onDate < r.effectiveTo)
}

/** The approved record of a kind in effect on a date (latest effectiveFrom wins); null when none. */
export function activeRecord<K extends RefKind>(records: RefRecord[], kind: K, onDate: string, match?: (r: RefRecord<K>) => boolean): RefRecord<K> | null {
  const list = records
    .filter((r): r is RefRecord<K> => r.kind === kind && r.status === 'approved' && inEffect(r, onDate))
    .filter((r) => !match || match(r))
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
  return list[0] ?? null
}

/** An approved tariff record as the engine's TariffVersion. */
export function toTariffVersion(r: RefRecord<'tariff'>): TariffVersion {
  return {
    id: r.id,
    name: r.name,
    geography: r.data.geography,
    customerClass: r.data.customerClass,
    effectiveFrom: r.effectiveFrom,
    effectiveTo: r.effectiveTo,
    source: { title: r.source.title, url: r.source.url ?? undefined, retrievedAt: r.source.retrievedAt },
    reviewStatus: r.status,
    reviewedBy: r.reviewedBy ?? undefined,
    reviewedAt: r.reviewedAt ?? undefined,
    currency: 'JMD',
    components: r.data.components,
  }
}

/** What the public can see of a record (no staff e-mails). */
export function publicView<K extends RefKind>(r: RefRecord<K>) {
  return { id: r.id, kind: r.kind, name: r.name, effectiveFrom: r.effectiveFrom, effectiveTo: r.effectiveTo, source: r.source, reviewedAt: r.reviewedAt, data: r.data }
}

export type PublicRecord<K extends RefKind = RefKind> = ReturnType<typeof publicView<K>>

/** A public (approved) tariff record from /api/refdata as the engine's TariffVersion. */
export function tariffFromPublic(r: PublicRecord<'tariff'>): TariffVersion {
  return {
    id: r.id,
    name: r.name,
    geography: r.data.geography,
    customerClass: r.data.customerClass,
    effectiveFrom: r.effectiveFrom,
    effectiveTo: r.effectiveTo,
    source: { title: r.source.title, url: r.source.url ?? undefined, retrievedAt: r.source.retrievedAt },
    reviewStatus: 'approved',
    reviewedAt: r.reviewedAt ?? undefined,
    currency: 'JMD',
    components: r.data.components,
  }
}
