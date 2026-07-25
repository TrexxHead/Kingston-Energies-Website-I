// The 8-stage delivery pipeline shared by the admin dashboard and the
// customer-facing tracking page. Each order carries a `stage` (0-7); the
// coarse OrderStatus enum is kept in sync so the existing kanban still works.

export type OrderStatus = 'PENDING' | 'PACKED' | 'OUT' | 'DONE' | 'CANCELLED'

export interface PipelineStage {
  key: string
  label: string
  /** Short customer-facing headline shown while this stage is current. */
  headline: string
  /** What's happening for the customer at this stage. */
  blurb: string
  /** Coarse status this fine-grained stage rolls up to. */
  status: Exclude<OrderStatus, 'CANCELLED'>
}

export const PIPELINE: PipelineStage[] = [
  { key: 'received', label: 'Order Received', headline: 'Order received', blurb: 'We’ve got your order and it’s in the queue.', status: 'PENDING' },
  { key: 'payment', label: 'Payment Verified', headline: 'Payment verified', blurb: 'Your payment has been confirmed.', status: 'PENDING' },
  { key: 'preparing', label: 'Preparing', headline: 'Preparing your order', blurb: 'The team is picking your items.', status: 'PENDING' },
  { key: 'inspection', label: 'Quality Inspection', headline: 'Quality inspection', blurb: 'Every unit is checked and charge-tested.', status: 'PACKED' },
  { key: 'packaged', label: 'Packaged', headline: 'Packaged', blurb: 'Your order is boxed and labelled.', status: 'PACKED' },
  { key: 'dispatch', label: 'Ready for Dispatch', headline: 'Ready for dispatch', blurb: 'Waiting for the courier to collect.', status: 'PACKED' },
  { key: 'out', label: 'Out for Delivery', headline: 'On the way', blurb: 'Your Kingston courier is en route.', status: 'OUT' },
  { key: 'delivered', label: 'Delivered', headline: 'Delivered', blurb: 'Enjoy — thanks for choosing Kingston Energies.', status: 'DONE' },
]

export const LAST_STAGE = PIPELINE.length - 1

export function clampStage(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(LAST_STAGE, Math.round(n)))
}

/** Coarse status for a given fine-grained stage. */
export function statusForStage(stage: number): Exclude<OrderStatus, 'CANCELLED'> {
  return PIPELINE[clampStage(stage)].status
}

/** Representative stage when the admin drags between coarse kanban columns. */
export function stageForStatus(status: OrderStatus): number {
  switch (status) {
    case 'PENDING': return 0
    case 'PACKED': return 3
    case 'OUT': return 6
    case 'DONE': return 7
    default: return 0
  }
}
