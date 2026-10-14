import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { logActivity } from '@/lib/activityLog'

const schema = z.object({
  status: z.enum(['requested', 'confirmed', 'completed', 'cancelled']).optional(),
  // Staff can record a deposit paid another way (bank transfer, cash) or refunded — never "paid" by guess.
  depositStatus: z.enum(['paid', 'refunded']).optional(),
  staffNote: z.string().max(2000).optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const { id } = await params
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid update.' }, { status: 400 })
  const d = parsed.data
  const booking = await prisma.serviceBooking
    .update({ where: { id }, data: { ...d, ...(d.depositStatus === 'paid' ? { depositPaidAt: new Date() } : {}) } })
    .catch(() => null)
  if (!booking) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  logActivity({ label: 'Booking updated', detail: `${booking.bookingNo}: ${Object.entries(d).map(([k, v]) => `${k}=${v}`).join(', ')}`, entity: 'ServiceBooking', entityId: id, actorEmail: session.user?.email })
  return NextResponse.json({ booking })
}
