import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Admin file storage, backed by a PRIVATE Supabase Storage bucket.
 *
 * One-time setup (see DEPLOY.md):
 *   1. Supabase dashboard → Storage → New bucket → name "admin-files", keep it
 *      PRIVATE (public toggle OFF).
 *   2. Add two env vars in Vercel (and .env.local for dev):
 *        SUPABASE_URL                — https://<project-ref>.supabase.co
 *        SUPABASE_SERVICE_ROLE_KEY   — Settings → API → service_role secret
 *
 * Files are never public: downloads go through short-lived SIGNED urls that are
 * only ever minted inside admin-guarded API routes. If the env vars are absent
 * the whole feature degrades gracefully — link-based documents keep working and
 * upload attempts return a clear "storage not configured" error.
 */

export const ADMIN_BUCKET = 'admin-files'

// Accept either the server-only var or the public one Supabase projects use.
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

export function isStorageConfigured(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_ROLE_KEY)
}

let client: SupabaseClient | null = null
function storage(): SupabaseClient {
  if (!isStorageConfigured()) {
    throw new StorageNotConfiguredError()
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return client
}

export class StorageNotConfiguredError extends Error {
  constructor() {
    super('File storage is not configured')
    this.name = 'StorageNotConfiguredError'
  }
}

/** Strip a filename down to something safe for a storage key. */
export function safeName(name: string): string {
  const dot = name.lastIndexOf('.')
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : ''
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'file'
  return ext ? `${base}.${ext}` : base
}

/** Build a collision-resistant storage path within a folder. */
export function buildPath(folder: string, filename: string): string {
  const stamp = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  return `${folder}/${stamp}-${rand}-${safeName(filename)}`
}

/** Upload bytes to the admin bucket. Returns the stored path. */
export async function uploadAdminFile(
  path: string,
  body: ArrayBuffer | Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  const { error } = await storage()
    .storage.from(ADMIN_BUCKET)
    .upload(path, body, { contentType, upsert: false })
  if (error) throw new Error(`Upload failed: ${error.message}`)
  return path
}

/**
 * Mint a short-lived signed download URL for a stored file. Returns null if the
 * path is empty or storage is unavailable — callers should treat null as
 * "no downloadable file" rather than an error.
 */
export async function signedUrl(path: string | null | undefined, expiresIn = 3600): Promise<string | null> {
  if (!path || !isStorageConfigured()) return null
  try {
    const { data, error } = await storage()
      .storage.from(ADMIN_BUCKET)
      .createSignedUrl(path, expiresIn)
    if (error) return null
    return data?.signedUrl ?? null
  } catch {
    return null
  }
}

/** Best-effort delete of a stored file (used when its DB row is removed). */
export async function deleteAdminFile(path: string | null | undefined): Promise<void> {
  if (!path || !isStorageConfigured()) return
  try {
    await storage().storage.from(ADMIN_BUCKET).remove([path])
  } catch {
    // A dangling storage object is harmless — never block the DB delete on it.
  }
}
