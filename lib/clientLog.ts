import { prisma } from '@/lib/prisma'

const MAX_MESSAGE = 2000
const MAX_STACK = 4000

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '…' : s
}

/**
 * Persist a server-side error to Settings → Logs, alongside whatever
 * console.error already happened at the call site. Fire-and-forget — never
 * lets a logging failure mask or replace the original error.
 */
export function logServerError(error: unknown, context?: { path?: string }): void {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined

  void prisma.clientLog
    .create({
      data: {
        level: 'ERROR',
        source: 'SERVER',
        message: truncate(message, MAX_MESSAGE),
        stack: stack ? truncate(stack, MAX_STACK) : null,
        path: context?.path ?? null,
      },
    })
    .catch((err) => console.error('[client-log] failed to write server error entry:', err))
}
