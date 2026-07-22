import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'

const updateSchema = z.object({
  name: z.string().min(1).max(120),
  username: z
    .string()
    .trim()
    .max(30)
    .regex(/^[a-zA-Z0-9._-]*$/, 'Username can only use letters, numbers, and . _ -')
    .optional(),
  email: z.string().email(),
  primaryNeed: z.enum(['EVERYDAY', 'BACKUP', 'OFFGRID', 'BUSINESS']).nullish(),
})

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid profile details' }, { status: 400 })
  }

  const { name, email, primaryNeed } = parsed.data
  // Empty string clears the username; otherwise use the trimmed value.
  const username = parsed.data.username !== undefined ? parsed.data.username.trim() || null : undefined

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing && existing.id !== session.user.id) {
    return NextResponse.json({ error: 'That email is already in use' }, { status: 409 })
  }

  if (username) {
    if (username.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 })
    }
    const usernameOwner = await prisma.user.findUnique({ where: { username } })
    if (usernameOwner && usernameOwner.id !== session.user.id) {
      return NextResponse.json({ error: 'That username is already taken' }, { status: 409 })
    }
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      email,
      ...(username !== undefined ? { username } : {}),
      ...(primaryNeed !== undefined ? { primaryNeed } : {}),
    },
  })

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    username: updated.username,
    email: updated.email,
    primaryNeed: updated.primaryNeed,
  })
}
