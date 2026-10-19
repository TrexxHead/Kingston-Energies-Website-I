import type { BodyStyle } from './vehicle'

/**
 * Model-specific designs for the garage's 3D car. Exterior dimensions and
 * standard tyre sizes come from manufacturer pages, owner's manuals and spec
 * catalogues (listed per model). The design cues — lamp shapes, grille, roof,
 * spoilers — describe each car's published look. The model is still an
 * illustration: it gets the proportions and signature details right, but it
 * isn't a scan of the car.
 *
 * Matching is by make + model name + model year (each entry is one
 * generation). A car outside every listed generation uses the plain
 * body-style shape.
 */

export type HeadStyle =
  | 'slim' // thin swept LED units
  | 'bar' // thin full-width light bar joining the lamps
  | 'pixel' // square pixel-block lamps
  | 'split' // slim DRL up high, main lamps low in the bumper
  | 'boomerang'
  | 'round'
  | 'hammerhead' // C-shaped slim lamps
  | 'stacked' // vertical stacked lamps
  | 'cclamp' // C-clamp lamps joined by a bar (F-150 Lightning)
export type GrilleStyle =
  | 'none' // smooth nose, low intake only
  | 'closed' // closed panel (EV)
  | 'vmotion' // closed panel with chrome V (Nissan)
  | 'trapezoid' // large dark mesh grille
  | 'shield' // Mitsubishi Dynamic Shield
  | 'band' // black band across the nose between the lamps
export type TailStyle = 'bar' | 'pixel' | 'boomerang' | 'cshape' | 'vertical' | 'tribar' | 'wrap'
export type RoofStyle = 'body' | 'black' | 'glass'
export type WheelStyle = 'aero' | 'spoke5' | 'multi' | 'twin'
export type RearStyle = 'fastback' | 'hatch' | 'squared' | 'notchback' | 'ducktail' | 'bed'
export type Extra =
  | 'cladding' // black wheel-arch and sill cladding
  | 'roofSpoiler'
  | 'splitSpoiler' // MG4's twin blades
  | 'roofRails'
  | 'blade' // contrast C-pillar blade (Niro)
  | 'chromeArc' // silver roof-line arc (ID.4)
  | 'chromeDPillar' // BYD Atto 3
  | 'zCrease' // Ioniq 5 diagonal door crease
  | 'frunkLip'

export interface CarDesign {
  id: string
  make: string
  model: string
  yearFrom: number
  yearTo: number | null
  /** Lower-case alphanumeric prefixes matched against the model name. */
  aliases: string[]
  /** Prefixes that must NOT match (e.g. "sealion" for BYD Seal). */
  exclude?: string[]
  bodyStyle: BodyStyle
  lengthMm: number
  widthMm: number
  heightMm: number
  wheelbaseMm: number
  frontOverhangMm?: number
  groundClearanceMm?: number
  tyre?: string
  wheelInches: number
  hood: 'short' | 'medium' | 'long'
  rake: 'upright' | 'moderate' | 'steep'
  rear: RearStyle
  head: HeadStyle
  grille: GrilleStyle
  tail: TailStyle
  roof: RoofStyle
  wheel: WheelStyle
  extras: Extra[]
  /** One-line description shown under the model. */
  note: string
  sources: string[]
}

const d = (o: CarDesign) => o

