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

// ─────────────────────────────────────────────────────────────────────────
// Charging session (engine 1.7.0): how long and how much to charge from one
// level to another at a given charger. The rate is the lower of the
// charger's and the car's (AC: onboard charger; DC: fast-charge peak). Real
// sessions slow down as the battery fills, so the time is a range: at the
// full rate, and at half the rate. Energy drawn includes charging losses.

export interface ChargeSessionInput {
  batteryKwh: number
  fromPct: number
  toPct: number
  current: 'AC' | 'DC'
  chargerKw: number
  /** The car's limit for this current type (onboard charger for AC, peak for DC). */
  carKw?: number
  /** J$ per kWh at the charger (price now), and a per-session fee. */
  pricePerKwh?: number | null
  sessionFee?: number | null
  /** Share of drawn energy that reaches the battery. */
  efficiency?: number
}

export interface ChargeSessionResult {
  kwhToBattery: number
  kwhDrawn: number
  rateKw: number
  limitedBy: 'charger' | 'car'
  minutes: { fast: number; slow: number }
  cost: number | null
}

export const CHARGE_EFFICIENCY = 0.9

export function chargeSession(i: ChargeSessionInput): CalcResult<ChargeSessionResult> {
  if (!isPositive(i.batteryKwh)) return refuse('missing_input', ['batteryKwh'], 'Add your battery size in My Garage to work out charging time.')
  if (!isPositive(i.chargerKw)) return refuse('missing_input', ['chargerKw'], 'This charger’s power isn’t known.')
  if (!(i.toPct > i.fromPct) || i.fromPct < 0 || i.toPct > 100) return refuse('invalid_input', ['fromPct', 'toPct'], 'Pick a finishing charge above the starting charge.')
  const eff = i.efficiency ?? CHARGE_EFFICIENCY
  const carLimited = isPositive(i.carKw) && i.carKw < i.chargerKw
  const rateKw = carLimited ? (i.carKw as number) : i.chargerKw
  const kwhToBattery = (i.batteryKwh * (i.toPct - i.fromPct)) / 100
  const kwhDrawn = kwhToBattery / eff
  const fast = (kwhDrawn / rateKw) * 60
  const price = typeof i.pricePerKwh === 'number' && i.pricePerKwh >= 0 ? i.pricePerKwh : null
  const cost = price == null ? null : kwhDrawn * price + (isNonNegative(i.sessionFee) ? (i.sessionFee as number) : 0)
  const warnings: string[] = []
  if (!isPositive(i.carKw)) warnings.push(`Your car’s ${i.current === 'AC' ? 'AC charging' : 'fast-charging'} limit isn’t known — it may charge slower than the station’s ${i.chargerKw} kW.`)
  if (i.current === 'DC' && i.toPct > 80) warnings.push('Fast charging slows a lot above 80%; past that it’s often quicker to unplug and drive on.')
  return {
    ok: true,
    value: { kwhToBattery, kwhDrawn, rateKw, limitedBy: carLimited ? 'car' : 'charger', minutes: { fast, slow: fast * 2 }, cost },
    basis: 'customer_entered',
    assumptions: [
      { id: 'charge.efficiency', description: `About ${Math.round(eff * 100)}% of the energy drawn reaches the battery; you pay for what’s drawn.`, value: eff },
      { id: 'charge.taper', description: 'Time shown from the full rate to half the rate — charging slows as the battery fills and in the heat.' },
    ],
    warnings,
  }
}

/**
 * Running appliances from the car's battery (vehicle-to-load). Keeps a share
 * of charge for driving; runtime = usable energy × conversion ÷ load. Refuses
 * when the load is above the car's V2L output.
 */
export interface VehicleBackupInput {
  batteryKwh: number
  chargePct: number
  keepForDrivingPct: number
  v2lKw: number
  loadW: number
  efficiency?: number
}

export function vehicleBackup(i: VehicleBackupInput): CalcResult<{ usableKwh: number; hours: number; loadShareOfLimit: number }> {
  if (!isPositive(i.batteryKwh)) return refuse('missing_input', ['batteryKwh'], 'Add your battery size in My Garage.')
  if (!isPositive(i.v2lKw)) return refuse('not_applicable', ['v2lKw'], 'Add your car’s vehicle-to-load output in My Garage (only some cars have it).')
  if (!isPositive(i.loadW)) return refuse('missing_input', ['loadW'], 'Add the devices you’d run.')
  if (i.loadW > i.v2lKw * 1000) return refuse('invalid_input', ['loadW'], `Those devices draw ${Math.round(i.loadW)} W — more than your car’s ${i.v2lKw} kW vehicle-to-load output.`)
  const eff = i.efficiency ?? 0.9
  const usableKwh = Math.max(0, (i.batteryKwh * (i.chargePct - i.keepForDrivingPct)) / 100)
  return {
    ok: true,
    value: { usableKwh, hours: (usableKwh * 1000 * eff) / i.loadW, loadShareOfLimit: i.loadW / (i.v2lKw * 1000) },
    basis: 'customer_entered',
    assumptions: [
      { id: 'v2l.efficiency', description: `About ${Math.round(eff * 100)}% of battery energy reaches your appliances.` },
      { id: 'v2l.keep', description: `${i.keepForDrivingPct}% of the battery is kept for driving.` },
    ],
    warnings: ['Use only the car’s own vehicle-to-load socket or an approved adapter — never wire a car into the house without a qualified electrician and a proper transfer switch.'],
  }
}

