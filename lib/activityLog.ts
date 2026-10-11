import { prisma } from '@/lib/prisma'

export interface LogActivityInput {
  label: string
  detail?: string | null
  entity?: string | null
  entityId?: string | null
  actorEmail?: string | null
}

/**
 * Append a row to the admin activity trail shown on Settings → Logs.
 * Fire-and-forget: a logging failure must never break the action it's
 * describing, so this only ever console.errors, never throws.
 */
export function logActivity(input: LogActivityInput): void {
  void prisma.activityLog
    .create({
      data: {
        type: 'ADMIN_ACTION',
        label: input.label,
        detail: input.detail ?? null,
        entity: input.entity ?? null,
        entityId: input.entityId ?? null,
        actorEmail: input.actorEmail ?? null,
      },
    })
    .catch((err) => console.error('[activity-log] failed to write entry:', err))
}
