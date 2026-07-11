/**
 * Estimated lifetime carbon saved, proportional to the number of items a
 * customer has purchased. This is a simple, transparent estimate — each
 * portable-power product displaces some grid/disposable-battery usage over
 * its life. Tune CO2_PER_ITEM_KG as real lifecycle data becomes available.
 */
export const CO2_PER_ITEM_KG = 1.05

export function co2SavedKg(itemsPurchased: number): number {
  return Math.round(itemsPurchased * CO2_PER_ITEM_KG * 10) / 10
}

/** Format a kg value, switching to tonnes once it's large enough to read cleanly. */
export function formatCo2(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} tonnes`
  return `${kg.toFixed(1)} kg`
}
