/**
 * Fixed-window rate limiter keyed by an arbitrary string (e.g. IP).
 *
 * Backed by Upstash Redis when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
 * are set — a shared store, so the limit is enforced across every concurrent
 * serverless instance rather than per-instance. Without those env vars (the
 * default, e.g. local dev or before Upstash is provisioned), falls back to the
 * original in-memory map: correct for a single instance, and the only mode
 * this app has ever run in production so far. No call site needs to know
 * which mode is active — same function, same signature, same behavior when
 * traffic fits on one instance.
 */
import { Redis } from '@upstash/redis'

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

function inMemoryRateLimit(key: string, max: number, windowMs: number): RateLimitResult {
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

let redis: Redis | null | undefined // undefined = not checked yet, null = not configured
function getRedis(): Redis | null {
  if (redis !== undefined) return redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  redis = url && token ? new Redis({ url, token }) : null
  return redis
}

async function redisRateLimit(client: Redis, key: string, max: number, windowMs: number): Promise<RateLimitResult> {
  // Bucket the key by time window so it self-expires without a separate reset step.
  const windowKey = `rl:${key}:${Math.floor(Date.now() / windowMs)}`
  const count = await client.incr(windowKey)
  if (count === 1) {
    await client.pexpire(windowKey, windowMs)
  }
  if (count > max) {
    const ttl = await client.pttl(windowKey)
    return { ok: false, retryAfter: Math.max(1, Math.ceil((ttl > 0 ? ttl : windowMs) / 1000)) }
  }
  return { ok: true, retryAfter: 0 }
}

export async function rateLimit(
  key: string,
  max: number = DEFAULT_MAX,
  windowMs: number = DEFAULT_WINDOW_MS
): Promise<RateLimitResult> {
  const client = getRedis()
  if (!client) return inMemoryRateLimit(key, max, windowMs)

  try {
    return await redisRateLimit(client, key, max, windowMs)
  } catch (err) {
    // Upstash hiccup shouldn't take down checkout/signup/etc — degrade to the
    // in-memory limiter for this request rather than failing it outright.
    console.error('[rateLimit] Upstash request failed, falling back to in-memory for this call:', err)
    return inMemoryRateLimit(key, max, windowMs)
  }
}
