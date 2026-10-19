import * as THREE from 'three'
import type { RearStyle } from '@/lib/vehicles/designs'
import type { BuildSpec } from '@/lib/vehicles/buildSpec'

export { specFor, type BuildSpec } from '@/lib/vehicles/buildSpec'

/**
 * Builds the garage's 3D car from a design: the published exterior
 * dimensions set the proportions; the design cues (lamp signature, grille,
 * roof treatment, spoiler, cladding, wheel style) are drawn onto the body.
 *
 * The body is two lofted surfaces — a lower body whose underside rises over
 * each axle into real wheel arches, and a glass greenhouse with the roof
 * panel and pillars laid on top — so paint reflections run smoothly. Lamps,
 * grilles and trim are built ON that surface (found by searching the body
 * shape), so they follow the nose and tail instead of floating.
 *
 * x runs from the rear bumper (0) to the front (L); y is up; z is across.
 */

type Mats = Record<'paint' | 'roof' | 'glass' | 'trim' | 'gloss' | 'chrome' | 'liner' | 'tyre' | 'rim' | 'rimDark' | 'disc' | 'lamp' | 'lampHousing' | 'tail' | 'tailHousing' | 'mesh' | 'contrast', THREE.Material>

export function buildCar(root: THREE.Group, s: BuildSpec, paint: THREE.Material, disposables: { dispose: () => void }[]) {
  const { L, W, H, WB, tyreR: r, clearance: cl } = s
  const fa = L - s.frontOverhang
  const ra = fa - WB
  const R = r + 0.05
  const hwMax = W / 2

  const m: Mats = {
    paint,
    roof: paint,
    glass: new THREE.MeshPhysicalMaterial({ color: 0x0a0e12, metalness: 0.1, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.7 }),
    trim: new THREE.MeshStandardMaterial({ color: 0x16191c, roughness: 0.7, metalness: 0.1, side: THREE.DoubleSide }),
    gloss: new THREE.MeshPhysicalMaterial({ color: 0x07090b, roughness: 0.12, metalness: 0.3, clearcoat: 1, side: THREE.DoubleSide }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xe6e9ec, metalness: 1, roughness: 0.12 }),
    liner: new THREE.MeshStandardMaterial({ color: 0x0b0c0d, roughness: 0.95, side: THREE.DoubleSide }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x141517, roughness: 0.88 }),
    rim: new THREE.MeshStandardMaterial({ color: 0xcfd3d7, metalness: 1, roughness: 0.2 }),
    rimDark: new THREE.MeshStandardMaterial({ color: 0x2a2d31, metalness: 0.7, roughness: 0.35 }),
    disc: new THREE.MeshStandardMaterial({ color: 0x55595d, metalness: 0.8, roughness: 0.45 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeaf4ff, emissiveIntensity: 2.4, roughness: 0.2 }),
    lampHousing: new THREE.MeshPhysicalMaterial({ color: 0x0c1014, metalness: 0.4, roughness: 0.08, clearcoat: 1, side: THREE.DoubleSide }),
    tail: new THREE.MeshStandardMaterial({ color: 0x5a0000, emissive: 0xff1a1a, emissiveIntensity: 1.8, roughness: 0.3 }),
    tailHousing: new THREE.MeshPhysicalMaterial({ color: 0x3a0306, metalness: 0.2, roughness: 0.1, clearcoat: 1, side: THREE.DoubleSide }),
    mesh: new THREE.MeshStandardMaterial({ color: 0x0d0f11, roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide }),
    contrast: new THREE.MeshPhysicalMaterial({ color: 0x8a9096, metalness: 0.8, roughness: 0.25, clearcoat: 1 }),
  }
  if (s.roof !== 'body') m.roof = s.roof === 'glass' ? m.glass : m.gloss
  for (const [k, v] of Object.entries(m)) if (k !== 'paint' && k !== 'roof') disposables.push(v)

  // ── Side profile ──────────────────────────────────────────────────────
  const greenhouse = H * (s.bodyStyle === 'van' ? 0.42 : s.bodyStyle === 'pickup' ? 0.31 : 0.32)
  const belt = H - greenhouse
  const hoodDrop = { upright: 0.12, moderate: 0.2, steep: 0.26 }[s.rake]
  const hoodFrontH = belt - hoodDrop
  const cowl = fa - WB * { short: 0.11, medium: 0.18, long: 0.27 }[s.hood] - (s.bodyStyle === 'van' ? -0.25 : 0)
  const rakeTan = Math.tan(({ upright: 38, moderate: 30, steep: 25 }[s.rake] * Math.PI) / 180)
  const roofFront = cowl - greenhouse / rakeTan
  const bedTo = s.rear === 'bed' ? 1.8 : 0
  // Most modern cars' window line rises toward the tail.
  const rise = s.rear === 'bed' || s.bodyStyle === 'van' ? 0 : { steep: 0.07, moderate: 0.045, upright: 0.025 }[s.rake]
  const beltR = belt + rise
  // Rear: where the roof ends, where the rear glass meets the body, and the tail-deck height.
  const rearGeo: Record<RearStyle, { roofRear: number; glassBase: number; deck: number }> = {
    hatch: { roofRear: 0.3, glassBase: 0.07, deck: beltR + 0.02 },
    squared: { roofRear: 0.15, glassBase: 0.04, deck: beltR + 0.02 },
    fastback: { roofRear: ra + 0.12, glassBase: 0.24, deck: beltR + 0.06 },
    ducktail: { roofRear: ra + 0.2, glassBase: 0.42, deck: beltR + 0.05 },
    notchback: { roofRear: ra + 0.12, glassBase: ra - 0.32, deck: beltR + 0.04 },
    bed: { roofRear: bedTo + 0.08, glassBase: bedTo + 0.02, deck: belt - 0.04 },
  }
  const { roofRear, glassBase, deck } = rearGeo[s.rear]
  const beltAt = (x: number) => belt + rise * THREE.MathUtils.clamp((cowl - x) / Math.max(0.1, cowl - glassBase), 0, 1)
  const tailTop = s.rear === 'bed' ? deck : s.rear === 'ducktail' ? deck + 0.04 : deck

  const topLine = curve(
    [
      [0, tailTop - 0.13],
      [0.05, tailTop - 0.02],
      [0.12, tailTop],
      ...(s.rear === 'ducktail' || s.rear === 'notchback' ? [[glassBase * 0.55, deck], [glassBase, beltR + 0.01]] : s.rear === 'bed' ? [[bedTo, deck]] : [[Math.max(0.16, glassBase), beltR + 0.01]]),
      ...[0.25, 0.5, 0.75].map((f) => {
        const x = glassBase + (cowl - glassBase) * f
        return [x, beltAt(x)]
      }),
      [cowl, belt - 0.01],
      [fa - 0.05, hoodFrontH + (belt - hoodFrontH) * 0.3],
      [L - 0.3, hoodFrontH + 0.02],
      [L - 0.12, hoodFrontH - 0.05],
      [L - 0.03, hoodFrontH - 0.15],
      [L, hoodFrontH - 0.24],
    ].sort((a, b) => a[0] - b[0]),
  )
  const baseBottom = curve([[0, cl + 0.32], [0.2, cl + 0.08], [0.45, cl + 0.02], [L - 0.5, cl + 0.02], [L - 0.22, cl + 0.07], [L - 0.04, cl + 0.16], [L, cl + 0.26]])
  const archTop = (x: number) => {
    for (const ax of [ra, fa]) {
      const dd = Math.abs(x - ax)
      if (dd < R) return r + Math.sqrt(R * R - dd * dd)
    }
    return -Infinity
  }
  const bottom = (x: number) => Math.max(baseBottom(x), archTop(x))
  const top = (x: number) => Math.max(bottom(x) + 0.02, topLine(x))

  // ── Plan view: straight sides, rounded corners (rounder on sleek cars) ──
  const rf = { steep: 0.46, moderate: 0.36, upright: 0.24 }[s.rake]
  const rr = s.rear === 'squared' || s.rear === 'bed' ? 0.2 : 0.32
  const halfW = (x: number) => {
    const df = L - x
    const dr = x
    if (df < rf) return hwMax - rf + Math.sqrt(Math.max(0, rf * rf - (rf - df) ** 2))
    if (dr < rr) return hwMax - rr + Math.sqrt(Math.max(0, rr * rr - (rr - dr) ** 2))
    return hwMax
  }
  // Rounder sections at the nose and tail, squarer along the doors.
  const nAt = (x: number) => 6 - 2.4 * THREE.MathUtils.smoothstep(x, L - 0.7, L) - 1.6 * (1 - THREE.MathUtils.smoothstep(x, 0, 0.45))
  // Body side: tucked in at the sill, fullest just below the middle, rolling in to a shoulder at the top.
  const shape = (up: number) => (1 - 0.07 * (1 - THREE.MathUtils.smoothstep(up, 0, 0.4))) * (1 - 0.1 * THREE.MathUtils.smoothstep(up, 0.62, 1))
  /** Half-width of the lower body at height y (−1 if y is outside it). */
  const zAt = (x: number, y: number) => {
    const yb = bottom(x)
    const yt = top(x)
    if (y < yb || y > yt) return -1
    const v = (2 * y - yb - yt) / (yt - yb)
    const up = (y - yb) / (yt - yb)
    const n = nAt(x)
    return halfW(x) * Math.pow(1 - Math.pow(Math.abs(v), n), 1 / n) * shape(up)
  }
  const inside = (x: number, y: number, z: number) => Math.abs(z) <= zAt(x, y)

  // ── Lower body ──
  const xs: number[] = []
  for (let i = 0; i <= 260; i++) xs.push((i / 260) * L)
  for (const ax of [ra, fa]) for (const e of [-R, R]) xs.push(ax + e - 0.0005, ax + e + 0.0005)
  xs.sort((a, b) => a - b)
  const lowerMesh = new THREE.Mesh(
    loft(xs, 72, (x, t) => {
      const yb = bottom(x)
      const yt = top(x)
      const [z, y] = section(t, halfW(x), yb, yt, nAt(x), 0)
      return [z * shape((y - yb) / Math.max(0.001, yt - yb)), y]
    }),
    paint,
  )
  lowerMesh.castShadow = true
  root.add(lowerMesh)

  // ── Greenhouse: glass all round, roof panel and pillars laid on top ──
  const c0 = glassBase
  const c1 = cowl
  const crest = roofRear + (roofFront - roofRear) * (s.rear === 'fastback' || s.rear === 'ducktail' ? 0.62 : 0.5)
  const arched = s.rear === 'fastback' || s.rear === 'ducktail'
  const roofLine = curve(
    [
      [c0, beltR - 0.01],
      ...(arched ? [[c0 + (roofRear - c0) * 0.45, beltR + (H - beltR) * 0.58]] : s.rear === 'notchback' ? [[c0 + (roofRear - c0) * 0.5, beltR + (H - beltR) * 0.6]] : [[c0 + 0.04, beltR + (H - beltR) * 0.5]]),
      [roofRear, H - (arched ? 0.085 : 0.025)],
      [crest, H],
      [roofFront, H - 0.025],
      [roofFront + (c1 - roofFront) * 0.5, belt + greenhouse * 0.52],
      [c1, belt - 0.01],
    ],
  )
  const cabinHW = hwMax * (s.bodyStyle === 'van' || s.bodyStyle === 'pickup' ? 0.93 : 0.9)
  const cabinPlan = (x: number) => {
    const len = c1 - c0
    const t = Math.min(1, Math.abs((2 * (x - c0)) / len - 1))
    return cabinHW * Math.pow(Math.max(0, 1 - Math.pow(t, 9)), 1 / 9)
  }
  const cabinAt = (x: number, t: number) => section(t, cabinPlan(x), beltAt(x) - 0.07, Math.max(beltAt(x) - 0.06, roofLine(x)), 7, 0.24)
  const cxs = Array.from({ length: 161 }, (_, i) => c0 + ((c1 - c0) * i) / 160)
  const cabin = new THREE.Mesh(loft(cxs, 72, cabinAt), m.glass)
  cabin.castShadow = true
  root.add(cabin)

  const over = (k: number) => (x: number, t: number): [number, number] => {
    const [z, y] = cabinAt(x, t)
    return [z * (1 + k) + Math.sign(z) * 0.0015, y + 0.0025 + k * 0.2]
  }
  const span = (a: number, b: number, n = 48) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n)
  const TOP = Math.PI / 2
  // Roof panel between the windscreen header and the rear header.
  root.add(new THREE.Mesh(strip(span(roofRear + 0.04, roofFront - 0.06), TOP - 1.02, TOP + 1.02, 30, over(0.004)), m.roof))
  // A-pillars (body colour unless the roof is blacked out), and the C/D-pillars on hatches, SUVs and saloons.
  const pillarMat = s.roof === 'body' ? paint : m.gloss
  for (const sgn of [1, -1]) {
    const a0 = sgn > 0 ? TOP - 1.3 : TOP + 1.02
    root.add(new THREE.Mesh(strip(span(roofFront - 0.08, c1 - 0.02, 30), a0, a0 + 0.28, 6, over(0.005)), pillarMat))
    if (s.rear !== 'bed') {
      const cMat = s.extras.includes('blade') ? m.contrast : s.extras.includes('chromeDPillar') ? m.chrome : pillarMat
      const w = s.rear === 'squared' || s.rear === 'hatch' ? 0.42 : 0.34
      const b0 = sgn > 0 ? TOP - 1.02 - w : TOP + 1.02
      root.add(new THREE.Mesh(strip(span(c0 + 0.03, roofRear + (arched ? 0.05 : 0.22), 30), b0, b0 + w, 8, over(0.005)), cMat))
    }
    // B-pillar: a black band between the doors.
    const bx = (roofRear + roofFront) / 2 + 0.08
    const bp = strip(span(bx - 0.045, bx + 0.045, 4), sgn > 0 ? TOP - 1.45 : TOP + 0.98, sgn > 0 ? TOP - 0.98 : TOP + 1.45, 12, over(0.004))
    root.add(new THREE.Mesh(bp, m.gloss))
  }
  if (s.extras.includes('chromeArc')) {
    for (const sgn of [1, -1]) {
      const a = sgn > 0 ? TOP - 1.05 : TOP + 1.05
      const pts = span(c0 + 0.1, roofFront, 30).map((x) => {
        const [z, y] = over(0.01)(x, a)
        return new THREE.Vector3(x, y, z)
      })
      tube(root, pts, 0.008, m.chrome)
    }
  }

  // ── Wheels and arch liners ──
  buildWheels(root, s, m, ra, fa, R, (ax) => halfW(ax) * 0.985)

  // ── Surface finders for lamps and trim ──
  /** Front-most point of the body at (y, z), pushed 5 mm out of the paint. */
  const front = (y: number, z: number): THREE.Vector3 | null => {
    // Start ahead of the front wheel arch (its top is above lamp height).
    let lo = Math.min(L - 0.05, fa + R + 0.02)
    let hi = L
    if (!inside(lo, y, z)) return null
    for (let i = 0; i < 28; i++) {
      const mid = (lo + hi) / 2
      if (inside(mid, y, z)) lo = mid
      else hi = mid
    }
    return push(new THREE.Vector3(lo, y, z), 1)
  }
  const back = (y: number, z: number): THREE.Vector3 | null => {
    let lo = 0
    let hi = Math.max(0.05, ra - R - 0.02)
    if (!inside(hi, y, z)) return null
    for (let i = 0; i < 28; i++) {
      const mid = (lo + hi) / 2
      if (inside(mid, y, z)) hi = mid
      else lo = mid
    }
    return push(new THREE.Vector3(hi, y, z), -1)
  }
  const side = (x: number, y: number, sgn: number, out = 0.004) => new THREE.Vector3(x, y, sgn * (Math.max(0, zAt(x, y)) + out))
  function push(p: THREE.Vector3, dir: number) {
    const k = THREE.MathUtils.smoothstep(Math.abs(p.z) / hwMax, 0.72, 1)
    return p.add(new THREE.Vector3(dir * (1 - k), 0, Math.sign(p.z) * k).normalize().multiplyScalar(0.005))
  }
  const onFront = (pts: [number, number][]) => pts.map(([y, z]) => front(y, z)).filter((p): p is THREE.Vector3 => !!p)
  const onBack = (pts: [number, number][]) => pts.map(([y, z]) => back(y, z)).filter((p): p is THREE.Vector3 => !!p)
  const zs = (a: number, b: number, n = 24) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n)
  const mirrorZ = <T,>(f: (sgn: number) => T) => [1, -1].map(f)

  // ── Headlamps ──
  const yh = hoodFrontH - 0.07
  const lampIn = hwMax * 0.42
  const lampOut = hwMax - 0.012
  const lampH = 0.07
  const housing = (y0: number, y1: number, z0: number, z1: number, mat = m.lampHousing) =>
    mirrorZ((sgn) => root.add(patch(front, (u, v) => [y0 + (y1 - y0) * v, sgn * (z0 + (z1 - z0) * u)], 18, 4, mat)))
  const slimLine = (y: number, z0: number, z1: number, rise = 0.03, rad = 0.011) =>
    mirrorZ((sgn) => tube(root, onFront(zs(z0, z1).map((z) => [y + rise * ((z - z0) / (z1 - z0)) ** 2, sgn * z])), rad, m.lamp))

  switch (s.head) {
    case 'slim':
      housing(yh - lampH / 2, yh + lampH / 2, lampIn, lampOut)
      slimLine(yh + lampH / 2 - 0.012, lampIn + 0.02, lampOut - 0.01)
      break
    case 'bar':
      housing(yh - 0.03, yh + 0.025, lampIn + 0.05, lampOut)
      slimLine(yh + 0.012, lampIn, lampOut - 0.01, 0.015)
      tube(root, onFront(zs(-lampIn, lampIn, 40).map((z) => [yh + 0.012, z])), 0.008, m.lamp)
      break
    case 'pixel':
      housing(yh - 0.06, yh + 0.035, hwMax * 0.55, lampOut)
      mirrorZ((sgn) => {
        for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
          const z0 = hwMax * 0.6 + i * 0.07
          const y0 = yh - 0.045 + j * 0.045
          root.add(patch(front, (u, v) => [y0 + 0.028 * v, sgn * (z0 + 0.045 * u)], 3, 2, m.lamp, 0.002))
        }
      })
      break
    case 'split': {
      slimLine(yh + 0.03, lampIn, lampOut - 0.01, 0.01, 0.009)
      const yl = cl + 0.42
      housing(yl, yl + 0.1, hwMax * 0.55, lampOut - 0.02)
      mirrorZ((sgn) => root.add(patch(front, (u, v) => [yl + 0.035 + 0.035 * v, sgn * (hwMax * 0.62 + hwMax * 0.25 * u)], 6, 2, m.lamp, 0.002)))
      break
    }
    case 'boomerang':
      housing(yh - 0.08, yh + 0.03, lampIn + 0.04, lampOut)
      mirrorZ((sgn) => {
        const zOut = lampOut - 0.02
        const pts: [number, number][] = [...zs(lampIn + 0.06, zOut, 16).map((z) => [yh + 0.015, sgn * z] as [number, number]), ...zs(0, 1, 8).map((v) => [yh + 0.015 - 0.1 * v, sgn * (zOut - 0.03 * v)] as [number, number])]
        tube(root, onFront(pts), 0.009, m.lamp)
      })
      break
    case 'round':
      mirrorZ((sgn) => {
        const zc = hwMax * 0.6
        const ry = 0.05
        const rz = 0.085
        root.add(patch(front, (u, v) => [yh - 0.01 + Math.sin(u * Math.PI * 2) * ry * Math.max(0.05, v), sgn * (zc + Math.cos(u * Math.PI * 2) * rz * Math.max(0.05, v))], 24, 3, m.lampHousing))
        tube(root, onFront(zs(0, Math.PI * 2, 32).map((a) => [yh - 0.01 + Math.sin(a) * ry, sgn * (zc + Math.cos(a) * rz)])), 0.007, m.lamp)
      })
      break
    case 'hammerhead':
      mirrorZ((sgn) => {
        const z0 = lampIn + 0.02
        const pts: [number, number][] = [...zs(0, 1, 6).map((v) => [yh - 0.07 + 0.08 * v, sgn * z0] as [number, number]), ...zs(z0, lampOut - 0.01, 18).map((z) => [yh + 0.01 + 0.02 * ((z - z0) / (lampOut - z0)), sgn * z] as [number, number])]
        tube(root, onFront(pts), 0.01, m.lamp)
      })
      housing(yh - 0.02, yh + 0.035, lampIn + 0.05, lampOut)
      break
    case 'stacked':
      mirrorZ((sgn) => {
        for (let k = 0; k < 4; k++) root.add(patch(front, (u, v) => [yh - 0.14 + k * 0.045 + 0.03 * v, sgn * (lampOut - 0.07 + 0.045 * u)], 2, 2, m.lamp, 0.002))
        tube(root, onFront(zs(0, 1, 8).map((v) => [yh - 0.15 + 0.2 * v, sgn * (lampOut - 0.1)])), 0.006, m.lamp)
      })
      tube(root, onFront(zs(-hwMax * 0.8, hwMax * 0.8, 40).map((z) => [yh + 0.04, z])), 0.006, m.lamp)
      break
    case 'cclamp':
      housing(yh - 0.12, yh + 0.03, hwMax * 0.62, lampOut)
      mirrorZ((sgn) => {
        const zi = hwMax * 0.66
        const zo = lampOut - 0.02
        const pts: [number, number][] = [...zs(zo, zi, 8).map((z) => [yh + 0.015, sgn * z] as [number, number]), ...zs(0, 1, 6).map((v) => [yh + 0.015 - 0.12 * v, sgn * zi] as [number, number]), ...zs(zi, zo, 8).map((z) => [yh - 0.105, sgn * z] as [number, number])]
        tube(root, onFront(pts), 0.011, m.lamp)
      })
      tube(root, onFront(zs(-hwMax * 0.62, hwMax * 0.62, 40).map((z) => [yh - 0.045, z])), 0.008, m.lamp)
      break
  }

  // ── Grille, intake, nose ──
  const intake = (y0: number, y1: number, wTop: number, wBot: number, mat = m.mesh) => root.add(patch(front, (u, v) => [y0 + (y1 - y0) * v, (u * 2 - 1) * (wBot + (wTop - wBot) * v)], 30, 6, mat))
  const bumperLow = cl + 0.13
  switch (s.grille) {
    case 'none':
    case 'closed':
      intake(bumperLow, bumperLow + 0.12, hwMax * 0.55, hwMax * 0.5)
      if (s.grille === 'closed') tube(root, onFront(zs(-hwMax * 0.3, hwMax * 0.3, 20).map((z) => [yh - 0.11, z])), 0.005, m.gloss)
      break
    case 'vmotion': {
      root.add(patch(front, (u, v) => [yh - 0.22 + 0.17 * v, (u * 2 - 1) * hwMax * (0.22 + 0.1 * v)], 20, 6, m.gloss))
      mirrorZ((sgn) => tube(root, onFront(zs(0, 1, 12).map((v) => [yh - 0.24 + 0.2 * v, sgn * hwMax * (0.04 + 0.3 * v)])), 0.009, m.chrome))
      intake(bumperLow, bumperLow + 0.09, hwMax * 0.5, hwMax * 0.45)
      break
    }
    case 'trapezoid':
      intake(bumperLow, yh - 0.1, hwMax * 0.42, hwMax * 0.62)
      break
    case 'shield':
      intake(bumperLow + 0.05, yh - 0.04, hwMax * 0.48, hwMax * 0.46, m.gloss)
      mirrorZ((sgn) => tube(root, onFront([...zs(0, 1, 6).map((v) => [yh - 0.02, sgn * hwMax * (0.5 + 0.38 * v)] as [number, number]), ...zs(0, 1, 10).map((v) => [yh - 0.02 - 0.32 * v, sgn * hwMax * (0.88 - 0.36 * v * v)] as [number, number])]), 0.016, m.chrome))
      break
    case 'band':
      root.add(patch(front, (u, v) => [yh - 0.06 + 0.1 * v, (u * 2 - 1) * hwMax * 0.95], 36, 4, m.gloss))
      intake(bumperLow, bumperLow + 0.13, hwMax * 0.58, hwMax * 0.5)
      break
  }

  // ── Tail lamps ──
  const yt = (s.rear === 'notchback' || s.rear === 'ducktail' ? deck : s.rear === 'bed' ? belt - 0.1 : beltR) - 0.07
  const tIn = hwMax * 0.5
  const tOut = hwMax - 0.012
  const tailHousing = (y0: number, y1: number, z0: number, z1: number) => mirrorZ((sgn) => root.add(patch(back, (u, v) => [y0 + (y1 - y0) * v, sgn * (z0 + (z1 - z0) * u)], 16, 4, m.tailHousing)))
  const fullBar = (y: number, rad = 0.011) => tube(root, onBack(zs(-tOut + 0.02, tOut - 0.02, 50).map((z) => [y, z])), rad, m.tail)
  switch (s.tail) {
    case 'bar':
      root.add(patch(back, (u, v) => [yt - 0.025 + 0.05 * v, (u * 2 - 1) * (tOut - 0.01)], 50, 3, m.tailHousing))
      fullBar(yt)
      break
    case 'pixel':
      root.add(patch(back, (u, v) => [yt - 0.04 + 0.08 * v, (u * 2 - 1) * (tOut - 0.01)], 50, 3, m.gloss))
      mirrorZ((sgn) => {
        for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) root.add(patch(back, (u, v) => [yt - 0.03 + j * 0.032 + 0.024 * v, sgn * (tOut - 0.05 - i * 0.05 + 0.03 * u)], 2, 2, m.tail, -0.002))
      })
      break
    case 'boomerang':
      fullBar(yt + 0.02, 0.007)
      mirrorZ((sgn) => tube(root, onBack([...zs(tIn, tOut - 0.015, 14).map((z) => [yt + 0.02, sgn * z] as [number, number]), ...zs(0, 1, 6).map((v) => [yt + 0.02 - 0.09 * v, sgn * (tOut - 0.015 - 0.04 * v)] as [number, number])]), 0.012, m.tail))
      break
    case 'cshape':
      tailHousing(yt - 0.08, yt + 0.03, tIn + 0.05, tOut)
      mirrorZ((sgn) => tube(root, onBack([...zs(tIn + 0.1, tOut - 0.02, 10).map((z) => [yt + 0.015, sgn * z] as [number, number]), ...zs(0, 1, 6).map((v) => [yt + 0.015 - 0.08 * v, sgn * (tOut - 0.02)] as [number, number]), ...zs(tOut - 0.02, tIn + 0.1, 10).map((z) => [yt - 0.065, sgn * z] as [number, number])]), 0.009, m.tail))
      break
    case 'vertical':
      mirrorZ((sgn) => {
        root.add(patch(back, (u, v) => [yt - 0.2 + 0.32 * v, sgn * (tOut - 0.1 + 0.095 * u)], 4, 10, m.tailHousing))
        tube(root, onBack(zs(0, 1, 10).map((v) => [yt - 0.19 + 0.3 * v, sgn * (tOut - 0.035)])), 0.01, m.tail)
      })
      break
    case 'tribar':
      root.add(patch(back, (u, v) => [yt - 0.06 + 0.09 * v, (u * 2 - 1) * (tOut - 0.01)], 50, 3, m.gloss))
      mirrorZ((sgn) => {
        for (let k = 0; k < 3; k++) tube(root, onBack(zs(0, 1, 4).map((v) => [yt - 0.05 + 0.07 * v, sgn * (tOut - 0.05 - k * 0.055)])), 0.009, m.tail)
      })
      break
    case 'wrap':
      tailHousing(yt - 0.06, yt + 0.025, tIn, tOut)
      mirrorZ((sgn) => tube(root, onBack(zs(tIn + 0.03, tOut - 0.015, 14).map((z) => [yt + 0.005, sgn * z])), 0.009, m.tail))
      break
  }
  // Reverse-light strip/rear diffuser in black low on the bumper.
  root.add(patch(back, (u, v) => [cl + 0.12 + 0.07 * v, (u * 2 - 1) * hwMax * 0.6], 24, 3, m.trim))

  // ── Side trim: door seams, sills, cladding, crease ──
  const seam = (x: number, lean: number) =>
    mirrorZ((sgn) => tube(root, zs(0, 1, 10).map((v) => side(x - lean * v, cl + 0.2 + (beltAt(x) - cl - 0.24) * v, sgn, 0.0015)), 0.0028, m.trim))
  const doorFront = fa - R - 0.1
  const doorRear = s.rear === 'bed' ? bedTo + 0.15 : ra + R + 0.08
  const bX = (roofRear + roofFront) / 2 + 0.08
  seam(doorFront, -0.03)
  seam(bX, 0)
  seam(doorRear, 0.04)
  // Flush door handles.
  for (const x of [bX + 0.18, doorRear + 0.18]) mirrorZ((sgn) => tube(root, [side(x, beltAt(x) - 0.1, sgn, 0.003), side(x + 0.14, beltAt(x) - 0.1, sgn, 0.003)], 0.009, s.roof === 'body' ? paint : m.gloss))
  // Sills.
  const sillLen = WB - 2 * R - 0.04
  mirrorZ((sgn) => tube(root, zs(ra + R + 0.02, ra + R + 0.02 + sillLen, 20).map((x) => side(x, cl + 0.08, sgn, 0.002)), s.extras.includes('cladding') ? 0.045 : 0.03, m.trim))
  if (s.extras.includes('cladding')) {
    for (const ax of [ra, fa])
      mirrorZ((sgn) =>
        tube(
          root,
          zs(0.12, Math.PI - 0.12, 24).map((a) => {
            const x = ax + Math.cos(a) * (R + 0.02)
            const y = r + Math.sin(a) * (R + 0.02)
            return side(x, y, sgn, 0.006)
          }),
          0.032,
          m.trim,
        ),
      )
  }
  // Shoulder character line, front fender to tail lamp.
  mirrorZ((sgn) => tube(root, zs(0.25, L - 0.55, 40).map((x) => side(x, beltAt(x) - 0.16 + (s.rake === 'steep' ? 0.04 * (1 - x / L) : 0), sgn, -0.001)), 0.005, paint))
  if (s.extras.includes('zCrease')) mirrorZ((sgn) => tube(root, zs(0, 1, 20).map((v) => side(doorRear + 0.1 + (doorFront - doorRear - 0.2) * v, cl + 0.28 + 0.3 * v, sgn, 0.001)), 0.006, paint))

  // ── Mirrors ──
  mirrorZ((sgn) => {
    const mx = c1 - 0.16
    const g = new THREE.Group()
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.08, 20, 14), s.roof === 'body' ? paint : m.gloss)
    cap.scale.set(1.2, 0.68, 1.15)
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.08), m.trim)
    stalk.position.set(0.03, -0.035, -sgn * 0.07)
    g.add(cap, stalk)
    g.position.set(mx, belt + 0.05, sgn * (Math.max(cabinPlan(mx), zAt(mx, belt - 0.03)) + 0.07))
    root.add(g)
  })

  // ── Roof spoilers, rails ──
  const roofW = cabinPlan((roofRear + roofFront) / 2)
  if (s.extras.includes('roofSpoiler') && (s.rear === 'hatch' || s.rear === 'squared' || s.rear === 'fastback')) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, roofW * 1.75), s.roof === 'body' ? paint : m.gloss)
    sp.position.set(roofRear - 0.05, roofLine(roofRear) - 0.012, 0)
    sp.rotation.z = 0.12
    root.add(sp)
  }
  if (s.extras.includes('splitSpoiler')) {
    const x = s.rear === 'ducktail' ? 0.06 : Math.max(0.05, roofRear - 0.1)
    const y = s.rear === 'ducktail' ? tailTop + 0.02 : roofLine(roofRear) + 0.01
    mirrorZ((sgn) => {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.022, roofW * 0.55), s.roof === 'body' ? paint : m.gloss)
      sp.position.set(x, y, sgn * roofW * 0.42)
      root.add(sp)
    })
  }
  if (s.extras.includes('roofRails'))
    mirrorZ((sgn) =>
      tube(
        root,
        span(roofRear + 0.12, roofFront - 0.12, 12).map((x) => new THREE.Vector3(x, roofLine(x) + 0.035, sgn * cabinPlan(x) * 0.66)),
        0.016,
        m.gloss,
      ),
    )

  // ── Pickup bed ──
  if (s.rear === 'bed') {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(bedTo - 0.14, 0.04, W - 0.26), m.trim)
    bed.position.set(0.08 + (bedTo - 0.14) / 2, deck - 0.01, 0)
    root.add(bed)
    // Tailgate seam.
    tube(root, onBack(zs(-tOut + 0.05, tOut - 0.05, 20).map((z) => [deck - 0.03, z])), 0.003, m.trim)
  }

  // Centre on the origin.
  root.children.forEach((c) => (c.position.x -= L / 2))
  return { belt, H, L }
}

