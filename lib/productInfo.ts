import type { Category } from '@/lib/catalog'

/* ---- Charge-count estimates ---- */

export interface BenchmarkDevice {
  name: string
  mah: number
}

// Battery sizes of popular devices used as charge benchmarks.
export const BENCHMARK_DEVICES: BenchmarkDevice[] = [
  { name: 'iPhone 15', mah: 3349 },
  { name: 'Samsung S24', mah: 4000 },
  { name: 'iPad 10.9"', mah: 7606 },
]

// Real-world power banks deliver ~65% of rated capacity after voltage
// conversion and cable losses — used so the estimates aren't over-promised.
export const CONVERSION_EFFICIENCY = 0.65

/** Pull an mAh number out of a capacity string like "10,400mAh" (else null). */
export function parseMah(cap?: string | null): number | null {
  if (!cap) return null
  const m = cap.replace(/,/g, '').match(/(\d+)\s*mah/i)
  return m ? parseInt(m[1], 10) : null
}

/** Estimated full charges of a device from a given pack capacity (mAh). */
export function chargesFor(capacityMah: number, deviceMah: number): number {
  return (capacityMah * CONVERSION_EFFICIENCY) / deviceMah
}

/** Format an estimate as e.g. "≈2×" or "≈0.8×". */
export function formatCharges(n: number): string {
  return `≈${n >= 1 ? Math.round(n * 10) / 10 : Math.round(n * 100) / 100}×`
}

/* ---- Care & best practices, by category ---- */

export const CARE_TIPS: Record<Category, string[]> = {
  powerbanks: [
    'Charge it to full before first use, then top up whenever it drops below ~20%.',
    'Keep it out of hot cars and direct sun — heat is the number-one killer of battery life.',
    'Storing it for a while? Leave it around 50% and recharge every 2–3 months.',
    'Recharge it with a good USB-C cable and a proper wall charger for the fastest refill.',
  ],
  chargers: [
    'Unplug by the head, not the cable, to stop the wire from fraying.',
    'Keep the connectors dry and lint-free for a reliable connection.',
    'Match the charger to the device — 20W is plenty for phones; use more for tablets.',
  ],
  stations: [
    'Charge it fully before first use, and recharge every ~3 months when stored.',
    'Keep the vents clear and run it on a hard, flat surface so it stays cool.',
    'For the solar panel: angle it toward the sun and keep it out of shade for best output.',
    'Wipe the panel clean — dust and water spots cut charging speed.',
  ],
  accessories: [
    'Wipe down with a dry cloth; skip harsh cleaners on printed or coated surfaces.',
    'Store it somewhere dry and away from heavy items so it keeps its shape.',
  ],
}
