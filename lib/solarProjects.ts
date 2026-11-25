import { z } from 'zod'

/**
 * Solar projects: the stages a customer's system goes through, the design
 * snapshot carried from /solar/design, and the quotation, structured as in
 * the owner's PV course capstone (load summary → sizing → materials by
 * section → labour → inspection → subtotal / GCT / total). Prices are entered
 * by staff; nothing here invents one.
 */

export const STAGES = [
  { id: 'enquiry', label: 'Design received', customer: 'We have your design. We’ll call to arrange a site survey.' },
  { id: 'survey_booked', label: 'Survey booked', customer: 'Your site survey is booked.' },
  { id: 'survey_done', label: 'Survey done', customer: 'We’ve surveyed your site and are preparing your design and quote.' },
  { id: 'quote_sent', label: 'Quote ready', customer: 'Your quote is ready to review.' },
  { id: 'quote_accepted', label: 'Quote accepted', customer: 'Thank you — we’re ordering equipment and starting approvals.' },
  { id: 'approvals', label: 'Approvals', customer: 'Approvals in progress (inspection booking; licence and JPS contract if you export).' },
  { id: 'installing', label: 'Installation', customer: 'Installation is scheduled or under way.' },
  { id: 'inspection', label: 'Inspection', customer: 'Testing done; waiting on the licensed inspector’s certificate.' },
  { id: 'switched_on', label: 'Switched on', customer: 'Your system is on.' },
  { id: 'handover', label: 'Handed over', customer: 'Handover complete — your documents are below.' },
] as const
export type StageId = (typeof STAGES)[number]['id']
export const STAGE_IDS = STAGES.map((s) => s.id) as [StageId, ...StageId[]]
export const stageIndex = (id: string) => STAGES.findIndex((s) => s.id === id)
export const stageLabel = (id: string) => (id === 'cancelled' ? 'Cancelled' : (STAGES.find((s) => s.id === id)?.label ?? id))

export const DOC_KINDS = {
  design: 'Design',
  quote: 'Quotation',
  single_line: 'Single-line diagram',
  datasheet: 'Datasheet',
  test_results: 'Test results',
  settings: 'Inverter settings',
  certificate: 'Inspector’s certificate',
  handover: 'Handover record',
  photo: 'Photo',
  other: 'Other',
} as const
export type DocKind = keyof typeof DOC_KINDS

// ── Design snapshot (what /solar/design sends) ──

export const designSnapshotSchema = z.object({
  engine: z.string().max(20),
  type: z.enum(['grid_tied', 'hybrid', 'off_grid']),
  source: z.enum(['bill', 'equipment']),
  billMonthlyKwh: z.number().nonnegative().max(100_000).nullable(),
  dailyWh: z.number().positive().max(10_000_000),
  nightWh: z.number().nonnegative().max(10_000_000),
  storageWh: z.number().nonnegative().max(10_000_000).nullable(),
  peakW: z.number().nonnegative().max(1_000_000).nullable(),
  surgeW: z.number().nonnegative().max(1_000_000).nullable(),
  backup: z.enum(['none', 'essentials', 'night', 'day']),
  peakSunHours: z.number().min(1).max(9),
  derate: z.number().min(0.5).max(1),
  modules: z.number().int().positive().max(2000),
  moduleWatts: z.number().positive().max(1000),
  kwp: z.number().positive().max(2000),
  expectedDailyKwh: z.number().nonnegative().max(100_000),
  inverterKw: z.number().positive().max(2000).nullable(),
  batteryKwh: z.number().nonnegative().max(100_000).nullable(),
  batteryDcCurrentA: z.number().nonnegative().max(100_000).nullable(),
  solarShare: z.number().min(0).max(1),
  priceRange: z.object({ low: z.number().nonnegative(), high: z.number().nonnegative() }).nullable(),
  assumptions: z.array(z.string().max(300)).max(30),
})
export type DesignSnapshot = z.infer<typeof designSnapshotSchema>