export const CAR_DESIGNS: CarDesign[] = [
  // ── Nissan ──
  d({
    id: 'nissan-leaf-ze1', make: 'Nissan', model: 'Leaf', yearFrom: 2018, yearTo: 2025, aliases: ['leaf'], bodyStyle: 'hatchback',
    lengthMm: 4481, widthMm: 1791, heightMm: 1562, wheelbaseMm: 2700, groundClearanceMm: 155, tyre: '215/50R17', wheelInches: 17,
    hood: 'short', rake: 'steep', rear: 'hatch', head: 'boomerang', grille: 'vmotion', tail: 'boomerang', roof: 'black', wheel: 'aero', extras: ['roofSpoiler'],
    note: 'V-motion nose, boomerang lamps, floating black roof.',
    sources: ['https://www.kbb.com/nissan/leaf/2025/specs', 'https://www.evspecifications.com/en/model/5f40355', 'https://www.carexpert.com.au/nissan/leaf/2025/dimensions'],
  }),
  d({
    id: 'nissan-leaf-3', make: 'Nissan', model: 'Leaf', yearFrom: 2026, yearTo: null, aliases: ['leaf'], bodyStyle: 'crossover',
    lengthMm: 4404, widthMm: 1811, heightMm: 1557, wheelbaseMm: 2690, groundClearanceMm: 135, wheelInches: 18,
    hood: 'short', rake: 'steep', rear: 'fastback', head: 'bar', grille: 'none', tail: 'pixel', roof: 'black', wheel: 'aero', extras: [],
    note: 'Crossover fastback with a full-width light bar and “2-3” tail lamps.',
    sources: ['https://www.evspecifications.com/en/model/95cb3ed', 'https://autotijd.be/en/dimensions/nissan/leaf', 'https://insideevs.com/news/754619/2026-nissan-leaf/'],
  }),
  d({
    id: 'nissan-ariya', make: 'Nissan', model: 'Ariya', yearFrom: 2022, yearTo: null, aliases: ['ariya'], bodyStyle: 'crossover',
    lengthMm: 4595, widthMm: 1850, heightMm: 1660, wheelbaseMm: 2775, groundClearanceMm: 180, tyre: '235/55R19', wheelInches: 19,
    hood: 'short', rake: 'steep', rear: 'hatch', head: 'bar', grille: 'closed', tail: 'bar', roof: 'black', wheel: 'aero', extras: ['roofSpoiler'],
    note: 'Closed gloss-black shield, thin lamps joined by a light line, full-width rear blade.',
    sources: ['https://www.carexpert.com.au/nissan/ariya/2025/dimensions', 'https://autotijd.be/en/dimensions/nissan/ariya'],
  }),
  // ── Hyundai ──
  d({
    id: 'hyundai-ioniq5', make: 'Hyundai', model: 'Ioniq 5', yearFrom: 2022, yearTo: null, aliases: ['ioniq5'], bodyStyle: 'crossover',
    lengthMm: 4655, widthMm: 1890, heightMm: 1605, wheelbaseMm: 3000, groundClearanceMm: 160, tyre: '235/55R19', wheelInches: 19,
    hood: 'short', rake: 'moderate', rear: 'hatch', head: 'pixel', grille: 'none', tail: 'pixel', roof: 'body', wheel: 'aero', extras: ['zCrease', 'roofSpoiler'],
    note: 'Parametric pixel lamps, clamshell bonnet and the Z-shaped door crease.',
    sources: ['https://autotijd.be/en/dimensions/hyundai/ioniq-5-2022-2024', 'https://www.vehiclesizes.com/cars/hyundai/ioniq-5/ioniq-5-facelift-2024-suv-2025/front-view'],
  }),
  d({
    id: 'hyundai-ioniq6', make: 'Hyundai', model: 'Ioniq 6', yearFrom: 2023, yearTo: null, aliases: ['ioniq6'], bodyStyle: 'sedan',
    lengthMm: 4855, widthMm: 1880, heightMm: 1495, wheelbaseMm: 2950, groundClearanceMm: 141, tyre: '225/55R18', wheelInches: 18,
    hood: 'short', rake: 'steep', rear: 'ducktail', head: 'slim', grille: 'none', tail: 'bar', roof: 'body', wheel: 'aero', extras: ['splitSpoiler'],
    note: '“Streamliner” single-arc roof falling to a split ducktail spoiler.',
    sources: ['https://www.carexpert.com.au/hyundai/ioniq-6/dynamiq/exterior-and-dimensions', 'https://www.evspecifications.com/en/model/b9a221a'],
  }),
  d({
    id: 'hyundai-kona-2', make: 'Hyundai', model: 'Kona Electric', yearFrom: 2024, yearTo: null, aliases: ['kona'], bodyStyle: 'crossover',
    lengthMm: 4355, widthMm: 1825, heightMm: 1580, wheelbaseMm: 2660, groundClearanceMm: 151, tyre: '215/60R17', wheelInches: 17,
    hood: 'short', rake: 'moderate', rear: 'hatch', head: 'bar', grille: 'closed', tail: 'bar', roof: 'body', wheel: 'spoke5', extras: ['cladding', 'roofSpoiler'],
    note: '“Seamless horizon” light bars front and rear, angular arch armour.',
    sources: ['https://www.evspecifications.com/en/model/86af36e', 'https://www.iseecars.com/car/2024-hyundai-kona_electric-dimensions'],
  }),
  // ── Kia ──
  d({
    id: 'kia-ev6', make: 'Kia', model: 'EV6', yearFrom: 2022, yearTo: null, aliases: ['ev6'], bodyStyle: 'crossover',
    lengthMm: 4680, widthMm: 1880, heightMm: 1550, wheelbaseMm: 2900, groundClearanceMm: 160, tyre: '235/55R19', wheelInches: 19,
    hood: 'short', rake: 'steep', rear: 'fastback', head: 'slim', grille: 'none', tail: 'boomerang', roof: 'black', wheel: 'twin', extras: ['roofSpoiler'],
    note: 'Low crossover-fastback with a full-width boomerang tail lamp and high spoiler.',
    sources: ['https://autotijd.be/en/dimensions/kia/ev6-2021-2024', 'https://www.carsguide.com.au/kia/ev6/car-dimensions/2026'],
  }),
  d({
    id: 'kia-niro-2', make: 'Kia', model: 'Niro', yearFrom: 2023, yearTo: null, aliases: ['niro'], bodyStyle: 'crossover',
    lengthMm: 4420, widthMm: 1825, heightMm: 1570, wheelbaseMm: 2720, groundClearanceMm: 153, tyre: '215/55R17', wheelInches: 17,
    hood: 'short', rake: 'moderate', rear: 'hatch', head: 'boomerang', grille: 'closed', tail: 'vertical', roof: 'body', wheel: 'spoke5', extras: ['blade', 'cladding', 'roofSpoiler'],
    note: 'Contrast “aero blade” C-pillar with tall boomerang tail lamps.',
    sources: ['https://www.kiamedia.com/us/en/models/niro-ev/2023/specifications', 'https://www.evspecifications.com/en/model/2278250'],
  }),
  d({
    id: 'kia-ev9', make: 'Kia', model: 'EV9', yearFrom: 2024, yearTo: null, aliases: ['ev9'], bodyStyle: 'suv',
    lengthMm: 5010, widthMm: 1980, heightMm: 1755, wheelbaseMm: 3100, groundClearanceMm: 177, tyre: '255/60R19', wheelInches: 19,
    hood: 'medium', rake: 'moderate', rear: 'squared', head: 'stacked', grille: 'closed', tail: 'vertical', roof: 'body', wheel: 'spoke5', extras: ['roofRails', 'cladding'],
    note: 'Upright three-row SUV with vertical “Star Map” lamps front and rear.',
    sources: ['https://www.carsguide.com.au/kia/ev9/car-dimensions/2024', 'https://autotijd.be/en/dimensions/kia/ev9/standard-218-hp-3860'],
  }),
  // ── Chevrolet ──
  d({
    id: 'chevrolet-bolt-euv', make: 'Chevrolet', model: 'Bolt EUV', yearFrom: 2022, yearTo: 2023, aliases: ['bolteuv'], bodyStyle: 'crossover',
    lengthMm: 4306, widthMm: 1770, heightMm: 1616, wheelbaseMm: 2675, groundClearanceMm: 142, tyre: '215/50R17', wheelInches: 17,
    hood: 'short', rake: 'steep', rear: 'hatch', head: 'split', grille: 'closed', tail: 'wrap', roof: 'body', wheel: 'spoke5', extras: ['roofRails', 'roofSpoiler'],
    note: 'Stretched Bolt with roof rails; slim DRLs above low headlamps.',
    sources: ['https://www.evspecifications.com/en/model/76d4135', 'https://www.iseecars.com/car/2022-chevrolet-bolt_euv-dimensions'],
  }),
  d({
    id: 'chevrolet-bolt-ev', make: 'Chevrolet', model: 'Bolt EV', yearFrom: 2022, yearTo: 2023, aliases: ['bolt'], exclude: ['bolteuv'], bodyStyle: 'hatchback',
    lengthMm: 4145, widthMm: 1765, heightMm: 1611, wheelbaseMm: 2600, groundClearanceMm: 137, tyre: '215/50R17', wheelInches: 17,
    hood: 'short', rake: 'steep', rear: 'hatch', head: 'split', grille: 'closed', tail: 'cshape', roof: 'body', wheel: 'spoke5', extras: ['roofSpoiler'],
    note: 'Tall one-box hatch; slim DRLs above low headlamps.',
    sources: ['https://www.evspecifications.com/en/model/891a132', 'https://www.iseecars.com/car/2022-chevrolet-bolt_ev-dimensions'],
  }),
  d({
    id: 'chevrolet-equinox-ev', make: 'Chevrolet', model: 'Equinox EV', yearFrom: 2024, yearTo: null, aliases: ['equinoxev'], bodyStyle: 'suv',
    lengthMm: 4836, widthMm: 1915, heightMm: 1613, wheelbaseMm: 2954, groundClearanceMm: 163, tyre: '245/55R19', wheelInches: 19,
    hood: 'medium', rake: 'moderate', rear: 'squared', head: 'split', grille: 'band', tail: 'wrap', roof: 'black', wheel: 'spoke5', extras: ['roofSpoiler'],
    note: 'Full-width upper light bar over headlamps set in a black panel.',
    sources: ['https://www.evspecifications.com/en/model/2733200', 'https://autotijd.be/en/dimensions/chevrolet/equinox-ev-2024-2025'],
  }),
  // ── Ford ──
  d({
    id: 'ford-mach-e', make: 'Ford', model: 'Mustang Mach-E', yearFrom: 2021, yearTo: null, aliases: ['mustangmache', 'mache'], bodyStyle: 'crossover',
    lengthMm: 4713, widthMm: 1881, heightMm: 1613, wheelbaseMm: 2984, groundClearanceMm: 147, tyre: '225/60R18', wheelInches: 18,
    hood: 'long', rake: 'steep', rear: 'fastback', head: 'slim', grille: 'closed', tail: 'tribar', roof: 'black', wheel: 'spoke5', extras: [],
    note: 'Long nose, fastback roof and Mustang tri-bar tail lamps.',
    sources: ['https://autotijd.be/en/dimensions/ford/mustang-mach-e', 'https://www.autopadre.com/vehicle-dimensions/ford-mustang/2025-mach-e-premium-68572'],
  }),
  d({
    id: 'ford-f150-lightning', make: 'Ford', model: 'F-150 Lightning', yearFrom: 2022, yearTo: 2025, aliases: ['f150lightning', 'lightning'], bodyStyle: 'pickup',
    lengthMm: 5911, widthMm: 2029, heightMm: 1989, wheelbaseMm: 3696, frontOverhangMm: 960, groundClearanceMm: 213, tyre: '275/65R18', wheelInches: 18,
    hood: 'long', rake: 'upright', rear: 'bed', head: 'cclamp', grille: 'closed', tail: 'cshape', roof: 'body', wheel: 'spoke5', extras: ['frunkLip'],
    note: 'SuperCrew cab, 5.5 ft bed, C-clamp lamps joined by a full-width bar.',
    sources: ['https://www.kbb.com/ford/f150-lightning/2024/specs', 'https://www.iseecars.com/car/2024-ford-f__150_lightning-dimensions'],
  }),
  // ── Toyota ──
  d({
    id: 'toyota-prius-5', make: 'Toyota', model: 'Prius', yearFrom: 2023, yearTo: null, aliases: ['prius'], bodyStyle: 'hatchback',
    lengthMm: 4600, widthMm: 1780, heightMm: 1430, wheelbaseMm: 2750, tyre: '195/50R19', wheelInches: 19,
    hood: 'short', rake: 'steep', rear: 'fastback', head: 'hammerhead', grille: 'none', tail: 'bar', roof: 'body', wheel: 'twin', extras: [],
    note: 'Low single-arc roof, hammerhead lamps and a full-width tail bar.',
    sources: ['https://toyota.jp/info/prius/xgrade/pdf/prius_xgrade_spec_202607.pdf', 'https://www.thecarconnection.com/specifications/toyota_prius_2023'],
  }),
  d({
    id: 'toyota-prius-4', make: 'Toyota', model: 'Prius', yearFrom: 2016, yearTo: 2022, aliases: ['prius'], exclude: ['priusprime', 'priusphv', 'priusc'], bodyStyle: 'hatchback',
    lengthMm: 4540, widthMm: 1760, heightMm: 1470, wheelbaseMm: 2700, groundClearanceMm: 140, tyre: '195/65R15', wheelInches: 15,
    hood: 'short', rake: 'steep', rear: 'fastback', head: 'slim', grille: 'trapezoid', tail: 'vertical', roof: 'body', wheel: 'aero', extras: ['roofSpoiler'],
    note: 'Wedge profile with a Kammback tail and tall rear lamps.',
    sources: ['https://www.carsguide.com.au/toyota/prius/car-dimensions/2016', 'https://www.truedelta.com/Toyota-Prius/specs-272-2016'],
  }),
  d({
    id: 'toyota-corolla-cross', make: 'Toyota', model: 'Corolla Cross', yearFrom: 2020, yearTo: null, aliases: ['corollacross'], bodyStyle: 'crossover',
    lengthMm: 4460, widthMm: 1825, heightMm: 1620, wheelbaseMm: 2640, groundClearanceMm: 160, tyre: '225/50R18', wheelInches: 18,
    hood: 'medium', rake: 'moderate', rear: 'squared', head: 'slim', grille: 'trapezoid', tail: 'wrap', roof: 'body', wheel: 'spoke5', extras: ['cladding', 'roofRails', 'roofSpoiler'],
    note: 'Large dark trapezoid grille, black arch cladding and roof rails.',
    sources: ['https://www.carsguide.com.au/toyota/corolla-cross/car-dimensions/2023', 'https://www.cars.com/research/toyota-corolla_cross_hybrid-2023/specs/'],
  }),
  d({
    id: 'toyota-rav4-5', make: 'Toyota', model: 'RAV4', yearFrom: 2019, yearTo: 2025, aliases: ['rav4'], bodyStyle: 'suv',
    lengthMm: 4600, widthMm: 1855, heightMm: 1685, wheelbaseMm: 2690, groundClearanceMm: 195, tyre: '225/65R17', wheelInches: 17,
    hood: 'medium', rake: 'moderate', rear: 'squared', head: 'slim', grille: 'trapezoid', tail: 'wrap', roof: 'body', wheel: 'spoke5', extras: ['cladding', 'roofRails', 'roofSpoiler'],
    note: 'Boxy, rugged stance with an octagonal grille and squared cladding.',
    sources: ['https://www.carsguide.com.au/toyota/rav4/car-dimensions/2019', 'https://www.kbb.com/toyota/rav4-hybrid/2019/specs/'],
  }),
  d({
    id: 'toyota-chr-1', make: 'Toyota', model: 'C-HR', yearFrom: 2017, yearTo: 2023, aliases: ['chr'], bodyStyle: 'crossover',
    lengthMm: 4360, widthMm: 1795, heightMm: 1565, wheelbaseMm: 2640, groundClearanceMm: 154, tyre: '225/50R18', wheelInches: 18,
    hood: 'short', rake: 'steep', rear: 'fastback', head: 'slim', grille: 'trapezoid', tail: 'boomerang', roof: 'black', wheel: 'spoke5', extras: ['roofSpoiler'],
    note: 'Coupé-crossover with a rising window line and jutting boomerang tail lamps.',
    sources: ['https://toyota-specs.com/cars/2018/chr1.8/specs.php', 'https://www.carsguide.com.au/toyota/c-hr/car-dimensions/2018'],
  }),
  d({
    id: 'toyota-bz4x', make: 'Toyota', model: 'bZ4X', yearFrom: 2022, yearTo: null, aliases: ['bz4x', 'bz'], bodyStyle: 'suv',
    lengthMm: 4690, widthMm: 1860, heightMm: 1650, wheelbaseMm: 2850, groundClearanceMm: 182, tyre: '235/60R18', wheelInches: 18,
    hood: 'short', rake: 'steep', rear: 'squared', head: 'hammerhead', grille: 'band', tail: 'bar', roof: 'black', wheel: 'spoke5', extras: ['cladding', 'splitSpoiler'],
    note: 'Hammerhead nose band, thick angular cladding and a full-width tail bar.',
    sources: ['https://www.carsguide.com.au/toyota/bz4x/car-dimensions/2025', 'https://www.iseecars.com/car/toyota-bz4x-dimensions'],
  }),
  d({
    id: 'toyota-aqua-2', make: 'Toyota', model: 'Aqua', yearFrom: 2021, yearTo: null, aliases: ['aqua'], bodyStyle: 'hatchback',
    lengthMm: 4050, widthMm: 1695, heightMm: 1485, wheelbaseMm: 2600, groundClearanceMm: 140, tyre: '185/65R15', wheelInches: 15,
    hood: 'short', rake: 'steep', rear: 'hatch', head: 'slim', grille: 'trapezoid', tail: 'wrap', roof: 'body', wheel: 'aero', extras: ['roofSpoiler'],
    note: 'Compact rounded hatch with an arching roof and wide lower grille.',
    sources: ['https://gazoo.com/catalog/maker/TOYOTA/AQUA/202107/10146633/', 'https://221616.com/catalog/toyota/aqua/202107_299912/10152918/'],
  }),
  // ── Honda ──
  d({
    id: 'honda-fit-4', make: 'Honda', model: 'Fit', yearFrom: 2020, yearTo: null, aliases: ['fit', 'jazz'], bodyStyle: 'hatchback',
    lengthMm: 3995, widthMm: 1695, heightMm: 1515, wheelbaseMm: 2530, groundClearanceMm: 135, tyre: '185/60R15', wheelInches: 15,
    hood: 'short', rake: 'steep', rear: 'hatch', head: 'round', grille: 'closed', tail: 'wrap', roof: 'body', wheel: 'spoke5', extras: ['roofSpoiler'],
    note: 'Tall one-box hatch with very thin A-pillars and round, friendly lamps.',
    sources: ['https://221616.com/catalog/honda/fit/202002_299912/10128462/', 'https://www.nextage.jp/carcatalog/honda/fit/6aa-gr3/'],
  }),
  d({
    id: 'honda-vezel-2', make: 'Honda', model: 'Vezel', yearFrom: 2021, yearTo: null, aliases: ['vezel'], bodyStyle: 'crossover',
    lengthMm: 4330, widthMm: 1790, heightMm: 1590, wheelbaseMm: 2610, groundClearanceMm: 195, tyre: '225/50R18', wheelInches: 18,
    hood: 'medium', rake: 'moderate', rear: 'fastback', head: 'slim', grille: 'closed', tail: 'bar', roof: 'body', wheel: 'spoke5', extras: ['cladding'],
    note: 'Straight window line, body-colour slatted grille and a full-width tail bar.',
    sources: ['https://car.motor-fan.jp/catalog/HONDA/10202045/10136484', 'https://autoc-one.jp/catalog/honda/vezel/fmc3390-mc12029/135617/'],
  }),
  // ── Tesla ──
  d({
    id: 'tesla-model3-highland', make: 'Tesla', model: 'Model 3', yearFrom: 2024, yearTo: null, aliases: ['model3'], bodyStyle: 'sedan',
    lengthMm: 4720, widthMm: 1850, heightMm: 1440, wheelbaseMm: 2875, groundClearanceMm: 138, tyre: '235/45R18', wheelInches: 18,
    hood: 'short', rake: 'steep', rear: 'ducktail', head: 'slim', grille: 'none', tail: 'cshape', roof: 'glass', wheel: 'aero', extras: [],
    note: 'Grille-less nose, very slim lamps and an all-glass roof.',
    sources: ['https://www.tesla.com/ownersmanual/model3/en_eu/GUID-56562137-FC31-4110-A13C-9A9FC6657BF0.html', 'https://www.carsguide.com.au/tesla/model-3/car-dimensions/2024'],
  }),
  d({
    id: 'tesla-modely-1', make: 'Tesla', model: 'Model Y', yearFrom: 2020, yearTo: 2024, aliases: ['modely'], bodyStyle: 'crossover',
    lengthMm: 4751, widthMm: 1921, heightMm: 1624, wheelbaseMm: 2890, groundClearanceMm: 167, tyre: '255/45R19', wheelInches: 19,
    hood: 'short', rake: 'steep', rear: 'fastback', head: 'slim', grille: 'none', tail: 'cshape', roof: 'glass', wheel: 'aero', extras: [],
    note: 'Rounded grille-less nose, glass roof and a fastback hatch lip.',
    sources: ['https://www.tesla.cn/ownersmanual/modely/en_cn/GUID-FDDB10EF-FFA9-46EB-B8CC-03614AE92B6B.html', 'https://www.motor1.com/features/747758/tesla-model-y-facelift-analysis/'],
  }),
  d({
    id: 'tesla-modely-juniper', make: 'Tesla', model: 'Model Y', yearFrom: 2025, yearTo: null, aliases: ['modely'], bodyStyle: 'crossover',
    lengthMm: 4790, widthMm: 1921, heightMm: 1624, wheelbaseMm: 2890, groundClearanceMm: 167, tyre: '255/45R19', wheelInches: 19,
    hood: 'short', rake: 'steep', rear: 'fastback', head: 'bar', grille: 'none', tail: 'bar', roof: 'glass', wheel: 'aero', extras: [],
    note: 'Full-width light bars front and rear, glass roof.',
    sources: ['https://ev-database.org/car/3103/Tesla-Model-Y-RWD', 'https://www.motor1.com/features/747758/tesla-model-y-facelift-analysis/'],
  }),
  // ── Volkswagen ──
  d({
    id: 'vw-id4', make: 'Volkswagen', model: 'ID.4', yearFrom: 2021, yearTo: null, aliases: ['id4'], bodyStyle: 'crossover',
    lengthMm: 4584, widthMm: 1852, heightMm: 1612, wheelbaseMm: 2766, groundClearanceMm: 163, tyre: '235/50R19', wheelInches: 19,
    hood: 'short', rake: 'steep', rear: 'squared', head: 'bar', grille: 'none', tail: 'bar', roof: 'black', wheel: 'aero', extras: ['chromeArc', 'roofSpoiler'],
    note: 'Lamps joined by a light strip, silver roof-line arc, full-width tail lamps.',
    sources: ['https://autotijd.be/en/dimensions/volkswagen/id4', 'https://www.carsguide.com.au/volkswagen/id4/car-dimensions/2024'],
  }),
  // ── BYD ──
  d({
    id: 'byd-atto3', make: 'BYD', model: 'Atto 3', yearFrom: 2022, yearTo: null, aliases: ['atto3', 'yuanplus', 'yuan'], bodyStyle: 'crossover',
    lengthMm: 4455, widthMm: 1875, heightMm: 1615, wheelbaseMm: 2720, groundClearanceMm: 175, tyre: '215/55R18', wheelInches: 18,
    hood: 'medium', rake: 'moderate', rear: 'squared', head: 'bar', grille: 'closed', tail: 'bar', roof: 'body', wheel: 'spoke5', extras: ['chromeDPillar', 'cladding', 'roofSpoiler'],
    note: '“Dragon Face” chrome strip, scaled chrome D-pillar and a connected tail bar.',
    sources: ['https://www.carsguide.com.au/byd/atto-3/car-dimensions/2022', 'https://autotijd.be/en/dimensions/byd/atto-3'],
  }),
  d({
    id: 'byd-dolphin', make: 'BYD', model: 'Dolphin', yearFrom: 2023, yearTo: null, aliases: ['dolphin'], bodyStyle: 'hatchback',
    lengthMm: 4290, widthMm: 1770, heightMm: 1570, wheelbaseMm: 2700, groundClearanceMm: 130, tyre: '195/60R16', wheelInches: 16,
    hood: 'short', rake: 'moderate', rear: 'hatch', head: 'slim', grille: 'none', tail: 'bar', roof: 'black', wheel: 'aero', extras: ['roofSpoiler'],
    note: 'Tall compact hatch with a kinked window line and a connected tail bar.',
    sources: ['https://www.carsguide.com.au/byd/dolphin/car-dimensions/2023', 'https://www.motor1.com/news/696829/byd-dolphin-ev-dimensions-boot/'],
  }),
  d({
    id: 'byd-seal', make: 'BYD', model: 'Seal', yearFrom: 2022, yearTo: null, aliases: ['seal'], exclude: ['sealion', 'sealu', 'seal05', 'seal06'], bodyStyle: 'sedan',
    lengthMm: 4800, widthMm: 1875, heightMm: 1460, wheelbaseMm: 2920, groundClearanceMm: 120, tyre: '225/50R18', wheelInches: 18,
    hood: 'short', rake: 'steep', rear: 'fastback', head: 'slim', grille: 'none', tail: 'bar', roof: 'glass', wheel: 'spoke5', extras: [],
    note: 'Low four-door coupé roofline, wave-pattern lamps and a glass roof.',
    sources: ['https://autotijd.be/en/dimensions/byd/seal', 'https://www.carsguide.com.au/byd/seal/car-dimensions/2024'],
  }),
  // ── MG ──
  d({
    id: 'mg-4', make: 'MG', model: 'MG4', yearFrom: 2022, yearTo: 2025, aliases: ['mg4', '4ev', '4'], bodyStyle: 'hatchback',
    lengthMm: 4287, widthMm: 1836, heightMm: 1504, wheelbaseMm: 2705, groundClearanceMm: 150, tyre: '235/45R18', wheelInches: 18,
    hood: 'short', rake: 'steep', rear: 'hatch', head: 'slim', grille: 'none', tail: 'bar', roof: 'black', wheel: 'twin', extras: ['splitSpoiler'],
    note: 'Low, wide hatch with a twin-blade split spoiler and angular light bar.',
    sources: ['https://ev-database.org/car/1708/MG-MG4-Electric-64-kWh', 'https://evguide.uk/mg/mg4-ev'],
  }),
  d({
    id: 'mg-zs-ev', make: 'MG', model: 'ZS EV', yearFrom: 2021, yearTo: null, aliases: ['zsev', 'zs'], bodyStyle: 'suv',
    lengthMm: 4323, widthMm: 1809, heightMm: 1649, wheelbaseMm: 2585, wheelInches: 17,
    hood: 'medium', rake: 'moderate', rear: 'squared', head: 'slim', grille: 'closed', tail: 'wrap', roof: 'body', wheel: 'spoke5', extras: ['cladding', 'roofRails', 'roofSpoiler'],
    note: 'Closed grille with the charge port behind the badge, roof rails.',
    sources: ['https://carexpert.com.au/mg/zs-ev/2022/dimensions'],
  }),
  // ── Mitsubishi ──
  d({
    id: 'mitsubishi-outlander-4', make: 'Mitsubishi', model: 'Outlander PHEV', yearFrom: 2022, yearTo: null, aliases: ['outlander'], bodyStyle: 'suv',
    lengthMm: 4710, widthMm: 1860, heightMm: 1745, wheelbaseMm: 2705, groundClearanceMm: 185, tyre: '255/45R20', wheelInches: 20,
    hood: 'long', rake: 'upright', rear: 'squared', head: 'split', grille: 'shield', tail: 'wrap', roof: 'black', wheel: 'spoke5', extras: ['cladding', 'roofRails', 'roofSpoiler'],
    note: 'Tall, square stance; chrome “Dynamic Shield” and stacked split lamps.',
    sources: ['https://www.carsguide.com.au/mitsubishi/outlander/car-dimensions/2022', 'https://www.kbb.com/mitsubishi/outlander-phev/2022/specs/'],
  }),
]

