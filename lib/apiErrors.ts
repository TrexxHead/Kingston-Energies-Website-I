import { NextResponse } from 'next/server'

/**
 * A calm, specific answer for "this endpoint's tables don't exist on this
 * database yet" — the state every route touching a newly added model was in
 * right after this session's schema changes shipped to a database that
 * hadn't been migrated. 503 (temporarily unavailable) rather than 500: it's
 * not broken, it's pending a deploy step, and it resolves itself the moment
 * `prisma db push` runs — no code change needed once that happens.
 */
export function migrationPendingResponse() {
  return NextResponse.json(
    {
      error: 'This feature needs a database migration that hasn’t run yet on this environment. Run `npx prisma db push` against it, then reload.',
      migrationPending: true,
    },
    { status: 503 },
  )
}
