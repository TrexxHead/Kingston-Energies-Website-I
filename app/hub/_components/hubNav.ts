export interface HubNavItem {
  icon: string
  label: string
  href: string
}

// Primary account areas.
export const HUB_MAIN_NAV: HubNavItem[] = [
  { icon: 'layout-dashboard', label: 'Overview', href: '/hub' },
  { icon: 'package', label: 'Orders', href: '/hub/orders' },
  { icon: 'bell', label: 'Notifications', href: '/hub/notifications' },
  { icon: 'battery-charging', label: 'My devices', href: '/hub/devices' },
  { icon: 'heart', label: 'Saved', href: '/hub/saved' },
  { icon: 'map-pin', label: 'Addresses', href: '/hub/addresses' },
  { icon: 'gift', label: 'Rewards', href: '/hub/rewards' },
  { icon: 'user-round', label: 'Profile', href: '/hub/profile' },
]

// Tools group — sits below the main account nav, per the Energy Checkup spec.
export const HUB_TOOLS_NAV: HubNavItem[] = [
  { icon: 'gauge', label: 'Energy checkup', href: '/hub/energy-checkup' },
  { icon: 'cloud-lightning', label: 'Storm prep', href: '/hub/storm-prep' },
]

// Footer utilities.
export const HUB_FOOTER_NAV: HubNavItem[] = [
  { icon: 'life-buoy', label: 'Support', href: '/hub/support' },
  { icon: 'settings', label: 'Settings', href: '/hub/settings' },
]
