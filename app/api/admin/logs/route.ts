import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin, requireAdmin, unauthorized, AdminAuthError } from '@/lib/requireAdmin'

/**
 * Settings → Logs: changelog + admin activity trail (ActivityLog) and
 * server/client error & health signals (ClientLog), one endpoint, switched
 * by `kind` so the page can show either table without two round trips wired
 * up separately.
 */
export async function GET(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const url = new URL(request.url)
  const kind = url.searchParams.get('kind') === 'client' ? 'client' : 'activity'
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 50))
  const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0)

  if (kind === 'client') {
    const level = url.searchParams.get('level')
    const source = url.searchParams.get('source')
    const where = {
      ...(level && ['INFO', 'WARN', 'ERROR'].includes(level) ? { level: level as 'INFO' | 'WARN' | 'ERROR' } : {}),
      ...(source && ['SERVER', 'CLIENT'].includes(source) ? { source: source as 'SERVER' | 'CLIENT' } : {}),
    }
    const [rows, total] = await Promise.all([
      prisma.clientLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: pageSize, skip: offset }),
      prisma.clientLog.count({ where }),
    ])
    return NextResponse.json({
      total,
      entries: rows.map((r) => ({
        id: r.id,
        level: r.level,
        source: r.source,
        message: r.message,
        stack: r.stack,
        path: r.path,
        userAgent: r.userAgent,
        createdAt: r.createdAt.toISOString(),
      })),
    })
  }

  const type = url.searchParams.get('type')
  const where = type && ['DEPLOY', 'ADMIN_ACTION', 'NOTE'].includes(type) ? { type: type as 'DEPLOY' | 'ADMIN_ACTION' | 'NOTE' } : {}
  const [rows, total] = await Promise.all([
    prisma.activityLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: pageSize, skip: offset }),
    prisma.activityLog.count({ where }),
  ])
  return NextResponse.json({
    total,
    entries: rows.map((r) => ({
      id: r.id,
      type: r.type,
      label: r.label,
      detail: r.detail,
      entity: r.entity,
      entityId: r.entityId,
      actorEmail: r.actorEmail,
      createdAt: r.createdAt.toISOString(),
    })),
  })
}

const noteSchema = z.object({
  label: z.string().min(1).max(200),
  detail: z.string().max(2000).optional(),
})

/** A manual changelog entry — "fixed X", "shipped Y" — typed in by an admin. */
export async function POST(request: Request) {
  let session
  try {
    session = await requireAdmin()
  } catch (e) {
    if (e instanceof AdminAuthError) return unauthorized()
    throw e
  }

  const parsed = noteSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid entry' }, { status: 400 })

  const entry = await prisma.activityLog.create({
    data: {
      type: 'NOTE',
      label: parsed.data.label,
      detail: parsed.data.detail ?? null,
      actorEmail: session.user?.email ?? null,
    },
  })

  return NextResponse.json({ id: entry.id }, { status: 201 })
}
