import { NextResponse } from 'next/server'
import { z } from 'zod'
import { guardAdmin } from '@/lib/requireAdmin'
import { getAccounting, saveAccounting, type AccountingConfig } from '@/lib/accounting'

const schema = z.object({
  gctRate: z.number().min(0).max(100),
  gctInclusive: z.boolean(),
})

export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied
  return NextResponse.json({ accounting: await getAccounting() })
}

export async function PUT(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid settings.' }, { status: 400 })

  await saveAccounting(parsed.data as AccountingConfig)
  return NextResponse.json({ ok: true })
}
