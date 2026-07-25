'use client'

// Client-side "recently viewed" store (localStorage). We keep a small snapshot
// of each product so the hub can render it without another round-trip.

export interface RecentItem {
  id: string
  name: string
  spec: string
  price: number
  image: string | null
  cat: string
  at: number
}

const KEY = 'ke-recently-viewed'
const MAX = 8

export function recordView(item: Omit<RecentItem, 'at'>): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(KEY)
    const list: RecentItem[] = raw ? JSON.parse(raw) : []
    const next = [{ ...item, at: Date.now() }, ...list.filter((r) => r.id !== item.id)].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // ignore quota / parse errors
  }
}

export function getRecentlyViewed(): RecentItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as RecentItem[]) : []
  } catch {
    return []
  }
}
