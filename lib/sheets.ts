import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from 'google-spreadsheet'
import { JWT } from 'google-auth-library'
import { prisma } from '@/lib/prisma'

/**
 * Live business-data → Google Sheets sync.
 *
 * Requires a Google Cloud service account with the Sheets API enabled, shared
 * as an Editor on the target spreadsheet. See DEPLOY.md for setup steps.
 * Without the env vars configured, sync() no-ops gracefully (mirrors the
 * lib/email.ts pattern) so the rest of the app is never blocked by this.
 */

const CLIENT_EMAIL = process.env.GOOGLE_SHEETS_CLIENT_EMAIL
const PRIVATE_KEY = process.env.GOOGLE_SHEETS_PRIVATE_KEY
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

export function isSheetsConfigured(): boolean {
  return Boolean(CLIENT_EMAIL && PRIVATE_KEY && SPREADSHEET_ID)
}

export interface SheetsSyncResult {
  ok: boolean
  syncedAt: string
  sheetUrl?: string
  counts?: Record<string, number>
  error?: string
}

async function getDoc(): Promise<GoogleSpreadsheet> {
  const auth = new JWT({
    email: CLIENT_EMAIL,
    // Service-account keys are stored with literal "\n" in env vars — restore real newlines.
    key: PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const doc = new GoogleSpreadsheet(SPREADSHEET_ID as string, auth)
  await doc.loadInfo()
  return doc
}

async function writeTab(doc: GoogleSpreadsheet, title: string, headerValues: string[], rows: Record<string, string | number>[]) {
  let sheet: GoogleSpreadsheetWorksheet = doc.sheetsByTitle[title]
  if (!sheet) {
    sheet = await doc.addSheet({ title, headerValues })
  } else {
    // Header row defaults to row 1, so this clears data rows only and rewrites the header.
    await sheet.clearRows()
    await sheet.setHeaderRow(headerValues)
  }
  if (rows.length > 0) {
    await sheet.addRows(rows)
  }
}

export async function syncBusinessDataToSheet(): Promise<SheetsSyncResult> {
  if (!isSheetsConfigured()) {
    return { ok: false, syncedAt: new Date().toISOString(), error: 'not_configured' }
  }

  try {
    const doc = await getDoc()

    const [orders, customers, products, suppliers, tickets] = await Promise.all([
      prisma.order.findMany({ include: { items: true }, orderBy: { createdAt: 'desc' } }),
      prisma.user.findMany({
        where: { role: 'USER' },
        include: { orders: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.findMany({ orderBy: { name: 'asc' } }),
      prisma.supplier.findMany({ include: { purchaseOrders: true }, orderBy: { name: 'asc' } }),
      prisma.supportTicket.findMany({ orderBy: { createdAt: 'desc' } }),
    ])

    const totalRevenue = orders.filter((o) => o.status !== 'CANCELLED').reduce((sum, o) => sum + o.total, 0)
    const orderCount = orders.length
    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0
    const lowStockCount = products.filter((p) => p.stock <= p.threshold).length
    const openTicketCount = tickets.filter((t) => t.status !== 'RESOLVED').length

    await writeTab(doc, 'Overview', ['Metric', 'Value'], [
      { Metric: 'Total revenue (J$)', Value: totalRevenue },
      { Metric: 'Total orders', Value: orderCount },
      { Metric: 'Average order value (J$)', Value: Math.round(avgOrderValue) },
      { Metric: 'Total customers', Value: customers.length },
      { Metric: 'Products low on stock', Value: lowStockCount },
      { Metric: 'Open support tickets', Value: openTicketCount },
      { Metric: 'Last synced', Value: new Date().toISOString() },
    ])

    await writeTab(
      doc,
      'Sales',
      ['Order #', 'Date', 'Customer', 'Status', 'Payment method', 'Items', 'Total (J$)'],
      orders.map((o) => ({
        'Order #': o.orderNo,
        Date: o.createdAt.toISOString().slice(0, 10),
        Customer: o.customerName,
        Status: o.status,
        'Payment method': o.paymentMethod ?? '—',
        Items: o.items.map((i) => `${i.name} x${i.qty}`).join('; '),
        'Total (J$)': o.total,
      }))
    )

    await writeTab(
      doc,
      'Customers',
      ['Name', 'Email', 'Phone', 'Segment', 'Loyalty tier', 'Orders', 'Lifetime value (J$)', 'Joined'],
      customers.map((c) => ({
        Name: c.name ?? '—',
        Email: c.email,
        Phone: c.phone ?? '—',
        Segment: c.segment ?? '—',
        'Loyalty tier': c.loyaltyTier ?? '—',
        Orders: c.orders.length,
        'Lifetime value (J$)': c.orders.filter((o) => o.status !== 'CANCELLED').reduce((sum, o) => sum + o.total, 0),
        Joined: c.createdAt.toISOString().slice(0, 10),
      }))
    )

    await writeTab(
      doc,
      'Inventory',
      ['SKU', 'Name', 'Category', 'Price (J$)', 'Stock', 'Threshold', 'Low stock?'],
      products.map((p) => ({
        SKU: p.sku ?? '—',
        Name: p.name,
        Category: p.category ?? '—',
        'Price (J$)': p.price,
        Stock: p.stock,
        Threshold: p.threshold,
        'Low stock?': p.stock <= p.threshold ? 'YES' : '',
      }))
    )

    await writeTab(
      doc,
      'Suppliers',
      ['Supplier', 'Contact email', 'Contact phone', 'Open POs', 'Received POs'],
      suppliers.map((s) => ({
        Supplier: s.name,
        'Contact email': s.contactEmail ?? '—',
        'Contact phone': s.contactPhone ?? '—',
        'Open POs': s.purchaseOrders.filter((po) => po.status === 'OPEN').length,
        'Received POs': s.purchaseOrders.filter((po) => po.status === 'RECEIVED').length,
      }))
    )

    await writeTab(
      doc,
      'Support Tickets',
      ['Customer', 'Subject', 'Status', 'Opened'],
      tickets.map((t) => ({
        Customer: t.customerName,
        Subject: t.subject,
        Status: t.status,
        Opened: t.createdAt.toISOString().slice(0, 10),
      }))
    )

    return {
      ok: true,
      syncedAt: new Date().toISOString(),
      sheetUrl: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`,
      counts: {
        orders: orders.length,
        customers: customers.length,
        products: products.length,
        suppliers: suppliers.length,
        tickets: tickets.length,
      },
    }
  } catch (err) {
    console.error('[sheets] sync failed:', err)
    return { ok: false, syncedAt: new Date().toISOString(), error: err instanceof Error ? err.message : 'unknown_error' }
  }
}