export const TYPE_LABEL: Record<DesignSnapshot['type'], string> = { grid_tied: 'Grid-tied', hybrid: 'Hybrid (solar + battery)', off_grid: 'Off-grid' }

export function designSummaryLines(d: DesignSnapshot): string[] {
  return [
    `${TYPE_LABEL[d.type]} system: ${d.modules} × ${d.moduleWatts} W panels (${d.kwp.toFixed(2)} kWp)${d.inverterKw ? `, ${d.inverterKw} kW inverter` : ''}${d.batteryKwh ? `, ${d.batteryKwh.toFixed(1)} kWh battery` : ''}.`,
    `Use: ${(d.dailyWh / 1000).toFixed(1)} kWh a day (${Math.round((d.nightWh / d.dailyWh) * 100)}% after dark)${d.billMonthlyKwh ? `, bill ${Math.round(d.billMonthlyKwh)} kWh/month` : ''}${d.peakW ? `, busy-evening peak ≈ ${Math.round(d.peakW)} W` : ''}.`,
    `Expected ≈ ${d.expectedDailyKwh.toFixed(1)} kWh a day at ${d.peakSunHours} sun hours × ${d.derate.toFixed(3)} losses; ≈ ${Math.round(d.solarShare * 100)}% of use from solar.`,
    `Calculator version ${d.engine}.`,
  ]
}

// ── Quotation ──

export const QUOTE_SECTIONS = {
  equipment: 'Main equipment',
  protection: 'Protection',
  mounting: 'Mounting',
  cabling: 'Cabling and connections',
  labour: 'Labour',
  inspection: 'Inspection and approvals',
  other: 'Other',
} as const
export type QuoteSection = keyof typeof QUOTE_SECTIONS

export const quoteLineSchema = z.object({
  id: z.string().min(1).max(40),
  section: z.enum(Object.keys(QUOTE_SECTIONS) as [QuoteSection, ...QuoteSection[]]),
  item: z.string().trim().min(1).max(120),
  spec: z.string().max(300).default(''),
  qty: z.number().nonnegative().max(100_000),
  unit: z.string().max(20).default('ea'),
  unitPrice: z.number().nonnegative().max(1_000_000_000).nullable(),
  gct: z.boolean().default(false),
})
export type QuoteLine = z.infer<typeof quoteLineSchema>

export const quoteSchema = z.object({
  version: z.literal(1),
  lines: z.array(quoteLineSchema).max(120),
  gctRatePct: z.number().min(0).max(50),
  validDays: z.number().int().min(1).max(180),
  notes: z.string().max(4000).default(''),
  /** Design figures after the survey (staff may correct the online design). */
  sizing: z.object({ kwp: z.number().nonnegative(), modules: z.number().int().nonnegative(), moduleWatts: z.number().nonnegative(), inverterKw: z.number().nonnegative().nullable(), batteryKwh: z.number().nonnegative().nullable(), expectedDailyKwh: z.number().nonnegative() }),
})
export type Quote = z.infer<typeof quoteSchema>

export interface QuoteTotals {
  subtotal: number
  gct: number
  total: number
  /** Lines still without a price — a quote can't be sent with any. */
  unpriced: number
}

export function quoteTotals(q: Pick<Quote, 'lines' | 'gctRatePct'>): QuoteTotals {
  let subtotal = 0
  let gct = 0
  let unpriced = 0
  for (const l of q.lines) {
    if (l.unitPrice == null) {
      unpriced++
      continue
    }
    const amount = l.qty * l.unitPrice
    subtotal += amount
    if (l.gct) gct += (amount * q.gctRatePct) / 100
  }
  const r = (n: number) => Math.round(n * 100) / 100
  return { subtotal: r(subtotal), gct: r(gct), total: r(subtotal + gct), unpriced }
}

/**
 * A starting quote from the design, following the capstone material list.
 * Quantities and specs come from the design; every price is left for staff
 * to enter, and every line can be edited or removed after the survey.
 */
