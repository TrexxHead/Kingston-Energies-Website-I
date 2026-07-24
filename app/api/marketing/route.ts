import { NextResponse } from 'next/server'
import { getMarketing } from '@/lib/marketing'

/** Public: the active homepage banners + the flash sale (only when enabled). */
export async function GET() {
  const m = await getMarketing()
  return NextResponse.json({
    banners: m.banners.filter((b) => b.active && b.text.trim()),
    flash: m.flash.enabled && m.flash.headline.trim() ? m.flash : null,
  })
}
