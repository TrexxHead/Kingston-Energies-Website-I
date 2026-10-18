'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { BODY_SHAPES, licensedModelFor, type BodyShape } from '@/lib/vehicles/bodyShapes'
import type { BodyStyle, Powertrain } from '@/lib/vehicles/vehicle'

/**
 * The garage's 3D car. Generated from the body style's proportions (or a
 * licensed exact-model file when one is listed in bodyShapes.ts), painted in
 * the owner's colour, with clear-coat paint, reflections and soft shadow.
 * Drag to turn, scroll/pinch to zoom. Stops rendering when off-screen; no
 * auto-spin for visitors who prefer reduced motion.
 */
export default function VehicleModel3D({ bodyStyle, colour, powertrain, make, model, height = 360 }: { bodyStyle: BodyStyle; colour: string; powertrain: Powertrain; make?: string; model?: string; height?: number }) {
  const el = useRef<HTMLDivElement>(null)
  const paintRef = useRef<THREE.MeshPhysicalMaterial | null>(null)
  const [failed, setFailed] = useState(false)

  // Repaint without rebuilding the scene.
  useEffect(() => {
    paintRef.current?.color.set(colour)
  }, [colour])

  useEffect(() => {
    const host = el.current
    if (!host) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
    } catch {
      setFailed(true)
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    host.appendChild(renderer.domElement)
    renderer.domElement.style.display = 'block'
    renderer.domElement.setAttribute('aria-hidden', 'true')

    const scene = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(renderer)
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = envTex

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
    // Frame the car by its length: front three-quarter view.
    camera.position.copy(new THREE.Vector3(5.4, 2.0, 5.3).normalize().multiplyScalar(BODY_SHAPES[bodyStyle].length * 1.62))

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.enablePan = false
    controls.minDistance = 4.2
    controls.maxDistance = 13
    controls.minPolarAngle = 0.25
    controls.maxPolarAngle = Math.PI / 2 - 0.04
    controls.target.set(0, BODY_SHAPES[bodyStyle].height * 0.42, 0)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    controls.autoRotate = !reduce
    controls.autoRotateSpeed = 0.9
    // Stop spinning once the visitor takes over.
    controls.addEventListener('start', () => (controls.autoRotate = false))

    scene.add(new THREE.HemisphereLight(0xffffff, 0x223322, 0.6))
    const sun = new THREE.DirectionalLight(0xffffff, 2.2)
    sun.position.set(4, 8, 5)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.left = -4
    sun.shadow.camera.right = 4
    sun.shadow.camera.top = 4
    sun.shadow.camera.bottom = -4
    sun.shadow.radius = 6
    scene.add(sun)

    // Floor: a soft disc that catches the shadow, plus a contact-shadow blob.
    const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 64), new THREE.ShadowMaterial({ opacity: 0.28 }))
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.4), new THREE.MeshBasicMaterial({ map: radialTexture(), transparent: true, depthWrite: false, opacity: 0.75 }))
    blob.rotation.x = -Math.PI / 2
    blob.position.y = 0.002
    scene.add(blob)

    const paint = new THREE.MeshPhysicalMaterial({ color: colour, metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.1 })
    paintRef.current = paint
    const disposables: { dispose: () => void }[] = [envTex, pmrem, floor.geometry, floor.material as THREE.Material, blob.geometry, blob.material as THREE.Material, paint]

    const root = new THREE.Group()
    scene.add(root)
    const shape = BODY_SHAPES[bodyStyle]
    const licensed = make && model ? licensedModelFor(make, model) : null
    if (licensed) {
      new GLTFLoader().load(
        licensed.url,
        (gltf) => {
          const obj = gltf.scene
          const box = new THREE.Box3().setFromObject(obj)
          const size = box.getSize(new THREE.Vector3())
          obj.scale.setScalar(shape.length / Math.max(size.x, size.z))
          box.setFromObject(obj)
          obj.position.sub(box.getCenter(new THREE.Vector3())).setY(-box.min.y)
          obj.traverse((o) => {
            const m = o as THREE.Mesh
            if (!m.isMesh) return
            m.castShadow = true
            const mat = m.material as THREE.MeshStandardMaterial
            if (mat && /paint|body|carpaint/i.test(mat.name)) m.material = paint
          })
          root.add(obj)
        },
        undefined,
        () => buildCar(root, shape, paint, powertrain, disposables),
      )
    } else buildCar(root, shape, paint, powertrain, disposables)

    const resize = () => {
      const w = host.clientWidth
      const h = host.clientHeight
      renderer.setSize(w, h, false)
      renderer.domElement.style.width = '100%'
      renderer.domElement.style.height = '100%'
      camera.aspect = w / Math.max(1, h)
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(host)

    let visible = true
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(host)
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (!visible || document.hidden) return
      controls.update()
      renderer.render(scene, camera)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      controls.dispose()
      root.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.isMesh) {
          m.geometry.dispose()
          const mats = Array.isArray(m.material) ? m.material : [m.material]
          mats.forEach((x) => x !== paint && x.dispose())
        }
      })
      disposables.forEach((d) => d.dispose())
      renderer.dispose()
      renderer.domElement.remove()
      paintRef.current = null
    }
    // colour is applied by the effect above; rebuild only when the shape changes.
  }, [bodyStyle, powertrain, make, model]) // eslint-disable-line react-hooks/exhaustive-deps

  if (failed)
    return (
      <div style={{ height, display: 'grid', placeItems: 'center', color: 'var(--ke-dark-text-muted)', fontSize: 14 }}>
        3D view isn’t available in this browser.
      </div>
    )
  return <div ref={el} style={{ height, width: '100%', touchAction: 'none', cursor: 'grab' }} role="img" aria-label={`3D model of a ${bodyStyle}${make ? ` (${make} ${model ?? ''})` : ''}, drag to turn`} />
}

