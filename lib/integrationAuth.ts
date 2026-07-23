import { NextResponse } from 'next/server'

/**
 * Shared-secret auth for the /api/integrations/* endpoints that n8n calls on
 * behalf of the WhatsApp / Instagram bots.
 *
 * Set INTEGRATION_API_KEY (a long random string) in the environment, then have
 * n8n send it on every request as either:
 *   Authorization: Bearer <key>
 *   x-api-key: <key>
 *
 * If the env var is unset, every integration route returns 503 — the feature is
 * simply "off" until you configure it, and never open to the public.
 */
export function guardIntegration(request: Request): NextResponse | null {
  const expected = process.env.INTEGRATION_API_KEY
  if (!expected) {
    return NextResponse.json(
      { error: 'Integration API is not configured (set INTEGRATION_API_KEY).' },
      { status: 503 },
    )
  }

  const auth = request.headers.get('authorization') ?? ''
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''
  const provided = bearer || request.headers.get('x-api-key') || ''

  if (!provided || !timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

/** Constant-time string comparison to avoid leaking the key via timing. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}
