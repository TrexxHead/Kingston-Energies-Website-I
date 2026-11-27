import { describe, it, expect } from 'vitest'
import { stationSlug, idFromSlug } from '@/lib/map/stationSlug'
import { nearbyFrom } from '@/lib/map/nearby.server'
import type { SearchIndex } from '@/lib/map/search'

describe('station slugs', () => {
  const id = 'cmv7lgdwn002fxhmpvtvjgsk8'
  it('is readable and round-trips to the id', () => {
    const slug = stationSlug({ id, name: 'Evergo · Bayshore Plaza, Port Antonio' })
    expect(slug).toBe(`evergo-bayshore-plaza-port-antonio-${id}`)
    expect(idFromSlug(slug)).toBe(id)
  })
  it('strips accents and survives a name of symbols', () => {
    expect(stationSlug({ id, name: 'Café Négril' })).toBe(`cafe-negril-${id}`)
    expect(stationSlug({ id, name: '···' })).toBe(id)
    expect(idFromSlug(id)).toBe(id)
  })
  it('rejects slugs without a plausible id', () => {
    expect(idFromSlug('some-name')).toBeNull()
    expect(idFromSlug('')).toBeNull()
  })
})

describe('nearby places', () => {
  const at = { lat: 18.0, lng: -76.8 }
  const index = {
    v: 1,
    parishes: [],
    attribution: '',
    rows: [
      ['Far Diner', 'poi:food', -76.8, 18.01, 9, 'restaurant'], // ~1.1 km
      ['Patty Shop', 'poi:food', -76.8, 18.002, 9, 'fast_food'], // ~220 m
      ['Bank', 'poi:bank', -76.801, 18.0, 9], // ~105 m
      ['Church', 'poi:worship', -76.8, 18.0005, 9], // kind not listed
      ['Some Street', 'street', -76.8, 18.0, 12],
      ['Patty Shop', 'poi:food', -76.8003, 18.0021, 9], // duplicate name
    ],
  } as unknown as SearchIndex
  it('keeps listed kinds within walking distance, nearest first, one per name', () => {
    const r = nearbyFrom(index, at)
    expect(r.map((p) => p.name)).toEqual(['Bank', 'Patty Shop'])
    expect(r[0].metres).toBeGreaterThan(95)
    expect(r[0].metres).toBeLessThan(115)
    expect(r[1].category).toBe('fast_food')
  })
})
