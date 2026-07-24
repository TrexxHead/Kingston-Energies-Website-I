// Lightweight fuzzy search utilities for the storefront — typo tolerant, no
// dependencies. Scores are higher for better matches; 0 means no match.

/** Levenshtein edit distance (bounded small strings). */
export function editDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  let curr = new Array<number>(n + 1)
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}

/**
 * Score how well `query` matches `text`. Handles exact, prefix, substring,
 * word-boundary and single/double typo matches.
 */
export function fuzzyScore(query: string, text: string): number {
  const q = query.trim().toLowerCase()
  const t = text.toLowerCase()
  if (!q) return 0
  if (t === q) return 100
  if (t.startsWith(q)) return 90
  const idx = t.indexOf(q)
  if (idx === 0) return 88
  if (idx > 0) return t[idx - 1] === ' ' ? 80 : 70 // word-boundary vs mid-word

  // Token-level: every query word appears in some text word (prefix or close).
  const qWords = q.split(/\s+/).filter(Boolean)
  const tWords = t.split(/\s+/).filter(Boolean)
  let tokenHits = 0
  for (const qw of qWords) {
    let best = 0
    for (const tw of tWords) {
      if (tw.startsWith(qw)) { best = Math.max(best, 60); continue }
      if (tw.includes(qw)) { best = Math.max(best, 50); continue }
      if (qw.length >= 4) {
        const d = editDistance(qw, tw)
        if (d <= (qw.length >= 7 ? 2 : 1)) best = Math.max(best, 45 - d * 5)
      }
    }
    if (best > 0) tokenHits += best
  }
  if (tokenHits > 0) return Math.min(65, tokenHits / qWords.length)

  // Whole-string typo tolerance for short queries.
  if (q.length >= 4) {
    const d = editDistance(q, t.slice(0, q.length + 2))
    if (d <= (q.length >= 7 ? 2 : 1)) return 40 - d * 5
  }
  return 0
}
