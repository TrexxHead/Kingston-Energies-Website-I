import { NextResponse } from 'next/server'
import { z } from 'zod'
import { guardAdmin } from '@/lib/requireAdmin'
import { getCategoryColors, saveCategoryColors } from '@/lib/expenseCategoryColors'

export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied
  return NextResponse.json({ colors: await getCategoryColors() })
}

const schema = z.object({
  colors: z.record(z.string().max(60), z.string().regex(/^#[0-9a-fA-F]{6}$/)),
})

export async function PUT(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Colors must be hex values like #dc2626.' }, { status: 400 })

  await saveCategoryColors(parsed.data.colors)
  return NextResponse.json({ ok: true })
}
