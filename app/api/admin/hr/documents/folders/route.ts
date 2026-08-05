import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

const createSchema = z.object({
  name: z.string().min(1).max(120),
  parentId: z.string().optional().or(z.literal('')),
  sharedWith: z.array(z.string()).max(50).optional(),
})

export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Give the folder a name.' }, { status: 400 })
  const { name, parentId, sharedWith } = parsed.data

  const folder = await prisma.hrFolder.create({
    data: {
      name,
      parentId: parentId || null,
      ...(sharedWith && sharedWith.length ? { sharedWith: { connect: sharedWith.map((id) => ({ id })) } } : {}),
    },
  })

  return NextResponse.json({ id: folder.id }, { status: 201 })
}
