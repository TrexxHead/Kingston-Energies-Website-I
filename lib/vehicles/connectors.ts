import type { Vehicle } from './vehicle'

/**
 * Can this car plug into that charger? Station connector names are free
 * text in the registry (“J1772”, “CCS”, “CHAdeMO”, “Type 2”, “Wall outlet”…),
 * so both sides are normalised first. A plain “CCS” station could be CCS1 or
 * CCS2, so it's “check the plug” rather than a yes — we never promise a fit
 * we can't confirm.
 */

export type Fit = 'yes' | 'check' | 'no'

const norm = (s: string) => s.toLowerCase().replace(/[\s()_-]+/g, '')

type StationPlug = 'j1772' | 'type2' | 'ccs1' | 'ccs2' | 'ccs' | 'chademo' | 'nacs' | 'gbt' | 'outlet' | 'unknown'

export function stationPlug(connectorType: string): StationPlug {
  const n = norm(connectorType)
  if (n.includes('chademo')) return 'chademo'
  if (n.includes('ccs2') || n.includes('combo2')) return 'ccs2'
  if (n.includes('ccs1') || n.includes('combo1')) return 'ccs1'
  if (n.includes('ccs')) return 'ccs'
  if (n.includes('j1772') || n.includes('type1')) return 'j1772'
  if (n.includes('type2') || n.includes('mennekes')) return 'type2'
  if (n.includes('tesla') || n.includes('nacs')) return 'nacs'
  if (n.includes('gb')) return 'gbt'
  if (n.includes('outlet') || n.includes('wall') || n.includes('household')) return 'outlet'
  return 'unknown'
}

/** How a vehicle fits one connector type, with a short reason. */
export function connectorFit(v: Pick<Vehicle, 'powertrain' | 'acInlet' | 'dcInlet'>, connectorType: string): { fit: Fit; note: string } {
  if (v.powertrain === 'hev') return { fit: 'no', note: 'Self-charging hybrids don’t plug in.' }
  const plug = stationPlug(connectorType)
  const ac = v.acInlet
  const dc = v.dcInlet
  if (!ac && !dc) return { fit: 'check', note: 'Add your car’s charging port in My Garage to check.' }
  switch (plug) {
    case 'j1772':
      return ac === 'J1772' || dc === 'CCS1' ? { fit: 'yes', note: 'Fits your J1772 port.' } : ac === 'NACS (Tesla)' ? { fit: 'check', note: 'Needs a J1772-to-Tesla adapter.' } : { fit: 'no', note: `Your car has a ${ac ?? dc} port.` }
    case 'type2':
      return ac === 'Type 2' || dc === 'CCS2' ? { fit: 'yes', note: 'Fits your Type 2 port.' } : { fit: 'no', note: `Your car has a ${ac ?? dc} port.` }
    case 'ccs1':
      return dc === 'CCS1' ? { fit: 'yes', note: 'Fast charge — fits your CCS1 port.' } : { fit: 'no', note: dc ? `Your fast-charge port is ${dc}.` : 'Your car has no fast-charge port listed.' }
    case 'ccs2':
      return dc === 'CCS2' ? { fit: 'yes', note: 'Fast charge — fits your CCS2 port.' } : { fit: 'no', note: dc ? `Your fast-charge port is ${dc}.` : 'Your car has no fast-charge port listed.' }
    case 'ccs':
      return dc === 'CCS1' || dc === 'CCS2' ? { fit: 'check', note: `Fast charge — the station lists “CCS”; check it’s ${dc} like your car.` } : { fit: 'no', note: dc ? `Your fast-charge port is ${dc}.` : 'Your car has no fast-charge port listed.' }
    case 'chademo':
      return dc === 'CHAdeMO' ? { fit: 'yes', note: 'Fast charge — fits your CHAdeMO port.' } : { fit: 'no', note: dc ? `Your fast-charge port is ${dc}.` : 'Your car has no fast-charge port listed.' }
    case 'nacs':
      return ac === 'NACS (Tesla)' || dc === 'NACS (Tesla)' ? { fit: 'yes', note: 'Fits your Tesla (NACS) port.' } : { fit: 'check', note: 'Tesla connector — only with an adapter, where the site allows it.' }
    case 'gbt':
      return ac === 'GB/T AC' || dc === 'GB/T DC' ? { fit: 'yes', note: 'Fits your GB/T port.' } : { fit: 'no', note: `Your car has a ${ac ?? dc} port.` }
    case 'outlet':
      return { fit: 'check', note: 'Household socket — only with your car’s portable charging cable, and slowly.' }
    default:
      return { fit: 'check', note: 'We don’t recognise this connector name — check on site.' }
  }
}

/** Best fit across a station's connector groups. */
export function stationFit(v: Pick<Vehicle, 'powertrain' | 'acInlet' | 'dcInlet'>, connectorTypes: string[]): Fit {
  const fits = connectorTypes.map((c) => connectorFit(v, c).fit)
  return fits.includes('yes') ? 'yes' : fits.includes('check') ? 'check' : 'no'
}
