import type { BodyStyle, Powertrain } from './vehicle'
import { tyreRadius, type CarDesign, type Extra, type GrilleStyle, type HeadStyle, type RearStyle, type RoofStyle, type TailStyle, type WheelStyle } from './designs'

/**
 * What the garage's car pictures (2D side view and 3D model) are drawn from:
 * a model's published size and design cues, or a typical shape for its body
 * style. Metres.
 */

export interface BuildSpec {
  L: number
  W: number
  H: number
  WB: number
  frontOverhang: number
  tyreR: number
  tyreW: number
  rimR: number
  clearance: number
  bodyStyle: BodyStyle
  hood: CarDesign['hood']
  rake: CarDesign['rake']
  rear: RearStyle
  head: HeadStyle
  grille: GrilleStyle
  tail: TailStyle
  roof: RoofStyle
  wheel: WheelStyle
  extras: Extra[]
}

/** Typical shapes for a car we have no model-specific design for. */
const GENERIC: Record<BodyStyle, Omit<BuildSpec, 'tyreR' | 'tyreW' | 'rimR' | 'frontOverhang' | 'grille'> & { tyre: string }> = {
  hatchback: { L: 4.25, W: 1.79, H: 1.53, WB: 2.65, clearance: 0.145, tyre: '205/55R16', bodyStyle: 'hatchback', hood: 'short', rake: 'steep', rear: 'hatch', head: 'slim', tail: 'wrap', roof: 'body', wheel: 'spoke5', extras: ['roofSpoiler'] },
  sedan: { L: 4.7, W: 1.83, H: 1.45, WB: 2.8, clearance: 0.14, tyre: '225/45R18', bodyStyle: 'sedan', hood: 'medium', rake: 'steep', rear: 'notchback', head: 'slim', tail: 'wrap', roof: 'body', wheel: 'spoke5', extras: [] },
  suv: { L: 4.75, W: 1.9, H: 1.72, WB: 2.85, clearance: 0.2, tyre: '235/60R18', bodyStyle: 'suv', hood: 'medium', rake: 'moderate', rear: 'squared', head: 'slim', tail: 'wrap', roof: 'body', wheel: 'spoke5', extras: ['cladding', 'roofRails', 'roofSpoiler'] },
  crossover: { L: 4.45, W: 1.85, H: 1.62, WB: 2.72, clearance: 0.17, tyre: '225/55R18', bodyStyle: 'crossover', hood: 'short', rake: 'moderate', rear: 'hatch', head: 'slim', tail: 'wrap', roof: 'black', wheel: 'spoke5', extras: ['cladding', 'roofSpoiler'] },
  pickup: { L: 5.4, W: 1.95, H: 1.85, WB: 3.3, clearance: 0.22, tyre: '265/70R17', bodyStyle: 'pickup', hood: 'long', rake: 'upright', rear: 'bed', head: 'slim', tail: 'cshape', roof: 'body', wheel: 'spoke5', extras: [] },
  van: { L: 4.95, W: 1.92, H: 1.95, WB: 3.0, clearance: 0.17, tyre: '215/65R16', bodyStyle: 'van', hood: 'short', rake: 'moderate', rear: 'squared', head: 'slim', tail: 'vertical', roof: 'body', wheel: 'spoke5', extras: [] },
  coupe: { L: 4.5, W: 1.86, H: 1.33, WB: 2.7, clearance: 0.12, tyre: '245/40R19', bodyStyle: 'coupe', hood: 'long', rake: 'steep', rear: 'fastback', head: 'slim', tail: 'bar', roof: 'body', wheel: 'twin', extras: [] },
  wagon: { L: 4.8, W: 1.83, H: 1.5, WB: 2.85, clearance: 0.14, tyre: '225/50R17', bodyStyle: 'wagon', hood: 'medium', rake: 'steep', rear: 'squared', head: 'slim', tail: 'wrap', roof: 'body', wheel: 'spoke5', extras: ['roofRails', 'roofSpoiler'] },
}

const rimRadius = (tyre: string | undefined, inches: number) => (Number(tyre?.match(/R\s*(\d{2})/i)?.[1] ?? inches) * 25.4) / 2000
const tyreWidth = (tyre: string | undefined) => {
  const m = tyre?.match(/^(\d{3})\//)
  return m ? Number(m[1]) / 1000 : 0.225
}

export function specFor(design: CarDesign | null, bodyStyle: BodyStyle, powertrain: Powertrain): BuildSpec {
  if (design) {
    const L = design.lengthMm / 1000
    const WB = design.wheelbaseMm / 1000
    return {
      L,
      W: design.widthMm / 1000,
      H: design.heightMm / 1000,
      WB,
      // Where no figure is published, split the overhangs the way most cars do (front a little longer).
      frontOverhang: design.frontOverhangMm ? design.frontOverhangMm / 1000 : (L - WB) * (design.bodyStyle === 'pickup' ? 0.45 : 0.54),
      tyreR: tyreRadius(design.tyre, design.wheelInches),
      rimR: rimRadius(design.tyre, design.wheelInches),
      tyreW: tyreWidth(design.tyre),
      clearance: (design.groundClearanceMm ?? 150) / 1000,
      bodyStyle: design.bodyStyle,
      hood: design.hood,
      rake: design.rake,
      rear: design.rear,
      head: design.head,
      grille: design.grille,
      tail: design.tail,
      roof: design.roof,
      wheel: design.wheel,
      extras: design.extras,
    }
  }
  const g = GENERIC[bodyStyle]
  return { ...g, frontOverhang: (g.L - g.WB) * (bodyStyle === 'pickup' ? 0.45 : 0.54), tyreR: tyreRadius(g.tyre, 17), rimR: rimRadius(g.tyre, 17), tyreW: tyreWidth(g.tyre), grille: powertrain === 'bev' ? 'none' : 'trapezoid', head: powertrain === 'bev' && bodyStyle !== 'pickup' ? 'bar' : g.head }
}
