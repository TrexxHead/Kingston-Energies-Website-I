/**
 * The admin console's information architecture, in one place.
 *
 * The sidebar, the page titles and the command palette all read from this, so
 * a section cannot exist in the menu but be missing from search, or be titled
 * one thing in the nav and another at the top of its own page.
 *
 * Every entry is a real URL. That's the point of the structure: a subsection is
 * somewhere you can link to, bookmark and go back from, and it has room to grow
 * without competing with its siblings for space on a shared screen.
 */

export interface NavLeaf {
  href: string
  label: string
  /** Shown under the page title. Says what this screen is for. */
  description: string
  /** Extra terms the command palette should match on. */
  keywords?: string
}

export interface NavGroup {
  id: string
  label: string
  icon: string
  /** The group's own landing page. */
  href: string
  description: string
  children?: NavLeaf[]
}

const BASE = '/admin/dashboard'

export const NAV: NavGroup[] = [
  {
    id: 'exec',
    label: 'Executive',
    icon: 'layout-dashboard',
    href: BASE,
    description: "Today's snapshot across the business",
  },
  {
    id: 'orders',
    label: 'Orders',
    icon: 'kanban-square',
    href: `${BASE}/orders`,
    description: 'Pending → packed → delivered, drag to update',
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: 'boxes',
    href: `${BASE}/inventory`,
    description: 'Products, stock levels, suppliers',
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: 'users',
    href: `${BASE}/customers`,
    description: 'Profiles, segments, lifetime value, support',
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: 'megaphone',
    href: `${BASE}/marketing`,
    description: 'Banners, promotions, campaigns',
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: 'wallet',
    href: `${BASE}/finance`,
    description: 'Revenue, margins, cash flow',
    children: [
      { href: `${BASE}/finance`, label: 'Overview', description: 'Revenue, expenses and profit at a glance' },
      {
        href: `${BASE}/finance/feed`,
        label: 'Business feed',
        description: 'Everything that happened, and what still needs a decision',
        keywords: 'activity timeline alerts attention unpaid overdue tasks',
      },
      {
        href: `${BASE}/finance/accounting`,
        label: 'Accounting',
        description: 'Chart of accounts, journal entries and the trial balance',
        keywords: 'ledger journal chart of accounts trial balance double entry',
      },
      {
        href: `${BASE}/finance/banking`,
        label: 'Banking',
        description: 'Import statements, match them to the books, then reconcile',
        keywords: 'bank feed statement import csv ofx reconcile match',
      },
      {
        href: `${BASE}/finance/transactions`,
        label: 'Transactions',
        description: 'Every movement of money, in one list',
        keywords: 'payments receipts movements',
      },
      {
        href: `${BASE}/finance/sales`,
        label: 'Sales',
        description: 'What sold, to whom, and what it earned',
        keywords: 'invoices revenue orders',
      },
      {
        href: `${BASE}/finance/expenses`,
        label: 'Expenses',
        description: 'Budgets against actuals, and the expense log',
        keywords: 'budget spend costs',
      },
      {
        href: `${BASE}/finance/receipts`,
        label: 'Receipts & bills',
        description: 'Capture the document behind each expense',
        keywords: 'documents ocr scan supplier bill evidence',
      },
      {
        href: `${BASE}/finance/payroll`,
        label: 'Payroll',
        description: 'Employees, statutory deductions and pay runs',
        keywords: 'paye nis nht heart education tax payslip salary staff',
      },
      {
        href: `${BASE}/finance/schedules`,
        label: 'Assets & schedules',
        description: 'Depreciation, prepaid expenses and deferred revenue',
        keywords: 'fixed assets amortization revenue recognition straight line',
      },
      {
        href: `${BASE}/finance/cash-flow`,
        label: 'Cash flow',
        description: 'What actually came in and went out',
        keywords: 'liquidity runway',
      },
      {
        href: `${BASE}/finance/forecasting`,
        label: 'Forecasting',
        description: 'Where the numbers are heading, and how sure that is',
        keywords: 'projection trend confidence',
      },
      {
        href: `${BASE}/finance/reports`,
        label: 'Reports',
        description: 'Profit and loss, balance sheet, and the statements behind them',
        keywords: 'p&l profit loss balance sheet statements',
      },
      {
        href: `${BASE}/finance/taxes`,
        label: 'Taxes',
        description: 'GCT collected and owed',
        keywords: 'gct vat taj',
      },
      {
        href: `${BASE}/finance/branches`,
        label: 'Branches & FX',
        description: 'Report by location, and record the rates behind foreign amounts',
        keywords: 'branch location currency exchange rate usd multi-currency',
      },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: 'chart-scatter',
    href: `${BASE}/analytics`,
    description: 'Traffic, funnel, geography, behaviour',
  },
  {
    id: 'playbook',
    label: 'Playbook',
    icon: 'book-open',
    href: `${BASE}/playbook`,
    description: 'Customer-centric guide, frameworks and policies',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'settings',
    href: `${BASE}/settings`,
    description: 'Admins, access and site configuration',
  },
]

/** Flattened list of every reachable page. */
export function allPages(): { href: string; label: string; description: string; group: string; keywords?: string }[] {
  return NAV.flatMap((g) =>
    g.children
      ? g.children.map((c) => ({ ...c, group: g.label }))
      : [{ href: g.href, label: g.label, description: g.description, group: 'Go to' }],
  )
}

/**
 * The group a path belongs to, and the leaf within it.
 *
 * Matching is longest-prefix so `/finance/banking` resolves to Banking rather
 * than to Finance's own overview, which shares the shorter prefix.
 */
export function resolve(pathname: string): { group: NavGroup | null; leaf: NavLeaf | null } {
  const clean = pathname.replace(/\/+$/, '') || BASE

  let group: NavGroup | null = null
  for (const g of NAV) {
    if (clean === g.href || clean.startsWith(`${g.href}/`)) {
      if (!group || g.href.length > group.href.length) group = g
    }
  }

  let leaf: NavLeaf | null = null
  for (const c of group?.children ?? []) {
    if (clean === c.href && (!leaf || c.href.length > leaf.href.length)) leaf = c
  }

  return { group, leaf }
}

/** Title and subtitle for the header, whichever depth you're at. */
export function titleFor(pathname: string): { title: string; subtitle: string; breadcrumb: string | null } {
  const { group, leaf } = resolve(pathname)
  if (!group) return { title: 'Admin', subtitle: '', breadcrumb: null }
  if (leaf && leaf.href !== group.href) {
    return { title: leaf.label, subtitle: leaf.description, breadcrumb: group.label }
  }
  return { title: group.label, subtitle: group.description, breadcrumb: null }
}
