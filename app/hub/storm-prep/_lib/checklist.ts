// Checklist *item state* (which boxes this user has checked) lives here,
// keyed to localStorage. The checklist *content* itself (item text,
// categories, timing, and the storm-kit product picks) is admin-editable —
// see lib/stormPrepDefaults.ts / lib/stormPrepContent.ts and syncContent()
// below — but always starts from the same shipped defaults so nothing
// regresses for a site nobody has customized via the admin editor yet.

export {
  DEFAULT_CHECKLIST as CHECKLIST,
  CATEGORY_LABEL,
  TIMING_LABEL,
  TIMING_ORDER,
  DEFAULT_KIT_PRODUCT_IDS as KIT_PRODUCT_IDS,
  type ChecklistCategory,
  type ChecklistTiming,
  type StormChecklistItem as ChecklistItem,
  type StormPrepContent,
} from '@/lib/stormPrepDefaults'

import { DEFAULT_STORM_PREP_CONTENT, type StormPrepContent as Content } from '@/lib/stormPrepDefaults'

export const STORAGE_KEY = 'ke-storm-checklist'
const CONTENT_CACHE_KEY = 'ke-storm-content-cache'

export function loadChecked(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return new Set(JSON.parse(raw))
  } catch { /* ignore */ }
  return new Set()
}

export function saveChecked(checked: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...checked]))
  } catch { /* ignore */ }
}

/**
 * The last-synced admin content, or the shipped defaults if this browser has
 * never successfully synced — read synchronously so the page has something
 * real to render immediately, offline included, before syncContent() has a
 * chance to run.
 */
export function loadCachedContent(): Content {
  try {
    const raw = localStorage.getItem(CONTENT_CACHE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Content>
      if (parsed.checklist?.length) return { checklist: parsed.checklist, kitProductIds: parsed.kitProductIds ?? DEFAULT_STORM_PREP_CONTENT.kitProductIds }
    }
  } catch { /* ignore */ }
  return DEFAULT_STORM_PREP_CONTENT
}

/**
 * Fetches the current admin-edited content and refreshes the local cache.
 * Best-effort — returns null (leaving whatever's cached/rendered alone)
 * rather than throwing when offline or the API is unreachable.
 */
export async function syncContent(): Promise<Content | null> {
  try {
    const res = await fetch('/api/storm-prep/content')
    if (!res.ok) return null
    const data = (await res.json()) as Content
    if (!data.checklist?.length) return null
    localStorage.setItem(CONTENT_CACHE_KEY, JSON.stringify(data))
    return data
  } catch {
    return null
  }
}
