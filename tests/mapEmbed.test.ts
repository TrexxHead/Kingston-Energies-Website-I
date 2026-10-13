import { describe, it, expect } from 'vitest'
import { embedSearchUrl, embedPlaceUrl } from '@/lib/map/embed'

describe('Maps Embed URLs', () => {
  it('island-wide search is framed on Jamaica', () => {
    const u = new URL(embedSearchUrl('k'))
    expect(u.origin + u.pathname).toBe('https://www.google.com/maps/embed/v1/search')
    expect(u.searchParams.get('q')).toBe('EV charging station in Jamaica')
    expect(u.searchParams.get('center')).toBe('18.11,-77.3')
    expect(u.searchParams.get('region')).toBe('JM')
  })
  it('parish search names the parish', () => {
    expect(new URL(embedSearchUrl('k', 'st-james')).searchParams.get('q')).toBe('EV charging station in St. James, Jamaica')
  })
  it('place uses the Place ID when known, else coordinates', () => {
    expect(new URL(embedPlaceUrl('k', { lat: 18, lng: -76.8, googlePlaceId: 'abc' })).searchParams.get('q')).toBe('place_id:abc')
    expect(new URL(embedPlaceUrl('k', { lat: 18, lng: -76.8 })).searchParams.get('q')).toBe('18,-76.8')
  })
})

describe('key hygiene', async () => {
  const { cleanKey, keyFingerprint } = await import('@/lib/map/embed')
  it('strips spaces, newlines and pasted quotes', () => {
    expect(cleanKey('  "AIzaTEST123"\n')).toBe('AIzaTEST123')
    expect(cleanKey("'abc'")).toBe('abc')
    expect(cleanKey(undefined)).toBe('')
  })
  it('fingerprints without revealing the whole key', () => {
    expect(keyFingerprint('AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ0123456')).toBe('AIzaSy…3456 (39 characters)')
    expect(keyFingerprint('')).toBe('none')
  })
})
