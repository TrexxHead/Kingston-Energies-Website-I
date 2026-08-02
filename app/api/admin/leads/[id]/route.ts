import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

const patchSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST']),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const parsed = patchSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  try {
    const lead = await prisma.lead.update({ where: { id }, data: { status: parsed.data.status } })
    return NextResponse.json({ lead })
  } catch {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }
}
