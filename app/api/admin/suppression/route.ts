import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { suppress } from '@/lib/suppression'

export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  const rows = await prisma.suppression.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({
    suppressed: rows.map((r) => ({ id: r.id, email: r.email, reason: r.reason, createdAt: r.createdAt.toISOString() })),
  })
}

const createSchema = z.object({ email: z.string().email() })

/** Manually block an address from future campaign sends. */
export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Provide a valid email.' }, { status: 400 })

  await suppress(parsed.data.email, 'MANUAL')
  return NextResponse.json({ ok: true }, { status: 201 })
}
