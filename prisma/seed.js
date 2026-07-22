const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const CATEGORY = { powerbanks: 'POWERBANKS', chargers: 'CHARGERS', stations: 'STATIONS', accessories: 'ACCESSORIES' }
const SEGMENT = { VIP: 'VIP', Repeat: 'REPEAT', New: 'NEW' }

const PRODUCTS = [
  { name: 'Charmast 10,400', cat: 'powerbanks', sku: 'KE-PB-104', barcode: '8 901234 001', price: 7999, stock: 42, threshold: 10, spec: '10,400MAH · 3 PORTS · LED', badge: 'Best seller' },
  { name: 'Charmast 20,000 PD', cat: 'powerbanks', sku: 'KE-PB-200', barcode: '8 901234 002', price: 11999, stock: 18, threshold: 10, spec: '20,000MAH · USB-C PD 22.5W', badge: 'Max capacity' },
  { name: 'OtterBox 10,000 Leather', cat: 'powerbanks', sku: 'KE-PB-OTT', barcode: '8 901234 003', price: 9999, stock: 15, threshold: 10, spec: '10,000MAH · LEATHER', badge: 'Repairable' },
  { name: '20W USB-C Fast Charger', cat: 'chargers', sku: 'KE-CH-020', barcode: '8 901234 010', price: 2999, stock: 60, threshold: 15, spec: '20W PD', badge: null },
  { name: '33W GaN Dual-Port', cat: 'chargers', sku: 'KE-CH-033', barcode: '8 901234 011', price: 4999, stock: 4, threshold: 10, spec: 'USB-C + USB-A · GAN', badge: 'New' },
  { name: 'Braided USB-C Cable', cat: 'chargers', sku: 'KE-CB-100', barcode: '8 901234 020', price: 2499, stock: 6, threshold: 15, spec: '1M BRAIDED', badge: null },
  { name: 'Car Charger', cat: 'chargers', sku: 'KE-CH-CAR', barcode: '8 901234 021', price: 3499, stock: 20, threshold: 10, spec: '12V · DUAL PORT', badge: null },
  { name: 'Slim 10,000 Pearl', cat: 'powerbanks', sku: 'KE-PB-SLM', barcode: '8 901234 004', price: 6999, stock: 30, threshold: 10, spec: '10,000MAH · POCKET SLIM', badge: null },
  { name: 'Power Station 300', cat: 'stations', sku: 'KE-ST-300', barcode: '8 901234 030', price: 49999, stock: 3, threshold: 5, spec: '300W · AC + USB-C', badge: 'Pre-order' },
  { name: 'Power Station 500', cat: 'stations', sku: 'KE-ST-500', barcode: '8 901234 031', price: 79999, stock: 7, threshold: 5, spec: '500W · SOLAR-READY', badge: 'Solar-ready' },
  { name: 'Nulaxy Phone Stand', cat: 'accessories', sku: 'KE-AC-STD', barcode: '8 901234 040', price: 2999, stock: 25, threshold: 10, spec: 'ALUMINIUM · FOLDABLE', badge: null },
  { name: 'Tech Pouch', cat: 'accessories', sku: 'KE-AC-PCH', barcode: '8 901234 041', price: 2499, stock: 22, threshold: 10, spec: 'WATER-RESISTANT', badge: null },
]

const CUSTOMERS = [
  { key: 'jowayne', name: 'JoWayne Fearon', email: 'jowayne.fearon@example.com', segment: 'VIP', tier: 'Gold', phone: '876-555-0114', since: 2024, need: 'BUSINESS' },
  { key: 'renee', name: 'Renée B.', email: 'renee.b@example.com', segment: 'Repeat', tier: 'Silver', phone: '876-555-0132', since: 2025, need: 'BACKUP' },
  { key: 'marcus', name: 'Marcus D.', email: 'marcus.d@example.com', segment: 'Repeat', tier: 'Silver', phone: '876-555-0177', since: 2025, need: 'EVERYDAY' },
  { key: 'alicia', name: 'Alicia K.', email: 'alicia.k@example.com', segment: 'New', tier: 'Bronze', phone: '876-555-0190', since: 2026, need: 'OFFGRID' },
  { key: 'devon', name: 'Devon R.', email: 'devon.r@example.com', segment: 'New', tier: 'Bronze', phone: '876-555-0201', since: 2026, need: null },
  { key: 'paula', name: 'Paula S.', email: 'paula.s@example.com', segment: 'VIP', tier: 'Gold', phone: '876-555-0222', since: 2025, need: 'BACKUP' },
]

