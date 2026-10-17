import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { availability, createBooking, BookingUnavailable } from '@/lib/bookings/store.server'
import { WINDOWS } from '@/lib/bookings/config'
import { PARISHES } from '@/lib/map/parishes'
import { buildFygaroRedirectUrl, fygaroConfigured } from '@/lib/fygaro'
import { sendBookingEmails } from '@/lib/email'
import { sendWhatsAppTemplate, whatsappApiConfigured } from '@/lib/whatsapp'
import { WINDOW_LABEL } from '@/lib/bookings/config'

/** GET /api/bookings — active services, deposit terms and bookable days with places left. */
export async function GET() {
  const { cfg, days } = await availability()
  return NextResponse.json(
    { services: cfg.services.filter((s) => s.active), days, depositTerms: cfg.depositTerms, onlineDeposits: fygaroConfigured(), whatsappUpdates: whatsappApiConfigured() && Boolean(process.env.WHATSAPP_TEMPLATE_BOOKING) },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

const schema = z.object({
  serviceId: z.string().min(2).max(40),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  window: z.enum(WINDOWS),
  customerName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200).optional(),
  phone: z.string().trim().min(7).max(40),
  parish: z.string().refine((p) => PARISHES.some((x) => x.id === p), 'Choose a parish.'),
  address: z.string().trim().max(400).optional(),
  notes: z.string().trim().max(1000).optional(),
  whatsappOptIn: z.boolean().optional(),
})

/**
 * POST /api/bookings — book a visit. With a deposit and Fygaro configured,
 * the response carries the Fygaro payment link; the deposit is marked paid
 * only by the signed webhook. Without online payment the booking is still
 * held and staff arrange the deposit.
 */
export async function POST(request: Request) {
  const rl = await rateLimit(`booking:${clientIp(request)}`, 5, 10 * 60_000)
  if (!rl.ok) return NextResponse.json({ error: 'Too many bookings from this connection — try again later.' }, { status: 429 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Please check the form.' }, { status: 400 })
  const session = await getServerSession(authOptions)
  try {
    const b = await createBooking({ ...parsed.data, userId: session?.user?.id ?? null })
    const payUrl = b.depositAmount > 0 && fygaroConfigured() ? buildFygaroRedirectUrl({ orderNo: b.bookingNo, total: b.depositAmount }) : null
    void sendBookingEmails(b, Boolean(payUrl))
    // Approved template, e.g. "Hi {{1}}, your {{2}} visit on {{3}} is booked (ref {{4}})."
    void sendWhatsAppTemplate({
      to: b.phone,
      template: process.env.WHATSAPP_TEMPLATE_BOOKING,
      consent: b.whatsappOptIn,
      bodyParams: [b.customerName, b.serviceName, `${b.date}, ${WINDOW_LABEL[b.window as keyof typeof WINDOW_LABEL].toLowerCase()}`, b.bookingNo],
    })
    return NextResponse.json({ booking: { bookingNo: b.bookingNo, serviceName: b.serviceName, date: b.date, window: b.window, depositAmount: b.depositAmount, depositStatus: b.depositStatus }, payUrl }, { status: 201 })
  } catch (e) {
    if (e instanceof BookingUnavailable) return NextResponse.json({ error: e.message }, { status: 409 })
    console.error('[bookings] create failed:', e)
    return NextResponse.json({ error: 'We couldn’t save the booking just now.' }, { status: 500 })
  }
}
