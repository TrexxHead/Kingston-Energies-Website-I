import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { CATALOG } from '@/lib/catalog'
import { sendQuoteRequestEmails } from '@/lib/email'

const contactSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(160),
  phone: z.string().max(40).optional(),
  message: z.string().min(1).max(2000),
  // Optional structured detail from the /contact quote-request flow — when
  // present, an itemized quote confirmation is emailed back to the customer
  // automatically. Product prices are always resolved server-side from the
  // catalog, never trusted from the client.
  items: z.array(z.object({ id: z.string().max(60), qty: z.number().int().min(1).max(50) })).max(20).optional(),
  shoppingFor: z.string().max(60).optional(),
  interests: z.array(z.string().max(60)).max(10).optional(),
  area: z.string().max(80).optional(),
  timeframe: z.string().max(40).optional(),
})

export async function POST(request: Request) {
  // 5 submissions per IP per 10 minutes — blunts contact-form spam.
  const rl = await rateLimit(`contact:${clientIp(request)}`, 5, 10 * 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const parsed = contactSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please check the form and try again.' }, { status: 400 })
  }

  const { name, email, phone, message, items, shoppingFor, interests, area, timeframe } = parsed.data

  const resolvedItems = (items ?? [])
    .map((i) => {
      const product = CATALOG.find((p) => p.id === i.id)
      return product ? { name: product.name, price: product.price, qty: i.qty } : null
    })
    .filter((i): i is { name: string; price: number; qty: number } => i !== null)

  try {
    await prisma.lead.create({
      data: { name, email, phone: phone || null, message },
    })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json({ error: 'Failed to submit form' }, { status: 500 })
  }

  if (shoppingFor || resolvedItems.length > 0) {
    void sendQuoteRequestEmails({
      toCustomer: email,
      customerName: name,
      shoppingFor: shoppingFor ?? 'Not specified',
      interests: interests ?? [],
      items: resolvedItems,
      area: area || null,
      timeframe: timeframe ?? 'Not specified',
    })
  }

  // Don't echo the stored record back to the client.
  return NextResponse.json({ success: true })
}
