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

