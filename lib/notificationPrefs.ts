export interface NotificationPrefDef {
  key: string
  label: string
  detail: string
  defaultOn: boolean
}

/** Shown on Hub → Settings. Order here is the order they're displayed in. */
export const NOTIFICATION_PREF_DEFS: NotificationPrefDef[] = [
  { key: 'orders', label: 'Order updates', detail: 'Confirmations, packing and delivery status', defaultOn: true },
  { key: 'delivery', label: 'Delivery alerts', detail: 'A heads-up when your driver is nearby', defaultOn: true },
  { key: 'promos', label: 'Promotions & offers', detail: 'Discount codes and seasonal deals', defaultOn: false },
  { key: 'tips', label: 'Product tips', detail: 'Care guides and upgrade suggestions', defaultOn: false },
]

/** Merge a customer's stored overrides (User.notificationPrefs, possibly null) onto the defaults. */
export function resolveNotificationPrefs(stored: unknown): Record<string, boolean> {
  const overrides = stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {}
  const result: Record<string, boolean> = {}
  for (const def of NOTIFICATION_PREF_DEFS) {
    const override = overrides[def.key]
    result[def.key] = typeof override === 'boolean' ? override : def.defaultOn
  }
  return result
}
