import { NextResponse } from 'next/server'
import { z } from 'zod'
import { guardAdmin } from '@/lib/requireAdmin'
import { getMarketing, saveMarketing, type MarketingConfig } from '@/lib/marketing'

const schema = z.object({
  banners: z.array(z.object({ text: z.string().max(160), active: z.boolean() })).max(12),
  flash: z.object({
    enabled: z.boolean(),
    headline: z.string().max(80),
    subtext: z.string().max(120),
    href: z.string().max(200),
  }),
})

export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied
  return NextResponse.json({ marketing: await getMarketing() })
}

export async function PUT(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid marketing settings.' }, { status: 400 })

  await saveMarketing(parsed.data as MarketingConfig)
  return NextResponse.json({ ok: true })
}
