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
 * 1.3.0 (2026-10-14) — loan repayment for energy purchases: amortising
 *   monthly payments at annual rate ÷ 12, financed fees, net monthly effect
 *   and break-even month against a constant bill saving. Generator fuel use
 *   from manual figures (linear between points, floored below the lowest,
 *   single figure only within ±10 points of load). Solar water-pump sizing:
 *   ρgVH ÷ wire-to-water efficiency (assumed 30/40/50% without a datasheet)
 *   against the worst month's PVGIS yield. EV trip energy (driver's
 *   kWh/100 km; hills m·g·h at 85% drivetrain efficiency, 60% regen, only
 *   with vehicle mass) and charge stops at the last charger before a
 *   shortfall (80%, raised to 100% if needed).
 * 1.4.0 (2026-10-16) — solar roof type 'zinc' (corrugated metal) added; it
 *   uses the sloped-roof defaults (40% usable, panels follow the roof
 *   slope, default 20° until the visitor enters the pitch).
 * 1.5.0 (2026-10-16) — detailed loan: fees (upfront / financed / monthly /
 *   yearly, flat or % of the loan), life insurance on the balance,
 *   interest-only months, extra payments, rate-rise check, schedule, and an
 *   APR-style true yearly cost (IRR of all cashflows).
 * 1.6.0 (2026-10-17) — installed solar price range from an approved price
 *   record (J$/kWp low–high, smallest job, battery J$/kWh) and a simple
 *   payback range (price ÷ yearly saving, before financing).
 * 1.7.0 (2026-10-18) — charging session: energy to battery and drawn (90%
 *   efficiency), rate = lower of charger and car, time from full rate to
 *   half rate, cost at the price now plus session fee; vehicle-to-load
 *   backup runtime (vehicleBackup); home charging options (volts × amps,
 *   80% continuous, hours per day vs the overnight window).
 * 1.8.0 (2026-10-18) — solar + battery: midday surplus stored up to the
 *   battery size and returned in the evening at 90% round trip; suggested
 *   size = average day's shiftable energy; covered share feeds savings.
 */
export const CALC_ENGINE_VERSION = '1.8.0'
