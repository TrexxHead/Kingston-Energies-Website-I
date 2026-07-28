import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma, isMissingSchemaError } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { migrationPendingResponse } from '@/lib/apiErrors'

/** Branches, each with how much of the ledger is actually attributed to it. */
export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  try {
    return await getBranches()
  } catch (err) {
    if (isMissingSchemaError(err)) return migrationPendingResponse()
    throw err
  }
}

async function getBranches() {
  const [branches, unassigned] = await Promise.all([
    prisma.branch.findMany({ orderBy: [{ archived: 'asc' }, { code: 'asc' }], include: { _count: { select: { entries: true } } } }),
    prisma.journalEntry.count({ where: { branchId: null } }),
  ])

  return NextResponse.json({
    branches: branches.map((b) => ({
      id: b.id,
      code: b.code,
      name: b.name,
      isDefault: b.isDefault,
      archived: b.archived,
      entryCount: b._count.entries,
    })),
    // Surfaced rather than hidden: if most entries are unassigned, per-branch
    // reports are misleading and the screen should say so.
    unassignedEntries: unassigned,
  })
}

const schema = z.object({
  code: z.string().min(1).max(12),
  name: z.string().min(1).max(80),
  isDefault: z.boolean().optional(),
})

export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Enter a short code and a name.' }, { status: 400 })
  const d = parsed.data
  const code = d.code.toUpperCase().replace(/\s+/g, '')

  const clash = await prisma.branch.findUnique({ where: { code } })
  if (clash) return NextResponse.json({ error: `A branch with the code ${code} already exists.` }, { status: 409 })

  const branch = await prisma.$transaction(async (tx) => {
    if (d.isDefault) await tx.branch.updateMany({ data: { isDefault: false } })
    return tx.branch.create({ data: { code, name: d.name, isDefault: d.isDefault ?? false } })
  })

  return NextResponse.json({ id: branch.id, code: branch.code }, { status: 201 })
}

const patchSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80).optional(),
  isDefault: z.boolean().optional(),
  archived: z.boolean().optional(),
})

/**
 * Branches are archived, never deleted, once anything is posted against them —
 * removing one would orphan the history it explains.
 */
export async function PATCH(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid branch' }, { status: 400 })
  const { id, ...changes } = parsed.data

  const branch = await prisma.branch.findUnique({ where: { id }, include: { _count: { select: { entries: true } } } })
  if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 })

  await prisma.$transaction(async (tx) => {
    if (changes.isDefault) await tx.branch.updateMany({ data: { isDefault: false } })
    await tx.branch.update({ where: { id }, data: changes })
  })

  return NextResponse.json({ ok: true })
}
