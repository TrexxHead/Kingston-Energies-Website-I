/**
 * Minimal in-memory, fixed-window rate limiter keyed by an arbitrary string (e.g. IP).
 *
 * NOTE: state lives in this process only. It protects a single Next.js instance and
 * resets on restart. For multi-instance / serverless production, swap this for a shared
 * store (Upstash Redis, Vercel KV, etc.) — the call sites can stay the same.
 */

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

const DEFAULT_WINDOW_MS = 60_000
const DEFAULT_MAX = 15

export interface RateLimitResult {
  ok: boolean
  /** Seconds until the window resets (only meaningful when ok === false). */
  retryAfter: number
}

/** Best-effort client IP from proxy headers (falls back to a shared bucket). */
export function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'anon'
}

export function rateLimit(
  key: string,
  max: number = DEFAULT_MAX,
  windowMs: number = DEFAULT_WINDOW_MS
): RateLimitResult {
  const now = Date.now()

  // Opportunistic cleanup so the map can't grow unbounded.
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) {
      if (now > b.resetAt) buckets.delete(k)
    }
  }

  const bucket = buckets.get(key)
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfter: 0 }
  }

  if (bucket.count >= max) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }
  }

  bucket.count += 1
  return { ok: true, retryAfter: 0 }
}
