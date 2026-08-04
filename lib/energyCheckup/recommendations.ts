import type { ApplianceResult } from './calc'
import type { LightType } from './applianceLibrary'

export interface TierItem {
  icon: string
  text: string
}

export interface ThreeTiers {
  tier1: TierItem[]
  tier2: TierItem[]
  tier3: TierItem[]
}

export interface RecommendationInputs {
  mode: 'home' | 'biz'
  results: ApplianceResult[]
  totalKwh: number
  coolingShare: number
  lightType?: LightType
  hasElectronics: boolean
  hasCoolers: boolean // business display coolers, for the night-cover tip
  solarKw: number
}

const kwhFor = (results: ApplianceResult[], id: string) => results.find((r) => r.applianceId === id)?.kwh ?? 0
const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0)

/**
 * Assembled from the customer's own inputs — tagged snippets keyed to
 * whichever appliance/behaviour triggered them, so no two sessions see the
 * same list. Tier 1 quotes the customer's own figures back. Tier 3 must
 * never carry a price (Kingston Energies doesn't sell/install solar yet).
 */
export function assembleTiers(inputs: RecommendationInputs): ThreeTiers {
  const { mode, results, totalKwh, coolingShare, lightType, hasElectronics, hasCoolers, solarKw } = inputs

  const tier1: TierItem[] = []
  const acKwh = kwhFor(results, mode === 'home' ? 'ac' : 'bizAc')
  if (acKwh > 0) {
    tier1.push({
      icon: 'thermometer',
      text: `Cooling is ${pct(kwhFor(results, mode === 'home' ? 'ac' : 'bizAc') + kwhFor(results, mode === 'home' ? 'fans' : 'bizFans'), totalKwh)}% of your load — JPS says AC alone can be 50–60% of a Jamaican bill. Hold it at 25°C, not 20°C.`,
    })
  }
  const waterKwh = kwhFor(results, mode === 'home' ? 'water' : 'bizWater')
  if (waterKwh > 0) {
    tier1.push({ icon: 'droplets', text: 'Put the water heater on a timer with two heating windows instead of standing hot all day.' })
  }
  if (hasElectronics) {
    tier1.push({ icon: 'power', text: 'Kill standby draw: switch off the TV, microwave and chargers at the wall overnight.' })
  }
  if (mode === 'home' && lightType && lightType !== 'led') {
    tier1.push({ icon: 'lightbulb', text: `Swapping every ${lightType === 'cfl' ? 'CFL' : 'incandescent'} bulb for LED cuts lighting draw by up to 75%.` })
  }
  if (mode === 'home' && kwhFor(results, 'fridge') > 0) {
    tier1.push({ icon: 'refrigerator', text: 'Check the fridge door seal with a paper-strip test — a leak keeps the compressor running longer than it should.' })
  }

  const tier2: TierItem[] = []
  if (mode === 'home' && kwhFor(results, 'charging') > 0) {
    tier2.push({ icon: 'zap', text: 'One multi-port charger in place of several separate adapters means one socket and far less standby draw.' })
  }
  if (waterKwh > 0 || acKwh > 0) {
    tier2.push({ icon: 'plug', text: 'Smart plugs or mechanical timers on the water heater and AC make the habit change automatic.' })
  }
  tier2.push({ icon: 'battery-charging', text: 'A power bank keeps phones and the router alive through a cut — the cheapest insurance against a long outage.' })
  if (hasCoolers) {
    tier2.push({ icon: 'moon', text: 'Night covers on display coolers cut their overnight draw with no equipment change.' })
  }

  const tier3: TierItem[] = [
    {
      icon: 'sun',
      text: `Roughly a ${solarKw.toFixed(1)}kW array, about ${Math.round(solarKw * 3.6)}m² of roof. A range worth exploring — not a sizing or a quote.`,
    },
    {
      icon: 'percent',
      text: "Jamaica's 30% renewable-energy tax credit (capped JMD 1.2M) and NHT solar loans up to JMD 2.5M change the maths considerably — worth checking eligibility before pricing.",
    },
    {
      icon: 'calendar',
      text: 'Re-run this checkup with three months of bills and we can show the seasonal swing, not just one month.',
    },
  ]

  return { tier1, tier2, tier3 }
}

export const CONTEXTUAL_TIP_BY_LEADING_CATEGORY: Record<string, string> = {
  cooling: 'Cooling is your biggest load — that is where the savings are.',
  water: 'Water heating is your biggest load — a timer alone typically claws back 40% of it.',
  refrigeration: 'Refrigeration is carrying more of your bill than usual — worth checking door seals and fridge age.',
  electronics: 'Electronics and always-on gear are your biggest single share — standby draw adds up more than it looks.',
  lighting: 'Lighting is your biggest load — an LED swap alone could cut it by up to 75%.',
  other: 'Your load is fairly evenly spread across everything you run.',
}
