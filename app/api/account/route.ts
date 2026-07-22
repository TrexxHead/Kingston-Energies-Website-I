import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'

const updateSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  primaryNeed: z.enum(['EVERYDAY', 'BACKUP', 'OFFGRID', 'BUSINESS']).nullish(),
})

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid profile details' }, { status: 400 })
  }

  const { name, email, primaryNeed } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing && existing.id !== session.user.id) {
    return NextResponse.json({ error: 'That email is already in use' }, { status: 409 })
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { name, email, ...(primaryNeed !== undefined ? { primaryNeed } : {}) },
  })

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    primaryNeed: updated.primaryNeed,
  })
}
