import { prisma } from '@/lib/prisma'

export interface PromoResult {
  valid: boolean
  code?: string
  type?: 'PERCENT' | 'FIXED'
  value?: number
  discount?: number // computed J$ discount for the given subtotal
  message: string
}

/**
 * Validate a promo code against a subtotal and compute the discount. Shared by
 * the storefront (cart) and the order APIs so the discount a customer sees is
 * the discount that's actually applied.
 */
export async function validatePromo(codeRaw: string, subtotal: number): Promise<PromoResult> {
  const code = codeRaw.trim().toUpperCase()
  if (!code) return { valid: false, message: 'Enter a code.' }

  let promo
  try {
    promo = await prisma.discountCode.findUnique({ where: { code } })
  } catch {
    return { valid: false, message: 'Could not check that code right now.' }
  }
  if (!promo || !promo.active) return { valid: false, message: 'That code isn’t valid.' }
  if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) return { valid: false, message: 'That code has expired.' }
  if (promo.minSpend && subtotal < promo.minSpend) {
    return { valid: false, message: `Spend at least ${fmtJ(promo.minSpend)} to use this code.` }
  }

  const discount =
    promo.type === 'PERCENT'
      ? Math.round(subtotal * (promo.value / 100))
      : Math.min(Math.round(promo.value), subtotal)

  return {
    valid: true,
    code: promo.code,
    type: promo.type,
    value: promo.value,
    discount,
    message: `${promo.code} applied — ${promo.type === 'PERCENT' ? `${promo.value}% off` : `${fmtJ(promo.value)} off`}.`,
  }
}

function fmtJ(n: number): string {
  return 'J$' + Math.round(n).toLocaleString()
}
