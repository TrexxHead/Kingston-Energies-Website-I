import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { generalLedger } from '@/lib/ledger/reports'

/** General-ledger detail for one account. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const url = new URL(request.url)
  const from = url.searchParams.get('from') ? new Date(url.searchParams.get('from') as string) : null
  const to = url.searchParams.get('to') ? new Date(url.searchParams.get('to') as string) : null

  const ledger = await generalLedger(id, { from, to })
  if (!ledger) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  return NextResponse.json(ledger)
}

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  subtype: z.string().max(60).nullish(),
  isBank: z.boolean().optional(),
  archived: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid update' }, { status: 400 })

  const account = await prisma.ledgerAccount.findUnique({ where: { id } })
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  // System accounts are wired into the posting engine by code — they can be
  // renamed but never archived out from under it.
  if (account.isSystem && parsed.data.archived) {
    return NextResponse.json({ error: 'System accounts cannot be archived. The posting engine depends on them.' }, { status: 400 })
  }

  const updated = await prisma.ledgerAccount.update({ where: { id }, data: parsed.data })
  return NextResponse.json({ account: updated })
}

/** Delete an unused, non-system account. Accounts with history can only be archived. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const account = await prisma.ledgerAccount.findUnique({ where: { id } })
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  if (account.isSystem) return NextResponse.json({ error: 'System accounts cannot be deleted.' }, { status: 400 })

  const lineCount = await prisma.journalLine.count({ where: { accountId: id } })
  if (lineCount > 0) {
    return NextResponse.json(
      { error: `This account has ${lineCount} posted entries. Archive it instead. Deleting would break the audit trail.` },
      { status: 400 },
    )
  }

  await prisma.ledgerAccount.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
