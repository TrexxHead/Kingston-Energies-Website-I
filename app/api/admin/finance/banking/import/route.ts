import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { parseStatement } from '@/lib/banking/parse'

const MAX_BYTES = 5 * 1024 * 1024

/**
 * Import a CSV or OFX statement onto a connection.
 *
 * Imported lines are the bank's record, not ours — nothing posts to the ledger
 * here. They land as UNMATCHED and wait for someone to say what each one is.
 * Re-importing an overlapping export is safe: rows de-duplicate on their
 * fingerprint, so the usual habit of downloading "last 90 days" every month
 * doesn't double anything up.
 */
export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  const connectionId = String(form?.get('connectionId') ?? '')

  if (!connectionId) return NextResponse.json({ error: 'Choose which account this statement belongs to.' }, { status: 400 })
  if (!(file instanceof File)) return NextResponse.json({ error: 'Attach a CSV or OFX statement file.' }, { status: 400 })
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'That file is over 5MB. Export a shorter date range and import it in parts.' }, { status: 400 })
  }

  const connection = await prisma.bankConnection.findUnique({ where: { id: connectionId } })
  if (!connection) return NextResponse.json({ error: 'That bank connection no longer exists.' }, { status: 404 })

  const text = await file.text()

  let parsed
  try {
    parsed = parseStatement(text, file.name)
  } catch (err) {
    // Parse failures are the user's problem to fix (wrong file, odd export), so
    // the reason goes straight back rather than becoming a generic 500.
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not read that statement.' }, { status: 400 })
  }

  if (parsed.lines.length === 0) {
    return NextResponse.json(
      { error: 'No transactions could be read from that file.', skipped: parsed.skipped.slice(0, 10) },
      { status: 400 },
    )
  }

  const before = await prisma.bankStatementLine.count({ where: { connectionId } })
  await prisma.bankStatementLine.createMany({
    data: parsed.lines.map((l) => ({
      connectionId,
      postedAt: l.postedAt,
      description: l.description,
      reference: l.reference,
      amount: l.amount,
      runningBalance: l.runningBalance,
      fingerprint: l.fingerprint,
    })),
    skipDuplicates: true,
  })
  const after = await prisma.bankStatementLine.count({ where: { connectionId } })

  await prisma.bankConnection.update({ where: { id: connectionId }, data: { lastImportAt: new Date() } })

  const imported = after - before
  return NextResponse.json({
    format: parsed.format,
    read: parsed.lines.length,
    imported,
    // Stated explicitly — "45 rows read, 3 new" is the reassuring answer when
    // you re-import an overlapping export, and silence would look like a bug.
    duplicates: parsed.lines.length - imported,
    skipped: parsed.skipped.slice(0, 20),
  })
}