function buildWheels(root: THREE.Group, s: BuildSpec, m: Mats, ra: number, fa: number, R: number, bodyHW: (ax: number) => number) {
  const r = s.tyreR
  const rimR = s.rimR
  const tw = s.tyreW
  const tyreProfile: THREE.Vector2[] = []
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * Math.PI
    tyreProfile.push(new THREE.Vector2(rimR + Math.sin(a) * (r - rimR), -tw / 2 + (1 - Math.cos(a)) * 0.5 * tw))
  }
  const tyreGeo = new THREE.LatheGeometry(tyreProfile, 56)
  tyreGeo.rotateX(Math.PI / 2)
  const barrelGeo = new THREE.CylinderGeometry(rimR, rimR, tw * 0.82, 40, 1, true)
  barrelGeo.rotateX(Math.PI / 2)
  const discGeo = new THREE.CylinderGeometry(rimR * 0.62, rimR * 0.62, 0.03, 32)
  discGeo.rotateX(Math.PI / 2)
  const lipGeo = new THREE.TorusGeometry(rimR - 0.006, 0.012, 8, 56)
  const hubGeo = new THREE.CylinderGeometry(rimR * 0.2, rimR * 0.22, 0.05, 24)
  hubGeo.rotateX(Math.PI / 2)
  const linerGeo = new THREE.CylinderGeometry(R - 0.005, R - 0.005, s.W - 0.12, 40, 1, true, -Math.PI / 2, Math.PI)
  linerGeo.rotateX(Math.PI / 2)
  linerGeo.rotateZ(Math.PI / 2)

  const face = () => {
    const f = new THREE.Group()
    f.add(new THREE.Mesh(discGeo, m.disc))
    const spoke = (w: number, len: number, mat: THREE.Material, a: number) => {
      const g = new THREE.BoxGeometry(len, w, 0.03)
      g.translate(rimR * 0.2 + len / 2, 0, 0)
      const sp = new THREE.Mesh(g, mat)
      sp.rotation.z = a
      sp.position.z = 0.025
      f.add(sp)
    }
    const len = rimR * 0.8
    switch (s.wheel) {
      case 'aero': {
        // Near-flat aero disc with short slots.
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(rimR * 0.98, rimR * 0.98, 0.02, 48), m.rimDark)
        plate.rotation.x = Math.PI / 2
        plate.position.z = 0.02
        f.add(plate)
        for (let k = 0; k < 5; k++) {
          const g = new THREE.BoxGeometry(rimR * 0.5, rimR * 0.14, 0.02)
          g.translate(rimR * 0.55, 0, 0)
          const sl = new THREE.Mesh(g, m.rim)
          sl.rotation.z = (k / 5) * Math.PI * 2
          sl.position.z = 0.032
          f.add(sl)
        }
        break
      }
      case 'spoke5':
        for (let k = 0; k < 5; k++) spoke(rimR * 0.3, len, m.rim, (k / 5) * Math.PI * 2)
        break
      case 'twin':
        for (let k = 0; k < 5; k++) for (const o of [-0.13, 0.13]) spoke(rimR * 0.12, len, m.rim, (k / 5) * Math.PI * 2 + o)
        break
      case 'multi':
        for (let k = 0; k < 10; k++) spoke(rimR * 0.1, len, m.rim, (k / 10) * Math.PI * 2)
        break
    }
    const hub = new THREE.Mesh(hubGeo, m.rim)
    hub.position.z = 0.04
    const lip = new THREE.Mesh(lipGeo, m.rim)
    lip.position.z = 0.035
    f.add(hub, lip)
    return f
  }

  for (const ax of [ra, fa]) {
    const well = new THREE.Mesh(linerGeo, m.liner)
    well.position.set(ax, r, 0)
    root.add(well)
    for (const sgn of [-1, 1]) {
      const wheel = new THREE.Group()
      const t = new THREE.Mesh(tyreGeo, m.tyre)
      t.castShadow = true
      wheel.add(t, new THREE.Mesh(barrelGeo, m.trim))
      const f = face()
      f.position.z = sgn * (tw * 0.36)
      if (sgn < 0) f.rotation.y = Math.PI
      wheel.add(f)
      wheel.position.set(ax, r, sgn * (bodyHW(ax) - tw / 2 - 0.008))
      root.add(wheel)
    }
  }
}

