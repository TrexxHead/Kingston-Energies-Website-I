import { NextResponse } from 'next/server'
import { getAnnouncement } from '@/lib/announcement'

/** Public: the current site announcement (only meaningful when enabled). */
export async function GET() {
  const a = await getAnnouncement()
  return NextResponse.json({ announcement: a.enabled && a.message.trim() ? a : null })
}
