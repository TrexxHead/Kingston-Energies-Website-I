import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

/** GET ?moderation=pending|approved|rejected — the driver report queue. */
export async function GET(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied
  const m = new URL(request.url).searchParams.get('moderation') ?? 'pending'
  const reports = await prisma.evCommunityReport.findMany({
    where: { moderation: m },
    include: { station: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return NextResponse.json({ reports })
}
