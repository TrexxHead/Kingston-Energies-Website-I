import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

/** GET ?scope=upcoming|past|all — bookings for staff. */
export async function GET(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied
  const scope = new URL(request.url).searchParams.get('scope') ?? 'upcoming'
  const today = new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10)
  const bookings = await prisma.serviceBooking.findMany({
    where: scope === 'upcoming' ? { date: { gte: today } } : scope === 'past' ? { date: { lt: today } } : {},
    orderBy: scope === 'past' ? [{ date: 'desc' }] : [{ date: 'asc' }, { window: 'desc' }],
    take: 300,
  })
  return NextResponse.json({ bookings })
}