// ── Geometry helpers ─────────────────────────────────────────────────────

/** Smooth interpolation through (x, y) points that never overshoots the neighbouring points. */
export function curve(pts: number[][]): (x: number) => number {
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
    const t2 = t * t
    const t3 = t2 * t
    const y = 0.5 * (2 * y1 + (-y0 + y2) * t + (2 * y0 - 5 * y1 + 4 * y2 - y3) * t2 + (-y0 + 3 * y1 - 3 * y2 + y3) * t3)
    return Math.min(Math.max(y, Math.min(y1, y2) - 0.015), Math.max(y1, y2) + 0.015)
  }
}

/** Rounded-box cross-section (superellipse, exponent n) at angle t, narrowing toward the top by `taper`. Returns [z, y]. */
export function section(t: number, hw: number, yb: number, yt: number, n: number, taper: number): [number, number] {
  const c = Math.cos(t)
  const s = Math.sin(t)
  const e = 2 / n
  const y = (yb + yt) / 2 + ((yt - yb) / 2) * Math.sign(s) * Math.pow(Math.abs(s), e)
  const up = (y - yb) / Math.max(0.001, yt - yb)
  const z = hw * Math.sign(c) * Math.pow(Math.abs(c), e) * (1 - taper * up * up)
  return [z, y]
}

