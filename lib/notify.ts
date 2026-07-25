import { prisma } from '@/lib/prisma'
import type { NotificationCategory } from '@/lib/notifications'

export type { NotificationCategory } from '@/lib/notifications'
export { NOTIFICATION_CATEGORIES } from '@/lib/notifications'

/** Create a single notification for one customer (best-effort, never throws). */
export async function notifyUser(
  userId: string,
  category: NotificationCategory,
  title: string,
  opts: { body?: string; href?: string } = {},
): Promise<void> {
  try {
    await prisma.notification.create({
      data: { userId, category, title, body: opts.body ?? null, href: opts.href ?? null },
    })
  } catch {
    // best-effort — notifications must never break the primary action
  }
}

/**
 * Broadcast a notification to every customer (role USER). Used for
 * announcements, promotions and site-wide discount launches.
 */
export async function broadcastNotification(
  category: NotificationCategory,
  title: string,
  opts: { body?: string; href?: string } = {},
): Promise<number> {
  try {
    const users = await prisma.user.findMany({ where: { role: 'USER' }, select: { id: true } })
    if (users.length === 0) return 0
    await prisma.notification.createMany({
      data: users.map((u) => ({ userId: u.id, category, title, body: opts.body ?? null, href: opts.href ?? null })),
    })
    return users.length
  } catch {
    return 0
  }
}
