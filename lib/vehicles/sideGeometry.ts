import type { BuildSpec } from './buildSpec'

/**
 * Side-view shapes for the garage's 2D car picture (components/garage/VehicleSide2D.tsx),
 * as SVG path strings in metres with y flipped (SVG y runs down).
 */

// ── Geometry ─────────────────────────────────────────────────────────────

type Pt = [number, number]

/** All the side-view shapes for a spec, as SVG path strings (y already flipped). */
export function sideGeometry(s: BuildSpec) {
  const { L, H, WB, clearance: cl, tyreR: r } = s
  const fa = L - s.frontOverhang
  const ra = fa - WB
  const archR = r + 0.045
  const greenhouse = H * (s.bodyStyle === 'van' ? 0.42 : s.bodyStyle === 'pickup' ? 0.31 : 0.32)
  const belt = H - greenhouse
  const hoodFrontH = belt - { upright: 0.12, moderate: 0.2, steep: 0.26 }[s.rake]
  const cowl = fa - WB * { short: 0.11, medium: 0.18, long: 0.27 }[s.hood] + (s.bodyStyle === 'van' ? 0.25 : 0)
  const rakeTan = Math.tan(({ upright: 38, moderate: 30, steep: 25 }[s.rake] * Math.PI) / 180)
  const roofFront = cowl - greenhouse / rakeTan
  const bed = s.rear === 'bed'
  const bedTo = bed ? 1.8 : 0
  const rise = bed || s.bodyStyle === 'van' ? 0 : { steep: 0.07, moderate: 0.045, upright: 0.025 }[s.rake]
  const beltR = belt + rise
  const rearGeo = {
    hatch: { roofRear: 0.52, glassBase: 0.07, deck: beltR + 0.02 },
    squared: { roofRear: 0.26, glassBase: 0.04, deck: beltR + 0.02 },
    fastback: { roofRear: ra + 0.12, glassBase: 0.24, deck: beltR + 0.06 },
    ducktail: { roofRear: ra + 0.2, glassBase: 0.42, deck: beltR + 0.05 },
    notchback: { roofRear: ra + 0.12, glassBase: ra - 0.32, deck: beltR + 0.04 },
    bed: { roofRear: bedTo + 0.1, glassBase: bedTo + 0.02, deck: belt - 0.04 },
  }[s.rear]
  const { roofRear, glassBase, deck } = rearGeo
  const beltAt = (x: number) => belt + rise * clamp((cowl - x) / Math.max(0.1, cowl - glassBase), 0, 1)
  const arched = s.rear === 'fastback' || s.rear === 'ducktail'
  const crest = roofRear + (roofFront - roofRear) * (arched ? 0.62 : 0.5)

  // Roof line from the rear glass to the windscreen base.
  const roofPts: Pt[] = [
    [glassBase, beltR + 0.02],
    ...(arched ? ([[glassBase + (roofRear - glassBase) * 0.45, beltR + (H - beltR) * 0.6]] as Pt[]) : s.rear === 'notchback' ? ([[glassBase + (roofRear - glassBase) * 0.5, beltR + (H - beltR) * 0.62]] as Pt[]) : []),
    [roofRear, H - (arched ? 0.07 : 0.022)],
    [crest, H],
    [roofFront, H - 0.022],
    [cowl, belt + 0.01],
  ]
  const roofLine = curve(roofPts)

  // ── Body outline (clockwise from the rear bumper's underside) ──
  const tailTop = s.rear === 'ducktail' ? deck + 0.035 : deck
  const top: Pt[] = [
    [0.08, cl + 0.2],
    [0.012, cl + 0.36],
    [0.0, (cl + 0.36 + tailTop) / 2],
    [0.025, tailTop - 0.06],
    [0.09, tailTop],
  ]
  if (bed) top.push([bedTo - 0.05, deck], [bedTo + 0.02, deck + 0.02])
  else if (s.rear === 'notchback' || s.rear === 'ducktail') top.push([glassBase * 0.55, deck], [glassBase, beltR + 0.03])
  else if (s.rear === 'fastback') top.push([glassBase, deck])
  if (bed) top.push([bedTo + 0.03, H - 0.06], [bedTo + 0.1, H - 0.01])
  else {
    for (const f of [0.2, 0.45, 0.7]) {
      const x = glassBase + (roofRear - glassBase) * f
      if (x > top[top.length - 1][0] + 0.03) top.push([x, roofLine(x)])
    }
  }
  top.push([roofRear, roofLine(roofRear)], [crest, H], [roofFront, roofLine(roofFront)], [(roofFront + cowl) / 2, roofLine((roofFront + cowl) / 2)], [cowl, belt + 0.01])
  top.push([fa - 0.1, hoodFrontH + (belt - hoodFrontH) * 0.32], [L - 0.32, hoodFrontH + 0.03], [L - 0.1, hoodFrontH - 0.025], [L - 0.012, hoodFrontH - 0.12], [L, (hoodFrontH - 0.12 + cl + 0.3) / 2], [L - 0.025, cl + 0.24], [L - 0.14, cl + 0.12])

  const yb = cl + 0.05
  const archEdge = (ax: number) => Math.sqrt(Math.max(0, archR * archR - (yb - r) ** 2))
  const P = (p: Pt) => `${p[0].toFixed(4)} ${(-p[1]).toFixed(4)}`
  const frontA = archEdge(fa)
  const rearA = archEdge(ra)
  const arc = (ax: number, dx: number) => `L${P([ax + dx, yb])}A${archR.toFixed(4)} ${archR.toFixed(4)} 0 1 0 ${P([ax - dx, yb])}`
  const body = `M${P(top[0])}${smooth(top, P)}L${P([L - 0.32, cl + 0.07])}L${P([fa + frontA + 0.02, yb])}${arc(fa, frontA)}L${P([ra + rearA, yb])}${arc(ra, rearA)}L${P([0.3, cl + 0.07])}Z`

  // ── Greenhouse (for black roofs) and windows ──
  const winTop = (x: number) => roofLine(x) - 0.085
  const aLine = (x: number) => lerpLine([cowl - 0.1, belt], [roofFront - 0.02, winTop(roofFront - 0.02)], x)
  const rearEdge: [Pt, Pt] = bed
    ? [[bedTo + 0.16, belt], [bedTo + 0.17, H]]
    : s.rear === 'squared' || s.rear === 'hatch'
      ? [[glassBase + 0.44, beltR], [roofRear + 0.26, winTop(roofRear + 0.26)]]
      : [[glassBase + 0.32, beltR], [roofRear + 0.24, winTop(roofRear + 0.24)]]
  const cLine = (x: number) => lerpLine(rearEdge[0], rearEdge[1], x)
  const winPts: Pt[] = []
  const x0 = rearEdge[0][0]
  const x1 = cowl - 0.1
  const xs = Array.from({ length: 121 }, (_, i) => x0 + ((x1 - x0) * i) / 120)
  const tops = xs.map((x) => Math.min(winTop(x), x < rearEdge[1][0] ? cLine(x) : Infinity, x > roofFront - 0.02 ? aLine(x) : Infinity))
  xs.forEach((x, i) => winPts.push([x, Math.max(beltAt(x) + 0.005, tops[i])]))
  for (let i = xs.length - 1; i >= 0; i--) winPts.push([xs[i], beltAt(xs[i]) + 0.005])
  const winRounded = chaikin(chaikin(winPts.filter((p, i) => i === 0 || p[1] >= beltAt(p[0]) + 0.004), true), true)
  const windows = `M${winRounded.map(P).join('L')}Z`
  const greenhouse_ = `M${P([0, beltR + 0.012])}${xs.length ? '' : ''}L${P([glassBase, beltR + 0.012])}${Array.from({ length: 41 }, (_, i) => {
    const x = glassBase + ((cowl - glassBase) * i) / 40
    return `L${P([x, beltAt(x) + 0.012])}`
  }).join('')}L${P([cowl + 0.05, belt + 0.012])}L${P([cowl + 0.05, H + 0.2])}L${P([0, H + 0.2])}Z`

  const bX = (roofRear + roofFront) / 2 + 0.08
  const bPillar = `M${P([bX - 0.035, beltAt(bX) + 0.004])}L${P([bX + 0.035, beltAt(bX) + 0.004])}L${P([bX + 0.025, winTop(bX) + 0.02])}L${P([bX - 0.045, winTop(bX) + 0.02])}Z`
  const reflection = `M${P([x0 + (x1 - x0) * 0.18, H + 0.1])}L${P([x0 + (x1 - x0) * 0.32, H + 0.1])}L${P([x0 + (x1 - x0) * 0.2, belt - 0.1])}L${P([x0 + (x1 - x0) * 0.06, belt - 0.1])}Z M${P([x0 + (x1 - x0) * 0.62, H + 0.1])}L${P([x0 + (x1 - x0) * 0.67, H + 0.1])}L${P([x0 + (x1 - x0) * 0.56, belt - 0.1])}L${P([x0 + (x1 - x0) * 0.51, belt - 0.1])}Z`
  const windowArc = `M${winRounded
    .filter((p) => p[1] > beltAt(p[0]) + 0.03)
    .map((p) => P([p[0], p[1] + 0.03]))
    .join('L')}`

  // ── Lower body, trim lines ──
  const rocker = `M${P([ra + rearA + 0.02, cl + 0.15])}L${P([fa - frontA - 0.02, cl + 0.15])}L${P([fa - frontA - 0.02, cl - 0.05])}L${P([ra + rearA + 0.02, cl - 0.05])}Z`
  const cladArc = (ax: number) => {
    const pts: Pt[] = []
    for (let i = 0; i <= 24; i++) {
      const a = Math.PI * 0.05 + (Math.PI * 0.9 * i) / 24
      pts.push([ax + Math.cos(a) * (archR + 0.03), r + Math.sin(a) * (archR + 0.03)])
    }
    return `M${pts.map(P).join('L')}`
  }
  const cladding = `${cladArc(fa)} ${cladArc(ra)}`
  const bumpers = `M${P([L - 0.45, cl + 0.12])}L${P([L + 0.05, cl + 0.12])}L${P([L + 0.05, cl - 0.1])}L${P([L - 0.45, cl - 0.1])}Z M${P([-0.05, cl + 0.16])}L${P([0.42, cl + 0.16])}L${P([0.42, cl - 0.1])}L${P([-0.05, cl - 0.1])}Z`
  const shoulderPts: Pt[] = Array.from({ length: 30 }, (_, i) => {
    const x = 0.12 + ((L - 0.42) * i) / 29
    return [x, beltAt(Math.min(x, cowl)) - 0.15 - (x > cowl ? (x - cowl) * ((belt - hoodFrontH) / Math.max(0.3, L - cowl)) * 0.6 : 0)]
  })
  const shoulder = `M${shoulderPts.map(P).join('L')}`
  const zCrease = `M${P([ra + archR + 0.15, cl + 0.22])}L${P([fa - archR - 0.25, cl + 0.42])}`

  const doorFront = fa - archR - 0.06
  const doorRear = bed ? bedTo + 0.14 : ra + archR + 0.06
  const seam = (x: number, lean: number) => `M${P([x, cl + 0.1])}L${P([x - lean, beltAt(x) - 0.005])}`
  const seams = [seam(doorFront, 0.04), seam(bX + 0.0, 0.0), seam(doorRear, -0.04), `M${P([doorRear - 0.04, beltAt(doorRear) - 0.005])}L${P([doorFront - 0.04, beltAt(doorFront) - 0.005])}`]
  const handles = [
    { x: bX - 0.26, y: beltAt(bX) - 0.1 },
    { x: doorRear + 0.08, y: beltAt(doorRear) - 0.1 },
  ]

  // Contrast C-pillar blade (Niro) / chrome D-pillar (Atto 3).
  const cBlade =
    s.extras.includes('blade') || s.extras.includes('chromeDPillar')
      ? `M${P([rearEdge[0][0] - 0.1, beltR - 0.02])}L${P([rearEdge[0][0] - 0.02, beltR - 0.02])}L${P([rearEdge[1][0] - 0.02, winTop(rearEdge[1][0]) + 0.03])}L${P([rearEdge[1][0] - 0.1, winTop(rearEdge[1][0]) + 0.03])}Z`
      : null

  const railY = (x: number) => roofLine(x) + 0.03
  const rails = `M${P([roofRear + 0.08, railY(roofRear + 0.08)])}${Array.from({ length: 20 }, (_, i) => {
    const x = roofRear + 0.08 + ((roofFront - 0.2 - roofRear - 0.08) * i) / 19
    return `L${P([x, railY(x)])}`
  }).join('')}${Array.from({ length: 20 }, (_, i) => {
    const x = roofFront - 0.2 - ((roofFront - 0.2 - roofRear - 0.08) * i) / 19
    return `L${P([x, railY(x) - 0.035])}`
  }).join('')}Z`

  const ry = roofLine(roofRear)
  const spoiler =
    s.extras.includes('roofSpoiler') && (s.rear === 'hatch' || s.rear === 'squared' || s.rear === 'fastback')
      ? `M${P([roofRear + 0.12, ry - 0.005])}L${P([roofRear - 0.13, ry - 0.02])}L${P([roofRear - 0.12, ry - 0.06])}L${P([roofRear + 0.12, ry - 0.03])}Z`
      : s.extras.includes('splitSpoiler') && s.rear === 'ducktail'
        ? `M${P([0.04, tailTop + 0.005])}L${P([0.3, tailTop - 0.005])}L${P([0.3, tailTop - 0.025])}L${P([0.02, tailTop - 0.02])}Z`
        : s.extras.includes('splitSpoiler')
          ? `M${P([roofRear + 0.1, ry - 0.005])}L${P([roofRear - 0.16, ry + 0.01])}L${P([roofRear - 0.14, ry - 0.045])}L${P([roofRear + 0.1, ry - 0.035])}Z`
          : null

  const mx = cowl - 0.17
  const my = belt + 0.035
  const mirror = `M${P([mx - 0.12, my + 0.02])}C${P([mx - 0.12, my + 0.1])} ${P([mx + 0.02, my + 0.11])} ${P([mx + 0.07, my + 0.07])}C${P([mx + 0.1, my + 0.04])} ${P([mx + 0.07, my - 0.02])} ${P([mx - 0.02, my - 0.02])}C${P([mx - 0.08, my - 0.02])} ${P([mx - 0.12, my - 0.01])} ${P([mx - 0.12, my + 0.02])}Z`
  const mirrorStalk = `M${P([mx - 0.03, my - 0.015])}L${P([mx + 0.06, my - 0.015])}L${P([mx + 0.08, my - 0.06])}L${P([mx - 0.01, my - 0.06])}Z`

  return {
    body,
    windows,
    greenhouse: greenhouse_,
    bPillar,
    reflection,
    windowArc,
    rocker,
    cladding,
    bumpers,
    shoulder,
    zCrease,
    seams,
    handles,
    cBlade,
    rails,
    spoiler,
    mirror,
    mirrorStalk,
    head: headLamps(s, { L, hoodFrontH, cl }, P),
    tail: tailLamps(s, { tailTop, beltR, deck, bed, bedTo }, P),
    wheels: [{ x: ra }, { x: fa }],
    archR,
  }
}

