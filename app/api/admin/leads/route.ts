import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

/** Leads captured via the contact form (app/api/contact/route.ts) — no admin surface existed for these before. */
export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  const leads = await prisma.lead.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({
    leads: leads.map((l) => ({
      id: l.id,
      name: l.name,
      email: l.email,
      phone: l.phone,
      message: l.message,
      status: l.status,
      createdAt: l.createdAt.toISOString(),
    })),
  })
}
