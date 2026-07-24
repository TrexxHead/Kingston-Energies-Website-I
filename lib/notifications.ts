// Client-safe notification metadata (no server imports). The server-only
// helpers live in lib/notify.ts.

export type NotificationCategory =
  | 'ORDER'
  | 'SHIPPING'
  | 'NEW_PRODUCT'
  | 'RESTOCK'
  | 'DISCOUNT'
  | 'PROMOTION'
  | 'WARRANTY'
  | 'EVENT'
  | 'ANNOUNCEMENT'

export const NOTIFICATION_CATEGORIES: { id: NotificationCategory; label: string }[] = [
  { id: 'ORDER', label: 'Order updates' },
  { id: 'SHIPPING', label: 'Shipping status' },
  { id: 'NEW_PRODUCT', label: 'New products' },
  { id: 'RESTOCK', label: 'Restocked items' },
  { id: 'DISCOUNT', label: 'Special discounts' },
  { id: 'PROMOTION', label: 'Promotions' },
  { id: 'WARRANTY', label: 'Warranty reminders' },
  { id: 'EVENT', label: 'Events' },
  { id: 'ANNOUNCEMENT', label: 'Announcements' },
]