function headLamps(s: BuildSpec, k: { L: number; hoodFrontH: number; cl: number }, P: (p: Pt) => string) {
  const { L, hoodFrontH: h, cl } = k
  const housing: string[] = []
  const light: string[] = []
  const dots: Pt[] = []
  const poly = (pts: Pt[]) => `M${pts.map(P).join('L')}Z`
  const line = (pts: Pt[]) => `M${pts.map(P).join('L')}`
  const slim = (y: number, len: number, t: number) => poly([[L + 0.02, y], [L - len, y + 0.035], [L - len - 0.03, y + 0.035 - t], [L + 0.02, y - t]])
  switch (s.head) {
    case 'slim':
    case 'hammerhead':
      housing.push(slim(h - 0.07, 0.34, 0.06))
      light.push(line([[L - 0.02, h - 0.075], [L - 0.33, h - 0.042]]))
      if (s.head === 'hammerhead') light.push(line([[L - 0.02, h - 0.075], [L - 0.04, h - 0.14]]))
      break
    case 'bar':
      housing.push(slim(h - 0.07, 0.3, 0.045))
      light.push(line([[L + 0.02, h - 0.08], [L - 0.3, h - 0.046]]))
      break
    case 'pixel':
      housing.push(poly([[L + 0.02, h - 0.06], [L - 0.24, h - 0.045], [L - 0.24, h - 0.15], [L + 0.02, h - 0.16]]))
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) dots.push([L - 0.06 - i * 0.045, h - 0.07 - j * 0.04])
      break
    case 'split':
      light.push(line([[L - 0.01, h - 0.05], [L - 0.28, h - 0.02]]))
      housing.push(poly([[L + 0.02, cl + 0.47], [L - 0.2, cl + 0.47], [L - 0.2, cl + 0.38], [L + 0.02, cl + 0.38]]))
      dots.push([L - 0.06, cl + 0.455], [L - 0.11, cl + 0.455])
      break
    case 'boomerang':
      housing.push(poly([[L + 0.02, h - 0.05], [L - 0.36, h - 0.02], [L - 0.36, h - 0.09], [L - 0.1, h - 0.11], [L - 0.06, h - 0.2], [L + 0.02, h - 0.2]]))
      light.push(line([[L - 0.34, h - 0.03], [L - 0.06, h - 0.055], [L - 0.04, h - 0.18]]))
      break
    case 'round':
      housing.push(`M${P([L - 0.02, h - 0.1])}A0.09 0.06 0 1 0 ${P([L - 0.2, h - 0.1])}A0.09 0.06 0 1 0 ${P([L - 0.02, h - 0.1])}Z`)
      light.push(`M${P([L - 0.04, h - 0.1])}A0.07 0.045 0 1 0 ${P([L - 0.18, h - 0.1])}`)
      break
    case 'stacked':
      for (let i = 0; i < 4; i++) dots.push([L - 0.05, h - 0.06 - i * 0.045])
      housing.push(poly([[L + 0.02, h - 0.04], [L - 0.1, h - 0.04], [L - 0.1, h - 0.26], [L + 0.02, h - 0.26]]))
      light.push(line([[L - 0.02, h - 0.035], [L - 0.3, h - 0.012]]))
      break
    case 'cclamp':
      housing.push(poly([[L + 0.02, h - 0.04], [L - 0.24, h - 0.04], [L - 0.24, h - 0.2], [L + 0.02, h - 0.2]]))
      light.push(line([[L - 0.02, h - 0.06], [L - 0.2, h - 0.06], [L - 0.2, h - 0.18], [L - 0.02, h - 0.18]]))
      break
  }
  return { housing, light, dots }
}

