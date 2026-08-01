const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// The seed SKU each catalog product originally shipped with (prisma/seed.js),
// used as the primary match since it's stable even if a product has since
// been renamed in admin — which is exactly the scenario this script exists
// to repair. Catalog ids added after the initial seed (the cable/adapter
// components) have no seed SKU and fall back to name-matching below.
const SEED_SKU_BY_CATALOG_ID = {
  pb10: 'KE-PB-104',
  pbmag: 'KE-PB-MAG',
  pbug: 'KE-PB-UGR',
  pbmi: 'KE-PB-MIA',
  pbot: 'KE-PB-OTT',
  ch20: 'KE-CH-020',
  ch21: 'KE-CH-LTG',
  chcab: 'KE-CB-100',
  st300: 'KE-ST-ANK',
  solar: 'KE-SL-100',
  acst: 'KE-AC-STD',
  acpo: 'KE-AC-PCH',
}

// lib/catalog.ts is TypeScript (ESM-flavored `export const`), so it can't be
// `require()`d directly from this CommonJS script — the id/name pairs are
// duplicated here instead. Keep in sync with lib/catalog.ts if a catalog
// entry's id or name ever changes.
const CATALOG_NAMES = {
  pb10: 'Charmast 10,400',
  pbmag: 'IFIDOL MagSafe Power Bank',
  pbug: 'UGREEN 10,000',
  pbmi: 'MIADY 10,000',
  pbot: 'OtterBox 10,000 Leather',
  ch20: '20W USB-C Fast Charger',
  ch21: 'USB-C to Lightning Charger 20W',
  chcab: 'Braided USB-C Cable',
  'cmp-lgt': 'USB-C to Lightning Cable',
  'cmp-adpt-w': 'USB-C Wall Adapter — White',
  'cmp-adpt-b': 'USB-C Wall Adapter — Black',
  st300: 'Anker Power Station',
  solar: 'Litheli 100W Solar Panel',
  acst: 'Nulaxy Phone Stand',
  acpo: 'Tech Pouch',
}

async function main() {
  let linked = 0
  let alreadyLinked = 0
  let unmatched = []

  for (const [catalogId, name] of Object.entries(CATALOG_NAMES)) {
    const existing = await prisma.product.findUnique({ where: { catalogId } })
    if (existing) {
      alreadyLinked++
      continue
    }

    const sku = SEED_SKU_BY_CATALOG_ID[catalogId]
    let row = sku ? await prisma.product.findUnique({ where: { sku } }) : null
    if (!row) {
      row = await prisma.product.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })
    }

    if (!row) {
      unmatched.push(`${catalogId} (${name})`)
      continue
    }
    if (row.catalogId && row.catalogId !== catalogId) {
      console.warn(`Skipping ${catalogId}: matched product "${row.name}" already linked to a different catalogId (${row.catalogId}).`)
      continue
    }

    await prisma.product.update({ where: { id: row.id }, data: { catalogId } })
    console.log(`Linked ${catalogId} -> "${row.name}" (matched by ${sku && row.sku === sku ? 'SKU' : 'name'})`)
    linked++
  }

  console.log(`\nDone: ${linked} linked, ${alreadyLinked} already linked, ${unmatched.length} unmatched.`)
  if (unmatched.length) {
    console.log('Unmatched (no product row found by SKU or name — likely renamed and re-SKU\'d, or never existed in this DB):')
    for (const u of unmatched) console.log(`  - ${u}`)
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
