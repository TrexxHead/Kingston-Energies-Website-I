import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { prisma } from '@/lib/prisma'
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
  /** A solar project from the online designer this survey is for. */
  projectNo: z.string().regex(/^SP-[A-Z0-9]{6}$/).optional(),
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
  const { projectNo, ...data } = parsed.data
  // Link only to a project whose contact details match the booking's, so a project number alone can't be hijacked.
  const project = projectNo ? await prisma.solarProject.findUnique({ where: { projectNo }, select: { id: true, email: true, phone: true, stage: true } }) : null
  const digits = (s: string) => s.replace(/\D/g, '').slice(-7)
  const linked = project && ((data.email && data.email.toLowerCase() === project.email) || digits(data.phone) === digits(project.phone)) ? project : null
  try {
    const b = await createBooking({ ...data, notes: [linked ? `Solar project ${projectNo}.` : null, data.notes].filter(Boolean).join(' ') || undefined, userId: session?.user?.id ?? null })
    if (linked) {
      await prisma.solarProject
        .update({
          where: { id: linked.id },
          data: { bookingNo: b.bookingNo, ...(linked.stage === 'enquiry' ? { stage: 'survey_booked' } : {}), events: { create: { stage: linked.stage === 'enquiry' ? 'survey_booked' : null, note: `Site survey booked for ${b.date} (${b.window}), ${b.bookingNo}.`, createdBy: 'customer' } } },
        })
        .catch((e) => console.error('[bookings] project link failed:', e))
    }
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
