/**
 * Runs once per server instance start (Next.js instrumentation hook). Used
 * here to log a DEPLOY row to Settings → Logs automatically, with no manual
 * step — Vercel injects the commit SHA/message as build-time env vars, which
 * is what "version changes" on that page actually reflects.
 *
 * Deduped on the commit SHA (ActivityLog.dedupeKey is unique) so a cold start
 * of an already-logged build — several serverless instances can start for
 * the same deploy — only ever produces one row.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const sha = process.env.VERCEL_GIT_COMMIT_SHA
  if (!sha) return // local dev / non-Vercel environments have no deploy to log

  const { prisma } = await import('@/lib/prisma')
  const message = process.env.VERCEL_GIT_COMMIT_MESSAGE?.trim() || 'Deployed'
  const branch = process.env.VERCEL_GIT_COMMIT_REF

  await prisma.activityLog
    .create({
      data: {
        type: 'DEPLOY',
        label: message.split('\n')[0].slice(0, 200),
        detail: [branch ? `Branch: ${branch}` : null, `Commit: ${sha.slice(0, 7)}`].filter(Boolean).join('\n'),
        dedupeKey: sha,
      },
    })
    .catch((err: unknown) => {
      // Unique-constraint violation just means this build was already
      // logged by an earlier cold start — not an error worth reporting.
      const code = (err as { code?: string } | null)?.code
      if (code !== 'P2002') console.error('[activity-log] failed to log deploy:', err)
    })
}
