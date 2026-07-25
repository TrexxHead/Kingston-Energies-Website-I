import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'

const schema = z.object({
  label: z.string().max(40).optional(),
  name: z.string().min(1).max(120),
  phone: z.string().max(40).optional(),
  street: z.string().min(1).max(200),
  parish: z.string().min(1).max(60),
  isDefault: z.boolean().optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  const addresses = await prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json({ addresses })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Please fill in the address.' }, { status: 400 })
  const d = parsed.data

  // First address is default automatically; an explicit default clears the rest.
  const count = await prisma.address.count({ where: { userId: session.user.id } })
  const makeDefault = d.isDefault || count === 0
  if (makeDefault) {
    await prisma.address.updateMany({ where: { userId: session.user.id }, data: { isDefault: false } })
  }

  const address = await prisma.address.create({
    data: {
      userId: session.user.id,
      label: d.label ?? null,
      name: d.name,
      phone: d.phone ?? null,
      street: d.street,
      parish: d.parish,
      isDefault: makeDefault,
    },
  })
  return NextResponse.json({ address }, { status: 201 })
}