// Orders matching the kanban mock (order no / customer / status / total) + a few historical DONE orders for VIPs.
const ORDERS = [
  { orderNo: 'KE-1022', key: 'renee', status: 'PENDING', total: 10498, items: [{ name: 'Charmast 10,400', qty: 1, price: 7999 }, { name: 'Braided USB-C Cable', qty: 1, price: 2499 }] },
  { orderNo: 'KE-1023', key: 'marcus', status: 'PENDING', total: 7999, items: [{ name: 'Charmast 10,400', qty: 1, price: 7999 }] },
  { orderNo: 'KE-1020', key: 'alicia', status: 'PACKED', total: 16998, items: [{ name: 'Charmast 20,000 PD', qty: 1, price: 11999 }, { name: '33W GaN Dual-Port', qty: 1, price: 4999 }] },
  { orderNo: 'KE-1019', key: 'devon', status: 'OUT', total: 4999, items: [{ name: '33W GaN Dual-Port', qty: 1, price: 4999 }] },
  { orderNo: 'KE-1017', key: 'jowayne', status: 'DONE', total: 10998, items: [{ name: 'Charmast 10,400', qty: 1, price: 7999 }, { name: '20W USB-C Fast Charger', qty: 1, price: 2999 }] },
  { orderNo: 'KE-1015', key: 'paula', status: 'DONE', total: 7999, items: [{ name: 'Charmast 10,400', qty: 1, price: 7999 }] },
  // Historical DONE orders so VIP LTV/order counts reflect their standing.
  { orderNo: 'KE-0992', key: 'jowayne', status: 'DONE', total: 11999, items: [{ name: 'Charmast 20,000 PD', qty: 1, price: 11999 }] },
  { orderNo: 'KE-0981', key: 'jowayne', status: 'DONE', total: 19999, items: [{ name: 'OtterBox 10,000 Leather', qty: 1, price: 9999 }, { name: 'Power Station 300 deposit', qty: 1, price: 10000 }] },
  { orderNo: 'KE-0975', key: 'paula', status: 'DONE', total: 49999, items: [{ name: 'Power Station 300', qty: 1, price: 49999 }] },
  { orderNo: 'KE-0960', key: 'renee', status: 'DONE', total: 17497, items: [{ name: 'Charmast 20,000 PD', qty: 1, price: 11999 }, { name: 'Nulaxy Phone Stand', qty: 1, price: 2999 }, { name: 'Tech Pouch', qty: 1, price: 2499 }] },
]

const SUPPLIERS = [
  { name: 'Charmast Direct', contactEmail: 'orders@charmast.example', contactPhone: '+86 755 0100', pos: [{ reference: 'PO-2201', status: 'OPEN' }, { reference: 'PO-2198', status: 'OPEN' }] },
  { name: 'GlobalCharge Ltd', contactEmail: 'sales@globalcharge.example', contactPhone: '+44 20 7946 0100', pos: [{ reference: 'PO-2205', status: 'OPEN' }] },
  { name: 'JA Electronics Import', contactEmail: 'import@jaelectronics.example', contactPhone: '876-555-4000', pos: [{ reference: 'PO-2190', status: 'RECEIVED' }] },
]

const TICKETS = [
  { key: 'devon', subject: 'Power bank not charging fully', status: 'OPEN' },
  { key: 'alicia', subject: 'Wrong color delivered', status: 'IN_PROGRESS' },
  { key: 'marcus', subject: 'Warranty claim question', status: 'RESOLVED' },
]

// productId matches the lib/catalog.ts ids so each review can link to /product/<id>.
const REVIEWS = [
  { productId: 'pb10', author: 'Renée B.', location: 'Kingston', rating: 5, body: 'The Charmast 10,400 gets me through two full days on one charge. The LED read-out is a nice touch — no more guessing.' },
  { productId: 'pb20', author: 'Marcus D.', location: 'Portmore', rating: 5, body: 'Charged my laptop and phone on a weekend trip with power to spare. The 20,000 PD is the real deal.' },
  { productId: 'chgan', author: 'Alicia K.', location: 'Spanish Town', rating: 4, body: 'Tiny 33W GaN charger that fills my phone crazy fast. Wish it came in white, but it works beautifully.' },
  { productId: 'pbot', author: 'Devon R.', location: 'Kingston', rating: 5, body: 'The OtterBox leather bank looks premium and survived a drop off my desk. Feels built to last.' },
  { productId: 'st300', author: 'Paula S.', location: 'Mandeville', rating: 5, body: 'Ran my fridge and fan through a 3-hour outage. Kingston Energies delivered exactly what they promised.' },
  { productId: 'chcab', author: 'JoWayne F.', location: 'Kingston', rating: 5, body: 'Braided cable that actually lasts — fast charge every time and it hasn’t frayed after months of daily use.' },
  { productId: 'pbsl', author: 'Simone A.', location: 'Ocho Rios', rating: 4, body: 'Slim Pearl slips right into my bag and disappears. Perfect for a top-up on the go.' },
  { productId: 'acst', author: 'Kemar T.', location: 'Kingston', rating: 5, body: 'Sturdy aluminium stand, folds flat, holds my phone at the perfect angle for calls. Great value.' },
]

