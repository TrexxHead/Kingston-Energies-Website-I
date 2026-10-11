import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const MAX_MESSAGE = 2000
const MAX_STACK = 4000

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '…' : s
}

const schema = z.object({
  level: z.enum(['INFO', 'WARN', 'ERROR']).default('ERROR'),
  message: z.string().min(1).max(MAX_MESSAGE),
  stack: z.string().max(MAX_STACK).optional(),
  path: z.string().max(300).optional(),
})

/**
 * Browser-side telemetry beacon — unhandled JS errors and promise rejections
 * from components/ClientLogger.tsx, surfaced on Settings → Logs. No auth: it
 * has to work for a visitor who isn't signed in at all (most of the site).
 * Kept safe by payload caps (zod .max above) and never trusting the caller
 * for anything beyond a short message/stack/path — nothing here can read or
 * write any other data.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid entry' }, { status: 400 })

  const { level, message, stack, path } = parsed.data
  const userAgent = request.headers.get('user-agent')?.slice(0, 300) ?? null

  await prisma.clientLog
    .create({
      data: {
        level,
        source: 'CLIENT',
        message: truncate(message, MAX_MESSAGE),
        stack: stack ? truncate(stack, MAX_STACK) : null,
        path: path ?? null,
        userAgent,
      },
    })
    .catch((err) => console.error('[client-log] failed to write client entry:', err))

  // A beacon never needs a meaningful response — it just has to not error.
  return new NextResponse(null, { status: 204 })
}
