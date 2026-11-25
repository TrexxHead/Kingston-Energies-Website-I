import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'
import { customerProject } from '@/lib/solarProjects.server'

const body = z.object({ action: z.enum(['accept', 'decline']) })

/** POST — the customer accepts or declines the quote that was sent to them. */
export async function POST(request: Request, { params }: { params: Promise<{ projectNo: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  const { projectNo } = await params
  const parsed = body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Bad request.' }, { status: 400 })
  const p = await customerProject({ id: session.user.id, email: session.user.email }, projectNo)
  if (!p) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  if (p.quoteStatus !== 'sent') return NextResponse.json({ error: 'There’s no quote waiting for a decision.' }, { status: 409 })
  const accept = parsed.data.action === 'accept'
  await prisma.solarProject.update({
    where: { id: p.id },
    data: {
      quoteStatus: accept ? 'accepted' : 'declined',
      ...(accept ? { quoteAcceptedAt: new Date(), stage: 'quote_accepted' } : {}),
      events: { create: { stage: accept ? 'quote_accepted' : null, note: accept ? 'Quote accepted by the customer.' : 'Quote declined by the customer.', createdBy: 'customer' } },
    },
  })
  return NextResponse.json({ ok: true })
}
