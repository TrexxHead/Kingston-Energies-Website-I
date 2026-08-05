import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { guardAdmin } from '@/lib/requireAdmin'
import { reverseEntry } from '@/lib/ledger/post'

const schema = z.object({ reason: z.string().trim().min(1).max(500) })

/**
 * Reverse a posted journal entry. Never edits the original in place — this
 * posts a mirror-image entry and links it back via reversedById, so both the
 * mistake and the fix stay on the books permanently. Pair with a follow-up
 * POST to /journal to post the corrected entry.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'A reason is required to reverse an entry.' }, { status: 400 })

  const entry = await prisma.journalEntry.findUnique({ where: { id }, select: { id: true, reversedById: true, entryNo: true } })
  if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  if (entry.reversedById) return NextResponse.json({ error: `${entry.entryNo} has already been reversed.` }, { status: 409 })

  const session = await getServerSession(authOptions)
  const reversal = await reverseEntry(id, session?.user?.email ?? null, parsed.data.reason)
  if (!reversal) return NextResponse.json({ error: 'Could not reverse that entry.' }, { status: 400 })

  return NextResponse.json({ reversal }, { status: 201 })
}
