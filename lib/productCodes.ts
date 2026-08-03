import { prisma } from '@/lib/prisma'

const CATEGORY_CODE: Record<string, string> = {
  POWERBANKS: 'PB',
  CHARGERS: 'CH',
  COMPONENTS: 'CM',
  STATIONS: 'ST',
  ACCESSORIES: 'AC',
}

/**
 * A stable, human-readable SKU for a product that wasn't given one —
 * KE-<category code>-<sequence>, matching the pattern already used for
 * hand-entered SKUs (e.g. KE-PB-MIA, KE-CH-LTG). Loops on collision rather
 * than trusting a single count query, since two products can be created in
 * the same category back to back.
 */
export async function generateSku(category: string | null | undefined): Promise<string> {
  const code = (category && CATEGORY_CODE[category]) || 'XX'
  const prefix = `KE-${code}-`
  const existing = await prisma.product.count({ where: { sku: { startsWith: prefix } } })
  let n = existing + 1
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = `${prefix}${String(n).padStart(3, '0')}`
    const clash = await prisma.product.findUnique({ where: { sku: candidate }, select: { id: true } })
    if (!clash) return candidate
    n++
  }
  // Astronomically unlikely fallback: timestamp suffix guarantees uniqueness.
  return `${prefix}${Date.now().toString().slice(-6)}`
}

function ean13CheckDigit(digits12: string): number {
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += Number(digits12[i]) * (i % 2 === 0 ? 1 : 3)
  }
  return (10 - (sum % 10)) % 10
}

/** A valid-format EAN-13 barcode, generated until it doesn't collide with an existing one. */
export async function generateBarcode(): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const body = '890' + String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')
    const candidate = body + String(ean13CheckDigit(body))
    const clash = await prisma.product.findFirst({ where: { barcode: candidate }, select: { id: true } })
    if (!clash) return candidate
  }
  const body = '890' + Date.now().toString().slice(-9)
  return body + String(ean13CheckDigit(body))
}
