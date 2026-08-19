import { NextResponse } from 'next/server'
import { z } from 'zod'
import { guardAdmin } from '@/lib/requireAdmin'
import { getStormPrepContent, saveStormPrepContent } from '@/lib/stormPrepContent'

const checklistItemSchema = z.object({
  id: z.string().min(1).max(60),
  text: z.string().min(1).max(280),
  category: z.enum(['power', 'light', 'food', 'records']),
  timing: z.enum(['5-7-days', '72h', '24h', 'during']),
})

const schema = z.object({
  checklist: z.array(checklistItemSchema).min(1).max(30),
  kitProductIds: z.array(z.string().min(1).max(60)).max(12),
})

export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied
  return NextResponse.json(await getStormPrepContent())
}

export async function PUT(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid Storm prep content.' }, { status: 400 })

  await saveStormPrepContent(parsed.data)
  return NextResponse.json({ ok: true })
}