/**
 * Home charging options (engine 1.7.0). Power = volts × amps of the charging
 * circuit; continuous charging is held to 80% of the breaker (so a 40 A
 * breaker charges at 32 A). Jamaican homes have 110–120 V sockets and a
 * 220–240 V supply for large appliances. Typical values — the electrician
 * confirms what the panel and JPS service can carry.
 */
export const HOME_CHARGE_OPTIONS = [
  { id: 'outlet', label: 'Ordinary wall socket (120 V)', volts: 120, amps: 12, breakerA: 15, note: 'Uses the cable that came with the car. No installation, but slow.' },
  { id: 'l2_16', label: 'Level 2 charger, 16 A (240 V)', volts: 240, amps: 16, breakerA: 20, note: 'A dedicated 240 V circuit. Often fits without a panel upgrade.' },
  { id: 'l2_32', label: 'Level 2 charger, 32 A (240 V)', volts: 240, amps: 32, breakerA: 40, note: 'The most common home charger. May need panel capacity checked.' },
  { id: 'l2_40', label: 'Level 2 charger, 40 A (240 V)', volts: 240, amps: 40, breakerA: 50, note: 'Only worth it if your car takes more than about 7.7 kW on AC.' },
] as const

export interface HomeChargeInput {
  /** Energy drawn per day for the visitor's driving, kWh. */
  dailyKwh: number
  batteryKwh?: number
  /** The car's onboard AC charger limit, kW. */
  carAcKw?: number
  /** Hours the car is parked at home overnight. */
  windowHours: number
}

export interface HomeChargeOption {
  id: (typeof HOME_CHARGE_OPTIONS)[number]['id']
  label: string
  note: string
  breakerA: number
  chargerKw: number
  rateKw: number
  limitedByCar: boolean
  hoursPerDay: number
  fitsWindow: boolean
  /** 20% → 100% (when the battery size is known). */
  fullHours: number | null
}

export function homeChargingOptions(i: HomeChargeInput): CalcResult<{ options: HomeChargeOption[]; recommended: HomeChargeOption['id'] | null }> {
  if (!isPositive(i.dailyKwh)) return refuse('missing_input', ['dailyKwh'], 'Add how far you drive and your car’s energy use.')
  if (!isPositive(i.windowHours) || i.windowHours > 24) return refuse('invalid_input', ['windowHours'], 'Hours parked at home must be between 1 and 24.')
  const options = HOME_CHARGE_OPTIONS.map((o) => {
    const chargerKw = (o.volts * o.amps) / 1000
    const limitedByCar = isPositive(i.carAcKw) && (i.carAcKw as number) < chargerKw
    const rateKw = limitedByCar ? (i.carAcKw as number) : chargerKw
    const hoursPerDay = i.dailyKwh / rateKw
    return {
      id: o.id,
      label: o.label,
      note: o.note,
      breakerA: o.breakerA,
      chargerKw,
      rateKw,
      limitedByCar,
      hoursPerDay,
      fitsWindow: hoursPerDay <= i.windowHours,
      fullHours: isPositive(i.batteryKwh) ? ((i.batteryKwh as number) * 0.8) / CHARGE_EFFICIENCY / rateKw : null,
    }
  })
  // The cheapest option that covers the day's driving overnight, without paying for power the car can't take.
  const recommended = options.find((o) => o.fitsWindow && !(o.id === 'l2_40' && options.find((x) => x.id === 'l2_32')!.limitedByCar))?.id ?? null
  return {
    ok: true,
    value: { options, recommended },
    basis: 'customer_entered',
    assumptions: [
      { id: 'home.continuous', description: 'Chargers run at 80% of the circuit breaker’s rating (continuous load).' },
      { id: 'home.window', description: `Charging fits if a day’s driving can be put back in the ${i.windowHours} hours you’re parked at home.` },
    ],
    warnings: ['A licensed electrician must install any new circuit, and the Government Electrical Inspectorate certifies it. Never charge through an extension cord or adapter.'],
  }
}
