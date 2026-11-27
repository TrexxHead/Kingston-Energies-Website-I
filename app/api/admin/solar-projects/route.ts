import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

/** GET ?stage=… — solar projects for staff, newest first. */
export async function GET(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied
  const stage = new URL(request.url).searchParams.get('stage')
  const projects = await prisma.solarProject.findMany({
    where: stage && stage !== 'all' ? (stage === 'open' ? { stage: { notIn: ['handover', 'cancelled'] } } : { stage }) : {},
    orderBy: { updatedAt: 'desc' },
    take: 300,
    select: { id: true, projectNo: true, customerName: true, email: true, phone: true, parish: true, stage: true, quoteStatus: true, design: true, bookingNo: true, createdAt: true, updatedAt: true },
  })
  return NextResponse.json({ projects })
}
