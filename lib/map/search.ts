/**
 * Place search for the Kingston Energies map — runs in the browser over the
 * self-hosted index (public/maps/data/jamaica-search-*.json): localities,
 * neighbourhoods, streets, points of interest, peaks and bays.
 */

export type SearchKind = 'charger' | 'city' | 'town' | 'village' | 'hamlet' | 'neighbourhood' | 'street' | 'peak' | 'bay' | 'waterfall' | `poi:${string}`

/** Compact row: [name, kind, lng, lat, parishIndex, category?] */
export type SearchRow = [string, string, number, number, number, string?]

export interface SearchIndex {
  v: number
  parishes: string[]
  rows: SearchRow[]
}

export interface SearchHit {
  id: string
  name: string
  kind: string
  lng: number
  lat: number
  parish: string | null
  category: string | null
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\bst\.?\s/g, 'saint ')
    .replace(/\bmt\.?\s/g, 'mount ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Bigger places win ties; streets and small POIs rank lower. */
const KIND_WEIGHT: Record<string, number> = {
  charger: 40,
  city: 30,
  town: 24,
  village: 16,
  neighbourhood: 14,
  'poi:airport': 22,
  peak: 12,
  bay: 10,
  hamlet: 9,
  street: 8,
  waterfall: 10,
}
const kindWeight = (k: string) => KIND_WEIGHT[k] ?? (k.startsWith('poi:') ? 6 : 4)

/** Zoom to fly to for a result of this kind. */
export function zoomForKind(kind: string): number {
  if (kind === 'city') return 12
  if (kind === 'town') return 13.2
  if (kind === 'village' || kind === 'peak' || kind === 'bay') return 14
  if (kind === 'hamlet' || kind === 'neighbourhood') return 15
  if (kind === 'street') return 16
  return 16.8
}

export interface PreparedRow {
  row: SearchRow
  norm: string
  words: string[]
}

export function prepare(index: SearchIndex): PreparedRow[] {
  return index.rows.map((row) => {
    const norm = normalize(row[0])
    return { row, norm, words: norm.split(' ') }
  })
}

/**
 * Score: every query word must prefix a word in the name (or the category);
 * whole-name prefix and exact matches score higher, then kind weight.
 */
export function search(prepared: PreparedRow[], index: SearchIndex, query: string, extra: SearchHit[] = [], limit = 8): SearchHit[] {
  const q = normalize(query)
  if (!q) return []
  const qWords = q.split(' ')
  const scored: { score: number; hit: SearchHit }[] = []

  const scoreName = (norm: string, words: string[], category: string): number => {
    let score = 0
    for (const w of qWords) {
      if (words.some((x) => x.startsWith(w))) score += 10
      else if (category && normalize(category).split(' ').some((x) => x.startsWith(w))) score += 4
      else return -1
    }
    if (norm === q) score += 40
    else if (norm.startsWith(q)) score += 20
    return score
  }

  for (const h of extra) {
    const n = normalize(h.name)
    const s = scoreName(n, n.split(' '), h.category ?? '')
    if (s >= 0) scored.push({ score: s + kindWeight(h.kind), hit: h })
  }
  prepared.forEach(({ row, norm, words }, i) => {
    const s = scoreName(norm, words, row[5] ?? '')
    if (s < 0) return
    scored.push({
      score: s + kindWeight(row[1]) - norm.length / 40,
      hit: { id: `r${i}`, name: row[0], kind: row[1], lng: row[2], lat: row[3], parish: index.parishes[row[4]] ?? null, category: row[5] ?? null },
    })
  })
  scored.sort((a, b) => b.score - a.score)

  // Same name + kind in the same parish (e.g. a long street) shows once.
  const seen = new Set<string>()
  const out: SearchHit[] = []
  for (const { hit } of scored) {
    const key = `${normalize(hit.name)}|${hit.kind}|${hit.parish}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(hit)
    if (out.length >= limit) break
  }
  return out
}
