import type { BankRule } from '@prisma/client'

/**
 * Applying rules to statement lines.
 *
 * A rule is a saved decision: "anything from FLOW is a utility". It saves
 * making the same call forty times a month.
 *
 * What it deliberately does not do by default is post. Auto-posting is opt-in
 * per rule, because a rule that quietly books a payment to the wrong account
 * produces a clean-looking set of books that are wrong — far harder to catch
 * than a suggestion someone declined.
 */

export interface RuleMatch {
  ruleId: string
  ruleName: string
  accountId: string
  autoPost: boolean
}

/** Does this rule apply to this line? */
export function ruleMatches(rule: Pick<BankRule, 'contains' | 'direction' | 'enabled'>, line: { description: string; amount: number }): boolean {
  if (!rule.enabled) return false

  const needle = rule.contains.trim().toLowerCase()
  if (!needle) return false
  if (!line.description.toLowerCase().includes(needle)) return false

  if (rule.direction === 'IN') return line.amount > 0
  if (rule.direction === 'OUT') return line.amount < 0
  return true
}

/**
 * The rule that wins for a line.
 *
 * Lower priority number wins, and ties break on the more specific rule — the
 * longer match string — so adding a broad catch-all rule never silently
 * overrides the precise one someone wrote first.
 */
export function firstMatch(rules: BankRule[], line: { description: string; amount: number }): RuleMatch | null {
  const matching = rules
    .filter((r) => ruleMatches(r, line))
    .sort((a, b) => a.priority - b.priority || b.contains.length - a.contains.length)

  const winner = matching[0]
  if (!winner) return null
  return { ruleId: winner.id, ruleName: winner.name, accountId: winner.accountId, autoPost: winner.autoPost }
}
