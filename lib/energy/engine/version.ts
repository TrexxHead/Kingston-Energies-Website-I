/**
 * Bump on ANY change to a formula, a default assumption, or an uncertainty
 * policy. Saved calculation runs keep the version they were produced with,
 * so a report sent to a customer can always be explained later.
 *
 * Changelog
 * 1.0.0 (2026-10-12) — initial shared engine: loads, cooling, battery
 *   runtime, continuous/surge checks, bill period comparison, tariff
 *   marginal vs average cost, scenario aggregation.
 * 1.1.0 (2026-10-14) — rooftop solar: footprint area, roof sizing with
 *   stated usable-share and module assumptions, production from PVGIS
 *   specific yield (±1 SD range), marginal-rate savings with a daytime-use
 *   bound; export credit not valued. Default usable roof share 45% flat /
 *   40% pitched; system sized to the household's use, capped by the roof.
 * 1.2.0 (2026-10-14) — EV vs petrol energy cost: home charging priced as
 *   the added cost on the household bill at an approved tariff (or the
 *   visitor's price), public charging at an operator price, charging losses
 *   10% home / 5% public, simple payback on a purchase premium.
 */
export const CALC_ENGINE_VERSION = '1.2.0'