const MAKE_ALIAS: Record<string, string> = { chevy: 'chevrolet', vw: 'volkswagen', mgmotor: 'mg' }
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
const makeKey = (s: string) => MAKE_ALIAS[norm(s)] ?? norm(s)

/** The model-specific design for this car, or null (use the body-style shape). */
export function designFor(make: string | undefined, model: string | undefined, year: number | undefined): CarDesign | null {
  if (!make || !model || !year) return null
  const mk = makeKey(make)
  let m = norm(model)
  // "MG MG4": the model often repeats the make.
  if (m.startsWith(mk) && m.length > mk.length) m = m.slice(mk.length)
  const hits = CAR_DESIGNS.filter(
    (x) =>
      makeKey(x.make) === mk &&
      year >= x.yearFrom &&
      year <= (x.yearTo ?? 9999) &&
      x.aliases.some((a) => (a.length <= 2 ? m === a || m === `${a}ev` : m.startsWith(a))) &&
      !(x.exclude ?? []).some((e) => m.startsWith(e)),
  )
  // The longest alias wins ("bolteuv" over "bolt").
  return hits.sort((a, b) => Math.max(...b.aliases.map((s) => (m.startsWith(s) ? s.length : 0))) - Math.max(...a.aliases.map((s) => (m.startsWith(s) ? s.length : 0))))[0] ?? null
}

/** Overall tyre radius in metres from a size like "215/50R17" (or the rim size with a typical 55-series tyre). */
export function tyreRadius(tyre: string | undefined, wheelInches: number): number {
  const m = tyre?.match(/(\d{3})\/(\d{2})\s*Z?R\s*(\d{2})/i)
  if (m) return (Number(m[3]) * 25.4) / 2000 + (Number(m[1]) * Number(m[2])) / 100000
  return (wheelInches * 25.4) / 2000 + 0.225 * 0.55
}