/** Sweep a cross-section along x into a smoothly shaded surface (ends closed). */
export function loft(xs: number[], around: number, at: (x: number, t: number) => [number, number]): THREE.BufferGeometry {
  const pos: number[] = []
  const idx: number[] = []
  const ring = around + 1
  xs.forEach((x) => {
    for (let j = 0; j <= around; j++) {
      const [z, y] = at(x, (j / around) * Math.PI * 2)
      pos.push(x, y, z)
    }
  })
  for (let i = 0; i < xs.length - 1; i++)
    for (let j = 0; j < around; j++) {
      const a = i * ring + j
      const b = a + ring
      idx.push(a, b, a + 1, a + 1, b, b + 1)
    }
  for (const [i, flip] of [[0, true], [xs.length - 1, false]] as const) {
    let cy = 0
    for (let j = 0; j < around; j++) cy += pos[(i * ring + j) * 3 + 1]
    const centre = pos.length / 3
    pos.push(xs[i], cy / around, 0)
    for (let j = 0; j < around; j++) {
      const a = i * ring + j
      if (flip) idx.push(centre, a, a + 1)
      else idx.push(centre, a + 1, a)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** An open band of the cross-section between angles t0..t1, swept along x. */
export function strip(xs: number[], t0: number, t1: number, steps: number, at: (x: number, t: number) => [number, number]): THREE.BufferGeometry {
  const pos: number[] = []
  const idx: number[] = []
  const ring = steps + 1
  xs.forEach((x) => {
    for (let j = 0; j <= steps; j++) {
      const [z, y] = at(x, t0 + ((t1 - t0) * j) / steps)
      pos.push(x, y, z)
    }
  })
  for (let i = 0; i < xs.length - 1; i++)
    for (let j = 0; j < steps; j++) {
      const a = i * ring + j
      const b = a + ring
      idx.push(a, b, a + 1, a + 1, b, b + 1)
    }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** A thin rounded line through points (lamp signatures, seams, chrome). */
function tube(root: THREE.Group, pts: THREE.Vector3[], radius: number, mat: THREE.Material) {
  if (pts.length < 2) return
  const path = new THREE.CatmullRomCurve3(pts, false, 'centripetal')
  root.add(new THREE.Mesh(new THREE.TubeGeometry(path, Math.max(8, pts.length * 3), radius, 8, false), mat))
}

/** A panel that follows the body: (u, v) in 0..1 → (y, z), placed on the surface by `onto`, lifted along x by `lift`. */
function patch(onto: (y: number, z: number) => THREE.Vector3 | null, f: (u: number, v: number) => [number, number], nu: number, nv: number, mat: THREE.Material, lift = 0) {
  const pos: number[] = []
  const idx: number[] = []
  const ok: boolean[] = []
  for (let j = 0; j <= nv; j++)
    for (let i = 0; i <= nu; i++) {
      const [y, z] = f(i / nu, j / nv)
      const p = onto(y, z)
      ok.push(!!p)
      if (p) p.x += lift
      pos.push(p?.x ?? 0, p?.y ?? y, p?.z ?? z)
    }
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i
      const b = a + nu + 1
      if (ok[a] && ok[b] && ok[a + 1] && ok[b + 1]) idx.push(a, a + 1, b, a + 1, b + 1, b)
    }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  const mesh = new THREE.Mesh(g, mat)
  return mesh
}