export function defaultQuote(d: DesignSnapshot, exportsToGrid: boolean): Quote {
  let n = 0
  const line = (section: QuoteSection, item: string, spec: string, qty: number, unit = 'ea'): QuoteLine => ({ id: `l${++n}`, section, item, spec, qty, unit, unitPrice: null, gct: false })
  const battery = d.type !== 'grid_tied' && d.batteryKwh
  const lines: QuoteLine[] = [
    line('equipment', 'Solar panels', `${d.moduleWatts} W mono half-cut; salt-mist certified near the coast`, d.modules),
    d.inverterKw
      ? line('equipment', d.type === 'grid_tied' ? 'Grid-tie inverter' : 'Hybrid inverter', `${d.inverterKw} kW, 50 Hz, 110/220 V split phase${d.type === 'grid_tied' ? '' : ', 48 V battery'}, with Wi-Fi monitoring`, 1)
      : line('equipment', 'Inverter', 'Size confirmed at survey', 1),
    ...(battery ? [line('equipment', 'Battery bank', `${d.batteryKwh!.toFixed(1)} kWh lithium iron phosphate (LFP), 51.2 V${d.batteryDcCurrentA ? `; must supply ≥ ${Math.ceil(d.batteryDcCurrentA)} A` : ''}`, 1, 'set')] : []),
    ...(d.type === 'off_grid' ? [line('equipment', 'Backup generator', 'Sized at survey; remote start with transfer switch', 1)] : []),
    ...(battery ? [line('protection', 'Battery main breaker', `DC, sized to the battery current${d.batteryDcCurrentA ? ` (≥ ${Math.ceil(d.batteryDcCurrentA * 1.25)} A)` : ''}`, 1)] : []),
    line('protection', 'PV string breakers', 'DC, ≥ 600 V, sized at 1.56 × string Isc', 1, 'set'),
    line('protection', 'DC surge protection', 'Type 2, PV, ≥ 600 V', 1, 'set'),
    line('protection', 'AC breakers and surge protection', 'Sized to the inverter output; Type 2 SPD', 1, 'set'),
    line('protection', 'Earthing and bonding', 'Bonding clips/lugs, earth bar, rod and conductor', 1, 'set'),
    line('mounting', 'Mounting system', 'Rated for the design wind speed; tilt legs on concrete slab or L-feet into purlins on zinc', 1, 'set'),
    line('mounting', 'Anchors and roof sealant', 'Stainless fasteners; every penetration sealed', 1, 'lot'),
    line('cabling', 'PV cable and MC4 connectors', '6 mm² PV1-F, red and black; connectors matched to the panels', 1, 'lot'),
    ...(battery ? [line('cabling', 'Battery cables and busbars', 'Sized to the battery current, equal lengths, crimped lugs', 1, 'set')] : []),
    line('cabling', 'AC cable, trunking and conduit', 'UV-rated outdoors; sized for ≤ 2% voltage drop', 1, 'lot'),
    line('cabling', 'Labels and consumables', 'UV-stable ties, warning labels', 1, 'lot'),
    line('labour', 'Installation, testing and commissioning', 'Includes string, polarity and insulation tests and a commissioning record', 1, 'job'),
    line('inspection', 'Licensed electrical inspection', 'Government Electrical Regulator certificate of compliance', 1),
    ...(exportsToGrid ? [line('inspection', 'Licence and JPS Standard Offer Contract', 'Application support for net billing (fees as charged)', 1)] : []),
  ]
  return {
    version: 1,
    lines,
    gctRatePct: 15,
    validDays: 30,
    notes: '',
    sizing: { kwp: d.kwp, modules: d.modules, moduleWatts: d.moduleWatts, inverterKw: d.inverterKw, batteryKwh: d.batteryKwh, expectedDailyKwh: d.expectedDailyKwh },
  }
}

/** SP- + 6 unambiguous characters. */
export function newProjectNo(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  for (const b of bytes) s += chars[b % chars.length]
  return `SP-${s}`
}