function tailLamps(s: BuildSpec, k: { tailTop: number; beltR: number; deck: number; bed: boolean; bedTo: number }, P: (p: Pt) => string) {
  const y = (s.rear === 'notchback' || s.rear === 'ducktail' ? k.deck : k.bed ? k.deck : k.tailTop) - 0.06
  const housing: string[] = []
  const light: string[] = []
  const poly = (pts: Pt[]) => `M${pts.map(P).join('L')}Z`
  const line = (pts: Pt[]) => `M${pts.map(P).join('L')}`
  switch (s.tail) {
    case 'bar':
      housing.push(poly([[-0.02, y + 0.03], [0.5, y + 0.03], [0.5, y - 0.01], [-0.02, y - 0.02]]))
      light.push(line([[0.0, y + 0.008], [0.48, y + 0.01]]))
      break
    case 'pixel':
      housing.push(poly([[-0.02, y + 0.035], [0.32, y + 0.035], [0.32, y - 0.035], [-0.02, y - 0.035]]))
      for (let i = 0; i < 5; i++) light.push(line([[0.03 + i * 0.055, y], [0.05 + i * 0.055, y]]))
      break
    case 'boomerang':
      housing.push(poly([[-0.02, y + 0.03], [0.42, y + 0.03], [0.4, y - 0.01], [0.1, y - 0.02], [0.06, y - 0.12], [-0.02, y - 0.12]]))
      light.push(line([[0.4, y + 0.01], [0.06, y + 0.0], [0.03, y - 0.1]]))
      break
    case 'cshape':
      housing.push(poly([[-0.02, y + 0.035], [0.26, y + 0.035], [0.26, y - 0.08], [-0.02, y - 0.08]]))
      light.push(line([[0.22, y + 0.015], [0.03, y + 0.015], [0.03, y - 0.06], [0.22, y - 0.06]]))
      break
    case 'vertical':
      housing.push(poly([[-0.02, y + 0.2], [0.08, y + 0.2], [0.09, y - 0.12], [-0.02, y - 0.12]]))
      light.push(line([[0.03, y + 0.17], [0.035, y - 0.09]]))
      break
    case 'tribar':
      housing.push(poly([[-0.02, y + 0.04], [0.3, y + 0.04], [0.3, y - 0.08], [-0.02, y - 0.08]]))
      for (let i = 0; i < 3; i++) light.push(line([[0.05 + i * 0.075, y + 0.02], [0.05 + i * 0.075, y - 0.06]]))
      break
    case 'wrap':
      housing.push(poly([[-0.02, y + 0.03], [0.3, y + 0.035], [0.27, y - 0.05], [-0.02, y - 0.06]]))
      light.push(line([[0.02, y], [0.25, y + 0.005]]))
      break
  }
  return { housing, light }
}

