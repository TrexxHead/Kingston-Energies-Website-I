export interface HubNavItem {
  icon: string
  label: string
  href: string
}

// Primary account areas.
export const HUB_MAIN_NAV: HubNavItem[] = [
  { icon: 'layout-dashboard', label: 'Overview', href: '/hub' },
  { icon: 'package', label: 'Orders', href: '/hub/orders' },
  { icon: 'battery-charging', label: 'My devices', href: '/hub/devices' },
  { icon: 'gift', label: 'Rewards', href: '/hub/rewards' },
  { icon: 'user-round', label: 'Profile', href: '/hub/profile' },
]

// Footer utilities.
export const HUB_FOOTER_NAV: HubNavItem[] = [
  { icon: 'life-buoy', label: 'Support', href: '/hub/support' },
  { icon: 'settings', label: 'Settings', href: '/hub/settings' },
]
