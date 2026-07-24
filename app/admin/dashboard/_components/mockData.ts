export type SectionId =
  | 'exec'
  | 'orders'
  | 'inventory'
  | 'customers'
  | 'marketing2'
  | 'finance'
  | 'analytics'
  | 'playbook'
  | 'settings'

export const fmt = (n: number): string => 'J$' + n.toLocaleString()

export { initials } from '@/lib/initials'

export const TITLES: Record<SectionId, [string, string]> = {
  exec: ['Executive dashboard', "Today's snapshot across the business"],
  orders: ['Order management', 'Pending → packed → delivered, drag to update'],
  inventory: ['Inventory', 'Products, stock levels, suppliers'],
  customers: ['Customers', 'Profiles, segments, lifetime value, support'],
  marketing2: ['Marketing', 'Banners, promotions, campaigns'],
  finance: ['Finance', 'Revenue, margins, cash flow'],
  analytics: ['Analytics', 'Traffic, funnel, geography, behavior'],
  playbook: ['Service playbook', 'Customer-centric guide, frameworks & policies'],
  settings: ['Settings', 'Admins, access & site configuration'],
}

export const NAV_ITEMS: { id: SectionId; icon: string; label: string }[] = [
  { id: 'exec', icon: 'layout-dashboard', label: 'Executive' },
  { id: 'orders', icon: 'kanban-square', label: 'Orders' },
  { id: 'inventory', icon: 'boxes', label: 'Inventory' },
  { id: 'customers', icon: 'users', label: 'Customers' },
  { id: 'marketing2', icon: 'megaphone', label: 'Marketing' },
  { id: 'finance', icon: 'wallet', label: 'Finance' },
  { id: 'analytics', icon: 'chart-scatter', label: 'Analytics' },
  { id: 'playbook', icon: 'book-open', label: 'Playbook' },
  { id: 'settings', icon: 'settings', label: 'Settings' },
]

export interface Banner {
  text: string
  active: boolean
}

export const initialBanners: Banner[] = [
  { text: 'Free delivery over J$10,000 — Kingston-wide', active: true },
  { text: 'New: 20,000mAh PD power bank', active: true },
  { text: 'Solar early-access waitlist now open', active: false },
]

export interface Promo {
  code: string
  value: string
  active: boolean
}

export const initialPromos: Promo[] = [
  { code: 'KINGSTON10', value: '10% off', active: true },
  { code: 'WELCOME5', value: 'J$1,000 off first order', active: true },
  { code: 'SUMMER25', value: '25% off stations', active: false },
]

export const campaigns: { channel: string; tone: 'blue' | 'green' | 'orange'; name: string; when: string }[] = [
  { channel: 'Email', tone: 'blue', name: 'Solar waitlist teaser', when: 'Fri, 9am' },
  { channel: 'SMS', tone: 'green', name: 'Flash sale reminder', when: 'Sat, 11am' },
  { channel: 'Push', tone: 'orange', name: 'Cart abandonment nudge', when: 'Daily, 6pm' },
  { channel: 'Social', tone: 'blue', name: 'New product reel', when: 'Mon, 2pm' },
]

export const execStats: { val: string; label: string; trend: string }[] = [
  { val: 'J$82,400', label: 'DAILY REVENUE', trend: '+6% vs yesterday' },
  { val: 'J$1,788,000', label: 'MONTHLY REVENUE', trend: '+18% MoM' },
  { val: '34%', label: 'PROFIT MARGIN', trend: '+2pt' },
  { val: '3.8%', label: 'CONVERSION RATE', trend: '+0.4pt' },
  { val: '2,140', label: 'WEBSITE TRAFFIC', trend: '+11% WoW' },
  { val: '2', label: 'PENDING ORDERS', trend: 'Needs attention' },
]

export const revenueBars: number[] = [220, 260, 300, 280, 340, 400, 380, 360, 420, 390, 440, 460, 410, 480]

export const bestSellers: { name: string; units: number }[] = [
  { name: 'Charmast 10,400', units: 62 },
  { name: '20W USB-C Charger', units: 48 },
  { name: 'OtterBox 10,000 Leather', units: 31 },
  { name: 'Braided USB-C Cable', units: 27 },
  { name: 'Charmast 20,000 PD', units: 19 },
]

export const lowStockAlerts: { name: string; stockLabel: string }[] = [
  { name: 'Power Station 300', stockLabel: '3 left' },
  { name: 'Braided USB-C Cable', stockLabel: '6 left' },
  { name: '33W GaN Dual-Port', stockLabel: '4 left' },
]

export const customerGrowth = {
  total: 428,
  newThisMonth: 37,
  conversionRate: '3.8%',
}

export const marginByCategory: { label: string; val: number; tone: 'green' | 'blue' | 'sun' }[] = [
  { label: 'Power banks', val: 42, tone: 'green' },
  { label: 'Chargers & cables', val: 55, tone: 'blue' },
  { label: 'Power stations', val: 22, tone: 'sun' },
  { label: 'Accessories', val: 60, tone: 'green' },
]

export const financeStats: { val: string; label: string }[] = [
  { val: 'J$1,788,000', label: 'REVENUE (MTD)' },
  { val: 'J$1,180,000', label: 'EXPENSES (MTD)' },
  { val: 'J$608,000', label: 'GROSS PROFIT' },
  { val: '34%', label: 'AVG MARGIN' },
]

export const outstandingRows: { label: string; value: string }[] = [
  { label: 'Outstanding payments', value: 'J$248,000' },
  { label: 'Refunds this month', value: 'J$12,800' },
  { label: 'Tax owed (GCT)', value: 'J$134,000' },
]

export const funnel: { label: string; count: number }[] = [
  { label: 'Site visits', count: 2140 },
  { label: 'Product views', count: 960 },
  { label: 'Added to cart', count: 310 },
  { label: 'Purchased', count: 82 },
]

export const heatmapSeed: number[] = [
  1, 2, 4, 3, 5, 2, 1,
  2, 3, 5, 4, 5, 3, 2,
  3, 4, 5, 4, 3, 2, 4,
  5, 4, 3, 5, 3, 2, 1,
]

export const geography: { name: string; pct: number }[] = [
  { name: 'Kingston', pct: 44 },
  { name: 'St. Andrew', pct: 22 },
  { name: 'St. Catherine', pct: 16 },
  { name: 'Clarendon', pct: 10 },
  { name: 'Other parishes', pct: 8 },
]
