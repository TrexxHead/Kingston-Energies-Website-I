import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  const url = new URL(request.url)
  const archived = url.searchParams.get('archived') === '1'

  const rows = await prisma.notification.findMany({
    where: { userId: session.user.id, archived },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  const unread = await prisma.notification.count({ where: { userId: session.user.id, archived: false, read: false } })

  return NextResponse.json({
    unread,
    notifications: rows.map((n) => ({
      id: n.id,
      category: n.category,
      title: n.title,
      body: n.body,
      href: n.href,
      read: n.read,
      archived: n.archived,
      at: n.createdAt.toISOString(),
    })),
  })
}

// Bulk actions: mark all read.
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  if (body?.action === 'read-all') {
    await prisma.notification.updateMany({ where: { userId: session.user.id, read: false }, data: { read: true } })
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