async function main() {
  // Admin user — credentials come from env. ALWAYS set ADMIN_PASSWORD before seeding a public DB.
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@kingstonenergies.com'
  const adminPasswordPlain = process.env.ADMIN_PASSWORD || 'Kingston!Admin2026'
  if (!process.env.ADMIN_PASSWORD) {
    console.warn('[seed] ⚠ ADMIN_PASSWORD not set — using the built-in default. Set ADMIN_PASSWORD before seeding a public database.')
  }
  const adminPassword = await bcrypt.hash(adminPasswordPlain, 10)
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: adminPassword, role: 'ADMIN', emailVerified: new Date() }, // keep the password in sync on every seed
    create: { email: adminEmail, name: 'Ops Admin', password: adminPassword, role: 'ADMIN', emailVerified: new Date() },
  })
  console.log(`Seeded admin user: ${admin.email}`)

  // Products (upsert by sku)
  for (const p of PRODUCTS) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: { name: p.name, price: p.price, stock: p.stock, threshold: p.threshold, category: CATEGORY[p.cat], spec: p.spec, badge: p.badge, barcode: p.barcode },
      create: {
        name: p.name, description: p.spec || p.name, price: p.price, features: [],
        sku: p.sku, barcode: p.barcode, category: CATEGORY[p.cat], spec: p.spec, stock: p.stock, threshold: p.threshold, badge: p.badge,
      },
    })
  }
  console.log(`Seeded ${PRODUCTS.length} products`)

  // Customers (upsert by email; empty password = cannot credential-login, correct for CRM contacts)
  const customerIds = {}
  for (const c of CUSTOMERS) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: { name: c.name, segment: SEGMENT[c.segment], loyaltyTier: c.tier, phone: c.phone, primaryNeed: c.need ?? null },
      create: {
        email: c.email, name: c.name, password: '', role: 'USER',
        segment: SEGMENT[c.segment], loyaltyTier: c.tier, phone: c.phone, primaryNeed: c.need ?? null,
        createdAt: new Date(`${c.since}-03-01T00:00:00Z`),
      },
    })
    customerIds[c.key] = user.id
  }
  console.log(`Seeded ${CUSTOMERS.length} customers`)

  // Orders (only if empty, so admin-created orders survive re-seed)
  if ((await prisma.order.count()) === 0) {
    for (const o of ORDERS) {
      const customer = CUSTOMERS.find((c) => c.key === o.key)
      await prisma.order.create({
        data: {
          orderNo: o.orderNo, userId: customerIds[o.key], customerName: customer.name,
          status: o.status, total: o.total,
          items: { create: o.items.map((it) => ({ name: it.name, qty: it.qty, price: it.price })) },
        },
      })
    }
    console.log(`Seeded ${ORDERS.length} orders`)
  } else {
    console.log('Orders already present — skipping order seed')
  }

  // Suppliers + POs (only if empty)
  if ((await prisma.supplier.count()) === 0) {
    for (const s of SUPPLIERS) {
      await prisma.supplier.create({
        data: {
          name: s.name, contactEmail: s.contactEmail, contactPhone: s.contactPhone,
          purchaseOrders: { create: s.pos.map((po) => ({ reference: po.reference, status: po.status })) },
        },
      })
    }
    console.log(`Seeded ${SUPPLIERS.length} suppliers`)
  } else {
    console.log('Suppliers already present — skipping supplier seed')
  }

  // Support tickets (only if empty)
  if ((await prisma.supportTicket.count()) === 0) {
    for (const t of TICKETS) {
      const customer = CUSTOMERS.find((c) => c.key === t.key)
      await prisma.supportTicket.create({
        data: { userId: customerIds[t.key], customerName: customer.name, subject: t.subject, status: t.status },
      })
    }
    console.log(`Seeded ${TICKETS.length} support tickets`)
  } else {
    console.log('Tickets already present — skipping ticket seed')
  }

  // Reviews (only if empty)
  if ((await prisma.review.count()) === 0) {
    for (const r of REVIEWS) {
      await prisma.review.create({
        data: { productId: r.productId, author: r.author, location: r.location, rating: r.rating, body: r.body, verified: true },
      })
    }
    console.log(`Seeded ${REVIEWS.length} reviews`)
  } else {
    console.log('Reviews already present — skipping review seed')
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
