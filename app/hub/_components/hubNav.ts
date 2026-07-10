export type HubRoute = 'hub' | 'orders' | 'mydevices' | 'rewards' | 'profile' | 'overview' | 'connected'

export interface HubNavItem {
  route: HubRoute
  icon: string
  label: string
  href: string | null
}

export const HUB_NAV_ITEMS: HubNavItem[] = [
  { route: 'hub', icon: 'layout-dashboard', label: 'Hub', href: '/hub' },
  { route: 'orders', icon: 'package', label: 'Orders', href: '/hub/orders' },
  { route: 'mydevices', icon: 'smartphone', label: 'My devices', href: null },
  { route: 'rewards', icon: 'award', label: 'Rewards', href: null },
  { route: 'profile', icon: 'user-round', label: 'Profile', href: '/hub/profile' },
  { route: 'overview', icon: 'activity', label: 'Overview', href: null },
  { route: 'connected', icon: 'wifi', label: 'Connected home', href: null },
]
