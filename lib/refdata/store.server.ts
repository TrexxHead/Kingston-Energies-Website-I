import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { parseData, type RefKind, type RefRecord, type RefStatus } from './types'

/**
 * Reference data lives in one SiteSetting row (no schema migration). Writes
 * are compare-and-swap on the stored text, so two admins saving at once
 * can't silently overwrite each other — the second gets a conflict.
 */
const KEY = 'refdata:v1'

interface Stored {
  records: RefRecord[]
}

async function read(): Promise<{ raw: string | null; data: Stored }> {
  const row = await prisma.siteSetting.findUnique({ where: { key: KEY } })
  if (!row) return { raw: null, data: { records: [] } }
  try {
    const parsed = JSON.parse(row.value) as Stored
    return { raw: row.value, data: { records: Array.isArray(parsed.records) ? parsed.records : [] } }
  } catch {
    return { raw: row.value, data: { records: [] } }
  }
}

export class RefDataConflict extends Error {}

async function write(prevRaw: string | null, next: Stored): Promise<void> {
  const value = JSON.stringify(next)
  if (prevRaw === null) {
    try {
      await prisma.siteSetting.create({ data: { key: KEY, value } })
    } catch {
      throw new RefDataConflict('Someone else saved reference data at the same time — reload and try again.')
    }
    return
  }
  const res = await prisma.siteSetting.updateMany({ where: { key: KEY, value: prevRaw }, data: { value } })
  if (res.count !== 1) throw new RefDataConflict('Someone else saved reference data at the same time — reload and try again.')
}

export async function listRecords(): Promise<RefRecord[]> {
  return (await read()).data.records
}

export interface NewRecord {
  kind: RefKind
  name: string
  effectiveFrom: string
  effectiveTo?: string | null
  source: RefRecord['source']
  data: unknown
}

export async function createRecord(input: NewRecord, actor: string | null): Promise<RefRecord> {
  const parsed = parseData(input.kind, input.data)
  if (!parsed.ok) throw new Error(parsed.error)
  if (input.effectiveTo && input.effectiveTo <= input.effectiveFrom) throw new Error('The end date must be after the start date.')
  const { raw, data } = await read()
  const record: RefRecord = {
    id: randomUUID(),
    kind: input.kind,
    name: input.name,
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo ?? null,
    source: input.source,
    status: 'draft',
    createdBy: actor,
    createdAt: new Date().toISOString(),
    reviewedBy: null,
    reviewedAt: null,
    data: parsed.data,
  } as RefRecord
  await write(raw, { records: [...data.records, record] })
  return record
}

/** Drafts can be edited; approved/retired records are history and can't change. */
export async function updateDraft(id: string, input: Omit<NewRecord, 'kind'>): Promise<RefRecord> {
  const { raw, data } = await read()
  const existing = data.records.find((r) => r.id === id)
  if (!existing) throw new Error('Not found.')
  if (existing.status !== 'draft') throw new Error('Only drafts can be edited. Create a new version instead.')
  const parsed = parseData(existing.kind, input.data)
  if (!parsed.ok) throw new Error(parsed.error)
  const updated = { ...existing, name: input.name, effectiveFrom: input.effectiveFrom, effectiveTo: input.effectiveTo ?? null, source: input.source, data: parsed.data } as RefRecord
  await write(raw, { records: data.records.map((r) => (r.id === id ? updated : r)) })
  return updated
}

/**
 * Approve or retire. Approving records the reviewer; the reviewer may be the
 * person who entered it (single-admin team) — the admin screen says so.
 */
export async function setStatus(id: string, status: Exclude<RefStatus, 'draft'>, actor: string | null): Promise<RefRecord> {
  const { raw, data } = await read()
  const existing = data.records.find((r) => r.id === id)
  if (!existing) throw new Error('Not found.')
  if (status === 'approved' && existing.status !== 'draft') throw new Error('Only drafts can be approved.')
  if (status === 'retired' && existing.status === 'retired') throw new Error('Already retired.')
  const updated: RefRecord = {
    ...existing,
    status,
    ...(status === 'approved' ? { reviewedBy: actor, reviewedAt: new Date().toISOString() } : {}),
  }
  await write(raw, { records: data.records.map((r) => (r.id === id ? updated : r)) })
  return updated
}

/** Delete a draft that was entered by mistake. */
export async function deleteDraft(id: string): Promise<void> {
  const { raw, data } = await read()
  const existing = data.records.find((r) => r.id === id)
  if (!existing) throw new Error('Not found.')
  if (existing.status !== 'draft') throw new Error('Only drafts can be deleted. Retire it instead.')
  await write(raw, { records: data.records.filter((r) => r.id !== id) })
}
