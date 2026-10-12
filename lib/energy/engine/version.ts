/**
 * Bump on ANY change to a formula, a default assumption, or an uncertainty
 * policy. Saved calculation runs keep the version they were produced with,
 * so a report sent to a customer can always be explained later.
 *
 * Changelog
 * 1.0.0 (2026-10-12) — initial shared engine: loads, cooling, battery
 *   runtime, continuous/surge checks, bill period comparison, tariff
 *   marginal vs average cost, scenario aggregation.
 */
export const CALC_ENGINE_VERSION = '1.0.0'
