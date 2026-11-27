import { randomUUID } from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { applySheetRecords, listRecords } from './store.server'
import { recordsFromSheet, isAllowedSheetUrl, SHEET_KINDS, SYNC_ACTOR } from './priceSheets'
import { inEffect, type RefRecord } from './types'

/**
 * Automatic price sync: published Google Sheet CSVs → reference data, daily
 * (Vercel Cron) and on demand ("Sync now" in admin). Config and the last run
 * live in one SiteSetting row.
 */
const KEY = 'pricesync:v1'

export const sheetConfigSchema = z.object({
  id: z.string().min(1).max(64),
  kind: z.enum(SHEET_KINDS),
  url: z.string().url().max(1000).refine(isAllowedSheetUrl, 'Use the “Publish to web → CSV” link from Google Sheets (https://docs.google.com/…).'),
  autoApprove: z.boolean(),
})
export type SheetConfig = z.infer<typeof sheetConfigSchema>

export interface SheetRunResult {
  sheetId: string
  kind: SheetConfig['kind']
  ok: boolean
  added: string[]
  unchanged: number
  errors: string[]
}
export interface PriceSyncState {
  sheets: SheetConfig[]
  last: { at: string; trigger: 'cron' | 'manual'; results: SheetRunResult[] } | null
}

export async function readSyncState(): Promise<PriceSyncState> {
  const row = await prisma.siteSetting.findUnique({ where: { key: KEY } })
  try {
    const v = row ? (JSON.parse(row.value) as Partial<PriceSyncState>) : {}
    const sheets = (v.sheets ?? []).flatMap((s) => (sheetConfigSchema.safeParse(s).success ? [s as SheetConfig] : []))
    return { sheets, last: v.last ?? null }
  } catch {
    return { sheets: [], last: null }
  }
}

async function writeSyncState(state: PriceSyncState) {
  const value = JSON.stringify(state)
  await prisma.siteSetting.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } })
}

export async function saveSheets(sheets: (Omit<SheetConfig, 'id'> & { id?: string })[]): Promise<SheetConfig[]> {
  const parsed = z.array(sheetConfigSchema).max(20).parse(sheets.map((s) => ({ ...s, id: s.id || randomUUID() })))
  const state = await readSyncState()
  await writeSyncState({ ...state, sheets: parsed })
  return parsed
}

const MAX_BYTES = 1_000_000

async function fetchCsv(url: string): Promise<string> {
  const res = await fetch(url, { cache: 'no-store', redirect: 'follow', signal: AbortSignal.timeout(10_000) }).catch(() => {
    throw new Error('Couldn’t reach the sheet — check the link and that the tab is still published to the web.')
  })
  if (!res.ok) throw new Error(`The sheet returned ${res.status}. Is it still published to the web?`)
  if (!isAllowedSheetUrl(res.url || url)) throw new Error('The sheet link redirected somewhere unexpected.')
  const type = res.headers.get('content-type') ?? ''
  if (type.includes('text/html')) throw new Error('That link returns a web page, not CSV — publish the tab as “Comma-separated values (.csv)”.')
  const text = await res.text()
  if (text.length > MAX_BYTES) throw new Error('The sheet is too large (over 1 MB).')
  return text
}

/** Run every configured sheet. One failing sheet doesn't stop the others. */
export async function runPriceSync(trigger: 'cron' | 'manual'): Promise<PriceSyncState['last']> {
  const state = await readSyncState()
  const today = new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10) // Jamaica date
  const results: SheetRunResult[] = []
  for (const sheet of state.sheets) {
    const base = { sheetId: sheet.id, kind: sheet.kind }
    try {
      const csv = await fetchCsv(sheet.url)
      const tariffs = sheet.kind === 'tariff_fuel' ? (await listRecords()).filter((r): r is RefRecord<'tariff'> => r.kind === 'tariff' && r.status === 'approved' && inEffect(r, today)) : []
      const { records, errors } = recordsFromSheet(sheet.kind, csv, today, tariffs)
      const out = await applySheetRecords(records, { autoApprove: sheet.autoApprove, actor: SYNC_ACTOR })
      results.push({ ...base, ok: errors.length === 0, added: out.added, unchanged: out.unchanged, errors: errors.slice(0, 20) })
    } catch (e) {
      results.push({ ...base, ok: false, added: [], unchanged: 0, errors: [(e as Error).message] })
    }
  }
  const last = { at: new Date().toISOString(), trigger, results }
  await writeSyncState({ ...(await readSyncState()), last })
  return last
}
