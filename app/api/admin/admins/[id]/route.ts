import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { guardSuperAdmin } from '@/lib/requireAdmin'

/** Revoke an admin's access (demotes them back to a regular customer account). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardSuperAdmin()
  if (denied) return denied

  const session = await getServerSession(authOptions)
  const { id } = await params

  if (id === session?.user?.id) {
    return NextResponse.json({ error: "You can't remove your own admin access." }, { status: 400 })
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } })
  if (!target || target.role === 'USER') return NextResponse.json({ error: 'Admin not found' }, { status: 404 })

  if (target.role === 'SUPER_ADMIN') {
    const superAdminCount = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } })
    if (superAdminCount <= 1) {
      return NextResponse.json({ error: 'At least one super admin must remain.' }, { status: 400 })
    }
  }

  await prisma.user.update({ where: { id }, data: { role: 'USER' } })
  return NextResponse.json({ ok: true })
}
