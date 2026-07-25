import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'

const schema = z.object({ read: z.boolean().optional(), archived: z.boolean().optional() })

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  const { id } = await params
  const parsed = schema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid update' }, { status: 400 })

  // Scope the update to the caller's own notifications.
  const result = await prisma.notification.updateMany({
    where: { id, userId: session.user.id },
    data: {
      ...(parsed.data.read !== undefined ? { read: parsed.data.read } : {}),
      ...(parsed.data.archived !== undefined ? { archived: parsed.data.archived } : {}),
    },
  })
  if (result.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
