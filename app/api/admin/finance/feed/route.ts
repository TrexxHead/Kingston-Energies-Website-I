import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma, isMissingSchemaError } from '@/lib/prisma'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { businessFeed, type FeedCategory, type FeedPriority } from '@/lib/businessFeed'
import { migrationPendingResponse } from '@/lib/apiErrors'

/**
 * The feed, with each person's decisions applied over it.
 *
 * The events are derived fresh every time from the underlying records, so the
 * feed can't go stale; the pinned/snoozed/resolved state is looked up and
 * layered on top.
 */
export async function GET(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const url = new URL(request.url)
  const category = url.searchParams.get('category')
  const priority = url.searchParams.get('priority')
  const view = url.searchParams.get('view') ?? 'open'

  let items: Awaited<ReturnType<typeof businessFeed>>
  let states: Awaited<ReturnType<typeof prisma.feedState.findMany>>
  try {
    ;[items, states] = await Promise.all([businessFeed(120), prisma.feedState.findMany()])
  } catch (err) {
    if (isMissingSchemaError(err)) return migrationPendingResponse()
    throw err
  }
  const stateBy = new Map(states.map((s) => [s.itemId, s]))
  const now = Date.now()

  const decorated = items.map((item) => {
    const s = stateBy.get(item.id)
    return {
      ...item,
      pinned: s?.pinned ?? false,
      archived: s?.archived ?? false,
      resolved: Boolean(s?.resolvedAt),
      resolvedBy: s?.resolvedBy ?? null,
      assignedTo: s?.assignedTo ?? null,
      note: s?.note ?? null,
      snoozedUntil: s?.snoozedUntil?.toISOString() ?? null,
      snoozed: Boolean(s?.snoozedUntil && s.snoozedUntil.getTime() > now),
    }
  })

  const filtered = decorated
    .filter((i) => {
      if (view === 'open') return !i.archived && !i.resolved && !i.snoozed
      if (view === 'pinned') return i.pinned && !i.archived
      if (view === 'snoozed') return i.snoozed
      if (view === 'resolved') return i.resolved
      if (view === 'archived') return i.archived
      return true
    })
    .filter((i) => (category && category !== 'ALL' ? i.category === (category as FeedCategory) : true))
    .filter((i) => (priority && priority !== 'ALL' ? i.priority === (priority as FeedPriority) : true))
    // Pinned first, then urgency, then recency — the order someone triaging
    // would actually want.
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      const rank = { URGENT: 0, ATTENTION: 1, ROUTINE: 2 }
      if (rank[a.priority] !== rank[b.priority]) return rank[a.priority] - rank[b.priority]
      return b.at.localeCompare(a.at)
    })

  return NextResponse.json({
    items: filtered,
    counts: {
      open: decorated.filter((i) => !i.archived && !i.resolved && !i.snoozed).length,
      urgent: decorated.filter((i) => i.priority === 'URGENT' && !i.archived && !i.resolved && !i.snoozed).length,
      attention: decorated.filter((i) => i.priority === 'ATTENTION' && !i.archived && !i.resolved && !i.snoozed).length,
      pinned: decorated.filter((i) => i.pinned && !i.archived).length,
      snoozed: decorated.filter((i) => i.snoozed).length,
    },
  })
}

const schema = z.object({
  itemId: z.string().min(1).max(120),
  action: z.enum(['pin', 'unpin', 'snooze', 'unsnooze', 'archive', 'unarchive', 'resolve', 'reopen', 'assign', 'note']),
  /** For snooze: how many days to defer it. */
  days: z.number().int().min(1).max(90).optional(),
  assignedTo: z.string().max(160).optional(),
  note: z.string().max(2000).optional(),
})

/** Act on one feed item. */
export async function PATCH(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const who = session.user?.email ?? null

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { itemId, action } = parsed.data

  const changes: Record<string, unknown> = {}
  switch (action) {
    case 'pin':
      changes.pinned = true
      break
    case 'unpin':
      changes.pinned = false
      break
    case 'snooze':
      // Deferral, not dismissal: it comes back on its own.
      changes.snoozedUntil = new Date(Date.now() + (parsed.data.days ?? 7) * 86_400_000)
      break
    case 'unsnooze':
      changes.snoozedUntil = null
      break
    case 'archive':
      changes.archived = true
      break
    case 'unarchive':
      changes.archived = false
      break
    case 'resolve':
      changes.resolvedAt = new Date()
      changes.resolvedBy = who
      break
    case 'reopen':
      changes.resolvedAt = null
      changes.resolvedBy = null
      break
    case 'assign':
      changes.assignedTo = parsed.data.assignedTo || null
      break
    case 'note':
      changes.note = parsed.data.note || null
      break
  }

  await prisma.feedState.upsert({
    where: { itemId },
    create: { itemId, ...changes },
    update: changes,
  })

  return NextResponse.json({ ok: true })
}
