import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { rateLimit, clientIp } from '@/lib/rateLimit'

const contactSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(160),
  phone: z.string().max(40).optional(),
  message: z.string().min(1).max(2000),
})

export async function POST(request: Request) {
  // 5 submissions per IP per 10 minutes — blunts contact-form spam.
  const rl = rateLimit(`contact:${clientIp(request)}`, 5, 10 * 60_000)
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

  const { name, email, phone, message } = parsed.data

  try {
    await prisma.lead.create({
      data: { name, email, phone: phone || null, message },
    })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json({ error: 'Failed to submit form' }, { status: 500 })
  }

  // Don't echo the stored record back to the client.
  return NextResponse.json({ success: true })
}