/** Soft dark ellipse for under-car contact shadow. */
function radialTexture(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(0,0,0,0.85)')
  grad.addColorStop(0.55, 'rgba(0,0,0,0.35)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/**
 * Build the car from lofted surfaces: rounded cross-sections swept along the
 * length, so paint reflections run smoothly. The lower body's underside rises
 * over each axle to form real wheel arches; the cabin is a narrower glass
 * loft with a painted roof panel on top.
 */
function buildCar(root: THREE.Group, b: BodyShape, paint: THREE.Material, powertrain: Powertrain, disposables: { dispose: () => void }[]) {
  const L = b.length
  const W = b.width
  const r = b.wheelRadius
  const frontAxle = L - b.frontOverhang
  const rearAxle = frontAxle - b.wheelbase
  const R = r + 0.055
  const X = (f: number) => f * L

  const glass = new THREE.MeshPhysicalMaterial({ color: 0x080c10, metalness: 0.2, roughness: 0.03, clearcoat: 1, envMapIntensity: 1.6 })
  const trim = new THREE.MeshStandardMaterial({ color: 0x15181b, roughness: 0.55, metalness: 0.25 })
  const liner = new THREE.MeshStandardMaterial({ color: 0x0b0c0d, roughness: 0.95, side: THREE.DoubleSide })
  const tyre = new THREE.MeshStandardMaterial({ color: 0x141517, roughness: 0.9 })
  const rim = new THREE.MeshStandardMaterial({ color: 0xd2d6da, metalness: 1, roughness: 0.18 })
  const disc = new THREE.MeshStandardMaterial({ color: 0x5b5f63, metalness: 0.8, roughness: 0.45 })
  const headlight = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xe8f4ff, emissiveIntensity: 2.2, roughness: 0.2 })
  const taillight = new THREE.MeshStandardMaterial({ color: 0x400000, emissive: 0xff2020, emissiveIntensity: 1.6, roughness: 0.3 })
  disposables.push(glass, trim, liner, tyre, rim, disc, headlight, taillight)

  // ── Profiles (x in metres from the rear) ──
  const topLine = curve(
    b.bedToX != null
      ? [[0, b.deckH - 0.1], [0.06, b.deckH], [X(b.hoodX), b.belt], [L - 0.34, b.hoodFrontH], [L - 0.08, b.noseH + 0.08], [L, b.noseH - 0.08]]
      : [[0, b.deckH - 0.14], [0.08, b.deckH], [Math.max(0.12, X(b.deckX)), b.deckH], [X(b.rearWinX), b.belt], [X(b.hoodX), b.belt], [L - 0.34, b.hoodFrontH], [L - 0.08, b.noseH + 0.08], [L, b.noseH - 0.08]],
  )
  const baseBottom = curve([[0, b.clearance + 0.26], [0.22, b.clearance + 0.02], [0.5, b.clearance], [L - 0.5, b.clearance], [L - 0.22, b.clearance + 0.03], [L, b.clearance + 0.24]])
  const archTop = (x: number) => {
    for (const ax of [rearAxle, frontAxle]) {
      const d = Math.abs(x - ax)
      if (d < R) return r + Math.sqrt(R * R - d * d)
    }
    return -Infinity
  }
  const bottom = (x: number) => Math.max(baseBottom(x), archTop(x))
  // Plan view: flat sides, rounded nose and tail.
  const halfW = (x: number, w: number, len: number, x0: number, p: number) => {
    const t = Math.min(1, Math.abs((2 * (x - x0)) / len - 1))
    return (w / 2) * Math.pow(Math.max(0, 1 - Math.pow(t, p)), 1 / p)
  }

  // Sample x densely, with exact samples at the arch edges so they stay crisp.
  const xs: number[] = []
  for (let i = 0; i <= 220; i++) xs.push((i / 220) * L)
  for (const ax of [rearAxle, frontAxle]) for (const e of [-R, R]) xs.push(ax + e - 0.0005, ax + e + 0.0005)
  xs.sort((a, c) => a - c)

  const lower = loft(xs, 56, (x, t) => {
    const yb = bottom(x)
    const yt = Math.max(yb + 0.02, topLine(x))
    const hw = halfW(x, W, L, 0, 6.5)
    return section(t, hw, yb, yt, 5, 0.05)
  })
  const lowerMesh = new THREE.Mesh(lower, paint)
  lowerMesh.castShadow = true
  root.add(lowerMesh)

  // Cabin: from the windshield base to the rear-window base.
  const c0 = X(b.rearWinX)
  const c1 = X(b.hoodX)
  const roofLine = curve([
    [c0, b.belt - 0.02],
    [X(b.roofRearX) - (X(b.roofRearX) - c0) * 0.35, (b.belt + b.height) / 2 + (b.height - b.belt) * 0.32],
    [X(b.roofRearX), b.height - 0.01],
    [(X(b.roofRearX) + X(b.roofFrontX)) / 2, b.height + 0.015],
    [X(b.roofFrontX), b.height - 0.01],
    [X(b.roofFrontX) + (c1 - X(b.roofFrontX)) * 0.55, (b.belt + b.height) / 2 + (b.height - b.belt) * 0.12],
    [c1, b.belt - 0.02],
  ])
  const cxs: number[] = []
  for (let i = 0; i <= 120; i++) cxs.push(c0 + (i / 120) * (c1 - c0))
  const cabinW = W * 0.86
  const cabinAt = (x: number, t: number) => {
    const yb = b.belt - 0.06
    const yt = Math.max(yb + 0.01, roofLine(x))
    const hw = halfW(x, cabinW, c1 - c0, c0, 8)
    return section(t, hw, yb, yt, 7, 0.24)
  }
  const cabin = loft(cxs, 64, cabinAt)
  const cabinMesh = new THREE.Mesh(cabin, paint)
  cabinMesh.castShadow = true
  root.add(cabinMesh)

  // Glass laid onto the painted cabin: windscreen, rear window, and side windows split by the B-pillar.
  const out = (x: number, t: number): [number, number] => {
    const [z, y] = cabinAt(x, t)
    return [z * 1.008 + Math.sign(z) * 0.002, y + 0.003]
  }
  const span = (a: number, c: number, n = 40) => Array.from({ length: n + 1 }, (_, i) => a + ((c - a) * i) / n)
  const rf = X(b.roofFrontX)
  const rr = X(b.roofRearX)
  const pillar = rr + (rf - rr) * 0.48
  const glassBands: THREE.BufferGeometry[] = [
    strip(span(rf - 0.05, c1 - 0.06), Math.PI / 2 - 1.05, Math.PI / 2 + 1.05, 36, out),
    ...(c0 < rr - 0.12 ? [strip(span(c0 + 0.06, rr + 0.05), Math.PI / 2 - 1.05, Math.PI / 2 + 1.05, 36, out)] : []),
  ]
  for (const [a, c] of [[Math.max(c0 + 0.05, rr - 0.25), pillar - 0.05], [pillar + 0.05, Math.min(c1 - 0.12, rf + 0.18)]])
    for (const mid of [0, Math.PI]) glassBands.push(strip(span(a, c), mid - 0.78, mid + 0.78, 20, out))
  for (const g of glassBands) root.add(new THREE.Mesh(g, glass))

  // Pickup bed well.
  if (b.bedToX != null) {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(X(b.bedToX) - 0.26, 0.05, W - 0.34), trim)
    bed.position.set(0.16 + (X(b.bedToX) - 0.26) / 2, b.deckH + 0.005, 0)
    root.add(bed)
  }

  // ── Wheels, with dark arch liners so you can't see through the wells ──
  const tw = 0.235
  const tyreProfile: THREE.Vector2[] = []
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI
    tyreProfile.push(new THREE.Vector2(r * 0.7 + Math.sin(a) * r * 0.3, -tw / 2 + (1 - Math.cos(a)) * 0.5 * tw))
  }
  const tyreGeo = new THREE.LatheGeometry(tyreProfile, 48)
  tyreGeo.rotateX(Math.PI / 2)
  const barrelGeo = new THREE.CylinderGeometry(r * 0.7, r * 0.7, tw * 0.8, 40, 1, true)
  barrelGeo.rotateX(Math.PI / 2)
  const discGeo = new THREE.CylinderGeometry(r * 0.48, r * 0.48, 0.03, 32)
  discGeo.rotateX(Math.PI / 2)
  const spokeGeo = new THREE.BoxGeometry(r * 0.62, 0.055, 0.035)
  spokeGeo.translate(r * 0.33, 0, 0)
  const hubGeo = new THREE.CylinderGeometry(r * 0.15, r * 0.17, 0.05, 24)
  hubGeo.rotateX(Math.PI / 2)
  const rimLipGeo = new THREE.TorusGeometry(r * 0.69, 0.018, 8, 48)
  const linerGeo = new THREE.CylinderGeometry(R - 0.005, R - 0.005, W - 0.12, 40, 1, true, -Math.PI / 2, Math.PI)
  linerGeo.rotateX(Math.PI / 2)
  linerGeo.rotateZ(Math.PI / 2)
  for (const ax of [rearAxle, frontAxle]) {
    const well = new THREE.Mesh(linerGeo, liner)
    well.position.set(ax, r, 0)
    root.add(well)
    for (const side of [-1, 1]) {
      const wheel = new THREE.Group()
      const t = new THREE.Mesh(tyreGeo, tyre)
      t.castShadow = true
      wheel.add(t, new THREE.Mesh(barrelGeo, trim))
      const face = new THREE.Group()
      face.add(new THREE.Mesh(discGeo, disc))
      for (let k = 0; k < 10; k++) {
        const sp = new THREE.Mesh(spokeGeo, rim)
        sp.rotation.z = (k / 10) * Math.PI * 2 + (k % 2 ? 0.12 : 0)
        sp.position.z = 0.03
        face.add(sp)
      }
      const hub = new THREE.Mesh(hubGeo, rim)
      hub.position.z = 0.04
      const lip = new THREE.Mesh(rimLipGeo, rim)
      lip.position.z = 0.04
      face.add(hub, lip)
      face.position.z = side * (tw * 0.36)
      if (side < 0) face.rotation.y = Math.PI
      wheel.add(face)
      const hwAtAxle = halfW(ax, W, L, 0, 6.5)
      wheel.position.set(ax, r, side * (hwAtAxle - tw / 2 - 0.035))
      root.add(wheel)
    }
  }

  // ── Lights, grille, mirrors, side glass trim ──
  const bodyHW = (x: number) => halfW(x, W, L, 0, 6.5)
  // Lamps sit just under the nose's top surface, following its curve in plan.
  const lampX = L - 0.07
  const lampY = topLine(lampX) - 0.055
  for (const side of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.26, 4, 12), headlight)
    hl.rotation.x = Math.PI / 2
    hl.rotation.y = side * 0.42
    hl.position.set(lampX - 0.02, lampY, side * (bodyHW(lampX) - 0.2))
    root.add(hl)
    // Mirror on a short stalk at the front of the side window.
    const mirror = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), paint)
    mirror.scale.set(1.25, 0.7, 1.05)
    const mx = c1 - 0.16
    mirror.position.set(mx, b.belt + 0.05, side * (halfW(mx, cabinW, c1 - c0, c0, 8) + 0.06))
    root.add(mirror)
  }
  if (powertrain === 'bev') {
    // EV light bar across the nose.
    const bar = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, W * 0.48, 4, 8), headlight)
    bar.rotation.x = Math.PI / 2
    bar.position.set(L - 0.009, topLine(L - 0.01) - 0.035, 0)
    root.add(bar)
  }
  const tailX = 0.035
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, Math.max(0.3, 2 * halfW(tailX, W, L, 0, 6.5) - 0.2), 4, 10), taillight)
  tail.rotation.x = Math.PI / 2
  tail.position.set(tailX, topLine(0.08) - 0.08, 0)
  root.add(tail)
  const grille = new THREE.Mesh(new THREE.CapsuleGeometry(powertrain === 'bev' ? 0.03 : 0.07, W * (powertrain === 'bev' ? 0.36 : 0.44), 4, 10), trim)
  grille.rotation.x = Math.PI / 2
  grille.position.set(L - 0.012, b.clearance + 0.24, 0)
  root.add(grille)
  // Black sills between the wheels.
  const sillLen = b.wheelbase - 2 * R - 0.06
  for (const side of [-1, 1]) {
    const sill = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, sillLen, 4, 10), trim)
    sill.rotation.z = Math.PI / 2
    sill.position.set(rearAxle + R + 0.03 + sillLen / 2, b.clearance + 0.07, side * (W / 2 - 0.035))
    root.add(sill)
  }

  // Centre on the origin.
  root.children.forEach((c) => (c.position.x -= L / 2))
}

