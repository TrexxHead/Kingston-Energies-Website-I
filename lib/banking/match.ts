/**
 * Suggesting matches between bank statement lines and journal lines.
 *
 * These are suggestions, never automatic postings. A confident-looking match on
 * the wrong transaction is the kind of error that survives audit precisely
 * because it looks tidy, so every suggestion carries its score and the reason
 * for it, and a human confirms.
 */

export interface BookLine {
  id: string
  entryId: string
  date: Date
  memo: string | null
  entryMemo: string | null
  /** Signed against the bank account: debit is money in. */
  amount: number
}

export interface StatementLine {
  id: string
  postedAt: Date
  description: string
  amount: number
}

export interface Suggestion {
  journalLineId: string
  score: number
  reasons: string[]
}

const DAY = 86_400_000

/** Shared significant words, ignoring the noise every bank memo is full of. */
const STOP = new Set(['the', 'and', 'for', 'ltd', 'limited', 'payment', 'transfer', 'pos', 'purchase', 'debit', 'credit', 'card', 'transaction', 'jmd', 'ja'])

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  )
}

function textOverlap(a: string, b: string): number {
  const ta = tokens(a)
  const tb = tokens(b)
  if (ta.size === 0 || tb.size === 0) return 0
  let shared = 0
  for (const t of ta) if (tb.has(t)) shared++
  return shared / Math.min(ta.size, tb.size)
}

/**
 * Score one candidate. The amount must agree — a different amount is a
 * different transaction, so no amount of description similarity rescues it.
 */
export function scoreMatch(stmt: StatementLine, book: BookLine): Suggestion | null {
  if (Math.abs(stmt.amount - book.amount) > 0.01) return null

  const days = Math.abs(stmt.postedAt.getTime() - book.date.getTime()) / DAY
  // Beyond a fortnight, an identical amount is more likely coincidence than a
  // late-clearing payment.
  if (days > 14) return null

  const reasons = [`Amount matches exactly (${stmt.amount.toFixed(2)})`]
  let score = 0.6

  if (days < 1) {
    score += 0.25
    reasons.push('Same day')
  } else if (days <= 3) {
    score += 0.15
    reasons.push(`${Math.round(days)} day${Math.round(days) === 1 ? '' : 's'} apart`)
  } else {
    score += 0.05
    reasons.push(`${Math.round(days)} days apart`)
  }

  const overlap = textOverlap(stmt.description, `${book.memo ?? ''} ${book.entryMemo ?? ''}`)
  if (overlap >= 0.5) {
    score += 0.15
    reasons.push('Description matches the memo')
  } else if (overlap > 0) {
    score += 0.05
    reasons.push('Description partly matches the memo')
  }

  return { journalLineId: book.id, score: Math.min(1, Math.round(score * 100) / 100), reasons }
}

/**
 * Best candidates for one statement line, strongest first.
 *
 * When two candidates score the same the match is genuinely ambiguous — both
 * are returned rather than picking one, so the screen can say so.
 */
export function suggestMatches(stmt: StatementLine, books: BookLine[], limit = 3): Suggestion[] {
  return books
    .map((b) => scoreMatch(stmt, b))
    .filter((s): s is Suggestion => s !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/** A suggestion is only worth surfacing as "confident" above this. */
export const CONFIDENT = 0.85
