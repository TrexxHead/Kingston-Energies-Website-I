import type { SectionId } from './mockData'

/**
 * Where a legacy SectionId lives now that every section is a real page.
 *
 * The notifications bell and the Settings quick links still speak in section
 * ids, so this is the one place that translates them into URLs — rather than
 * each caller hardcoding a path that could drift from the nav tree.
 */
const HREFS: Record<SectionId, string> = {
  exec: '/admin/dashboard',
  orders: '/admin/dashboard/orders',
  inventory: '/admin/dashboard/inventory',
  customers: '/admin/dashboard/customers',
  marketing2: '/admin/dashboard/marketing',
  finance: '/admin/dashboard/finance',
  analytics: '/admin/dashboard/analytics',
  playbook: '/admin/dashboard/playbook',
  settings: '/admin/dashboard/settings',
}

export function hrefForSection(id: SectionId): string {
  return HREFS[id] ?? '/admin/dashboard'
}
