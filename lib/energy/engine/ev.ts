import { type CalcResult, type Assumption, refuse, isPositive, isNonNegative } from './result'
import { type TariffVersion, periodCost } from './tariff'

/**
 * EV vs petrol running cost (roadmap P3). Energy only — insurance,
 * maintenance, tyres and depreciation are NOT included and the result says so.
 *
 * Home charging is priced as the ADDED cost on the household's own bill
 * (cost with the EV's kWh minus cost without), at an approved tariff — or
 * at a per-kWh price the visitor types in. Public charging uses an
 * operator price (approved reference data) or the visitor's own figure.
 */

export const EV_DEFAULTS = {
  /** Wall-to-battery efficiency for AC home charging (charger + battery losses). */
  homeChargingEfficiency: 0.9,
  /** DC fast charging losses are mostly upstream of the meter the operator bills on. */
  publicChargingEfficiency: 0.95,
} as const

export interface EvCostInput {
  kmPerYear: number
  /** Petrol car consumption, L per 100 km (from the owner, the dashboard or the maker). */
  petrolLPer100km: number
  /** Pump price J$/L. */
  petrolPricePerL: number
  /** EV consumption at the battery, kWh per 100 km. */
  evKwhPer100km: number
  /** Share of charging done at home, 0–1. */
  homeShare: number
  /** Household monthly kWh without the EV — needed to price home charging at a tariff. */
  householdMonthlyKwh?: number
  /** Approved tariff (preferred) … */
  tariff?: TariffVersion
  /** … or a per-kWh home price the visitor enters. */
  homePricePerKwh?: number
  /** Public charging price J$/kWh. */
  publicPricePerKwh?: number
  /** Optional: how much more the EV costs to buy (J$), for a simple payback. */
  purchasePremium?: number
  onDate: string
}

export interface EvCostResult {
  petrolPerYear: number
  evPerYear: number
  savingPerYear: number
  petrolPerKm: number
  evPerKm: number
  homeKwhPerYear: number
  publicKwhPerYear: number
  homePricePerKwh: number
  paybackYears: number | null
}

export function evCostComparison(i: EvCostInput): CalcResult<EvCostResult> {
  if (!isPositive(i.kmPerYear)) return refuse('missing_input', ['kmPerYear'], 'Enter how far you drive.')
  if (!isPositive(i.petrolLPer100km) || i.petrolLPer100km > 40) return refuse('missing_input', ['petrolLPer100km'], 'Enter your petrol car’s fuel use (L per 100 km).')
  if (!isPositive(i.petrolPricePerL)) return refuse('missing_input', ['petrolPricePerL'], 'A pump price for petrol is needed.')
  if (!isPositive(i.evKwhPer100km) || i.evKwhPer100km > 60) return refuse('missing_input', ['evKwhPer100km'], 'Enter the EV’s energy use (kWh per 100 km).')
  if (!(i.homeShare >= 0 && i.homeShare <= 1)) return refuse('invalid_input', ['homeShare'], 'Home charging share must be 0–100%.')

  const assumptions: Assumption[] = []
  const batteryKwh = (i.kmPerYear / 100) * i.evKwhPer100km
  const homeKwh = (batteryKwh * i.homeShare) / EV_DEFAULTS.homeChargingEfficiency
  const publicKwh = (batteryKwh * (1 - i.homeShare)) / EV_DEFAULTS.publicChargingEfficiency
  assumptions.push({ id: 'ev.charging_losses', description: `Charging losses: ${Math.round((1 - EV_DEFAULTS.homeChargingEfficiency) * 100)}% at home, ${Math.round((1 - EV_DEFAULTS.publicChargingEfficiency) * 100)}% at public chargers.` })

  // Home price: added cost on the household bill at an approved tariff, else the visitor's price.
  let homeCost = 0
  let homePrice = 0
  if (homeKwh > 0) {
    if (i.tariff && isNonNegative(i.householdMonthlyKwh)) {
      const evMonthly = homeKwh / 12
      const without = periodCost(i.tariff, i.householdMonthlyKwh, i.onDate)
      if (!without.ok) return without
      const withEv = periodCost(i.tariff, i.householdMonthlyKwh + evMonthly, i.onDate)
      if (!withEv.ok) return withEv
      homeCost = (withEv.value.total - without.value.total) * 12
      homePrice = homeCost / homeKwh
      assumptions.push(...without.assumptions, { id: 'ev.home_marginal', description: `Home charging priced as the extra cost on a ${Math.round(i.householdMonthlyKwh)} kWh/month household bill.` })
    } else if (isPositive(i.homePricePerKwh)) {
      homePrice = i.homePricePerKwh
      homeCost = homeKwh * homePrice
      assumptions.push({ id: 'ev.home_price', description: `Home electricity at J$${homePrice.toFixed(2)}/kWh (your figure).` })
    } else {
      return refuse('missing_input', ['householdMonthlyKwh', 'homePricePerKwh'], 'To price home charging, enter your household’s monthly kWh (with an approved tariff) or your price per kWh.')
    }
  }
  let publicCost = 0
  if (publicKwh > 0) {
    if (!isNonNegative(i.publicPricePerKwh)) return refuse('missing_input', ['publicPricePerKwh'], 'Enter a public charging price, or set home charging to 100%.')
    publicCost = publicKwh * i.publicPricePerKwh
  }

  const petrolPerYear = (i.kmPerYear / 100) * i.petrolLPer100km * i.petrolPricePerL
  const evPerYear = homeCost + publicCost
  const saving = petrolPerYear - evPerYear
  const payback = isPositive(i.purchasePremium) && saving > 0 ? i.purchasePremium / saving : null

  return {
    ok: true,
    value: {
      petrolPerYear,
      evPerYear,
      savingPerYear: saving,
      petrolPerKm: petrolPerYear / i.kmPerYear,
      evPerKm: evPerYear / i.kmPerYear,
      homeKwhPerYear: homeKwh,
      publicKwhPerYear: publicKwh,
      homePricePerKwh: homePrice,
      paybackYears: payback,
    },
    basis: 'customer_entered',
    assumptions,
    warnings: ['Energy costs only — insurance, servicing, tyres, licensing and resale value are not included.'],
  }
}