// ── Helpers ──────────────────────────────────────────────────────────────

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

/** y on the straight line through a and b at x. */
const lerpLine = (a: Pt, b: Pt, x: number) => a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0] || 1e-6)

/** Smooth interpolation through (x, y) points that never overshoots its neighbours. */
function curve(pts: Pt[]): (x: number) => number {
  const p = [...pts].sort((a, c) => a[0] - c[0])
  return (x) => {
    if (x <= p[0][0]) return p[0][1]
    if (x >= p[p.length - 1][0]) return p[p.length - 1][1]
    let i = 0
    while (x > p[i + 1][0]) i++
    const [x1, y1] = p[i]
    const [x2, y2] = p[i + 1]
    const y0 = (p[i - 1] ?? p[i])[1]
    const y3 = (p[i + 2] ?? p[i + 1])[1]
    const t = (x - x1) / Math.max(1e-6, x2 - x1)
    const y = 0.5 * (2 * y1 + (-y0 + y2) * t + (2 * y0 - 5 * y1 + 4 * y2 - y3) * t * t + (-y0 + 3 * y1 - 3 * y2 + y3) * t * t * t)
    return Math.min(Math.max(y, Math.min(y1, y2) - 0.01), Math.max(y1, y2) + 0.01)
  }
}

/** Catmull-Rom spline through the points as cubic Bézier segments (starting after the first point). */
function smooth(pts: Pt[], P: (p: Pt) => string): string {
  let d = ''
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${P(c1)} ${P(c2)} ${P(p2)}`
  }
  return d
}

/** Corner-cutting (Chaikin) to round a polygon's corners. */
function chaikin(pts: Pt[], closed: boolean): Pt[] {
  const out: Pt[] = []
  const n = pts.length
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const a = pts[i]
    const b = pts[(i + 1) % n]
    out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75])
  }
  return out
}

/** Mix two hex colours (t = share of b). */
export function mix(a: string, b: string, t: number): string {
  const p = (h: string) => {
    const x = h.replace('#', '')
    const f = x.length === 3 ? x.split('').map((c) => c + c).join('') : x.padEnd(6, '0')
    return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) || 0)
  }
  const [r1, g1, b1] = p(a)
  const [r2, g2, b2] = p(b)
  const c = (u: number, v: number) => Math.round(u + (v - u) * t).toString(16).padStart(2, '0')
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`
}