/** Monotone-ish smooth interpolation through (x, y) points (Catmull–Rom in y over x). */
function curve(pts: number[][]): (x: number) => number {
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
    const t = (x - x1) / (x2 - x1)
    const t2 = t * t
    const t3 = t2 * t
    const y = 0.5 * (2 * y1 + (-y0 + y2) * t + (2 * y0 - 5 * y1 + 4 * y2 - y3) * t2 + (-y0 + 3 * y1 - 3 * y2 + y3) * t3)
    // Keep within the neighbouring points so the line never overshoots into bumps.
    return Math.min(Math.max(y, Math.min(y1, y2) - 0.02), Math.max(y1, y2) + 0.02)
  }
}

/**
 * A rounded-box cross-section (superellipse, exponent n) at angle t,
 * narrowing toward the top by `taper` (tumblehome). Returns [z, y].
 */
function section(t: number, hw: number, yb: number, yt: number, n: number, taper: number): [number, number] {
  const c = Math.cos(t)
  const s = Math.sin(t)
  const e = 2 / n
  const y = (yb + yt) / 2 + ((yt - yb) / 2) * Math.sign(s) * Math.pow(Math.abs(s), e)
  const up = (y - yb) / Math.max(0.001, yt - yb)
  const z = hw * Math.sign(c) * Math.pow(Math.abs(c), e) * (1 - taper * up * up)
  return [z, y]
}

/** Sweep a cross-section along x into an indexed, smoothly shaded surface (ends closed). */
function loft(xs: number[], around: number, at: (x: number, t: number) => [number, number]): THREE.BufferGeometry {
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
      const b2 = a + ring
      idx.push(a, b2, a + 1, a + 1, b2, b2 + 1)
    }
  // Close each end with a fan to its centre.
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

/** An open band of the cross-section between angles t0..t1, swept along x (for the painted roof). */
function strip(xs: number[], t0: number, t1: number, steps: number, at: (x: number, t: number) => [number, number]): THREE.BufferGeometry {
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
      const b2 = a + ring
      idx.push(a, b2, a + 1, a + 1, b2, b2 + 1)
    }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}
