import { NextResponse } from 'next/server'
import { z } from 'zod'
import { guardAdmin } from '@/lib/requireAdmin'
import { getAnnouncement, saveAnnouncement, type Announcement } from '@/lib/announcement'

const schema = z.object({
  enabled: z.boolean(),
  message: z.string().max(200),
  link: z.string().max(300),
  style: z.enum(['marquee', 'bar']),
})

export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied
  return NextResponse.json({ announcement: await getAnnouncement() })
}

export async function PUT(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid announcement.' }, { status: 400 })

  await saveAnnouncement(parsed.data as Announcement)
  return NextResponse.json({ ok: true })
}
