import { prisma } from '@/lib/prisma'

/**
 * Personal referral codes in the form KEG-<YY>-<NAME>, combining the business
 * (Kingston Energy Group), the member's join year, and a slug from their name —
 * e.g. "Joseph Fearon" who joined in 2024 → "KEG-24-JFEARON".
 */

const BRAND = 'KEG'

/** Build a name slug: leading initials + surname, uppercase alphanumerics. */
function nameSlug(name: string): string {
  const words = name
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return ''
  if (words.length === 1) return words[0].slice(0, 10)
  const initials = words.slice(0, -1).map((w) => w[0]).join('')
  return (initials + words[words.length - 1]).slice(0, 12)
}

export function buildReferralCode(name: string | null, email: string, createdAt: Date): string {
  const yy = String(createdAt.getFullYear()).slice(-2)
  let slug = name ? nameSlug(name) : ''
  if (!slug) slug = (email.split('@')[0].toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)) || 'MEMBER'
  return `${BRAND}-${yy}-${slug}`
}

/**
 * Return the user's referral code, generating and saving one the first time.
 * Guarantees uniqueness by appending a counter on the rare collision.
 */
export async function ensureReferralCode(userId: string): Promise<string | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, name: true, email: true, createdAt: true },
    })
    if (!user) return null
    if (user.referralCode) return user.referralCode

    const base = buildReferralCode(user.name, user.email, user.createdAt)
    let code = base
    let n = 1
    // Extremely unlikely to loop, but stay safe against duplicate slugs.
    while (await prisma.user.findFirst({ where: { referralCode: code }, select: { id: true } })) {
      code = `${base}${n++}`
    }
    await prisma.user.update({ where: { id: userId }, data: { referralCode: code } })
    return code
  } catch {
    return null
  }
}
