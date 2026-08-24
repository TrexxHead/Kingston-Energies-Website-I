import { OUT_FOR_DELIVERY_STAGE } from '@/lib/pipeline'

/**
 * Whether a customer can still edit their own order's delivery details or
 * payment method — only before it's paid (payment already confirmed means
 * changing the amount/method gets confusing fast) and before it's out for
 * delivery (the courier may already be en route with the old address).
 */
export function orderEditable(order: { paid: boolean; status: string; stage: number }): boolean {
  if (order.paid) return false
  if (order.status === 'CANCELLED') return false
  return order.stage < OUT_FOR_DELIVERY_STAGE
}
