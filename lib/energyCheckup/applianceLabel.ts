/**
 * Reads the electrical rating off an appliance's own label. Most labels
 * print watts directly; some only print volts and amps (common on motors,
 * older appliances), in which case W = V × A. This never guesses a value
 * that isn't on the label — every input is optional and the result is
 * null unless there's enough real data to compute it.
 */
export function wattsFromVoltsAndAmps(volts: number | null, amps: number | null): number | null {
  if (volts == null || amps == null || volts <= 0 || amps <= 0) return null
  return volts * amps
}
