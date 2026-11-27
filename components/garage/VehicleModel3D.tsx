'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { licensedModelFor } from '@/lib/vehicles/bodyShapes'
import { designFor } from '@/lib/vehicles/designs'
import { buildCar, specFor } from './carBuilder'
import type { BodyStyle, Powertrain } from '@/lib/vehicles/vehicle'

/**
 * The garage's 3D car. Built from the model's published dimensions and design
 * cues when we have them (lib/vehicles/designs.ts), else the body style's
 * typical shape — or a licensed exact-model file when one is listed in
 * bodyShapes.ts. Painted in
 * the owner's colour, with clear-coat paint, reflections and soft shadow.
 * Drag to turn, scroll/pinch to zoom. Stops rendering when off-screen; no
 * auto-spin for visitors who prefer reduced motion.
 */
export default function VehicleModel3D({ bodyStyle, colour, powertrain, make, model, year, height = 360 }: { bodyStyle: BodyStyle; colour: string; powertrain: Powertrain; make?: string; model?: string; year?: number; height?: number }) {
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

    const spec = specFor(designFor(make, model, year), bodyStyle, powertrain)
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
    // Frame the car by its length: front three-quarter view.
    camera.position.copy(new THREE.Vector3(5.4, 2.0, 5.3).normalize().multiplyScalar(spec.L * 1.62))

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.enablePan = false
    controls.minDistance = 4.2
    controls.maxDistance = 13
    controls.minPolarAngle = 0.25
    controls.maxPolarAngle = Math.PI / 2 - 0.04
    controls.target.set(0, spec.H * 0.42, 0)
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
    const licensed = make && model ? licensedModelFor(make, model) : null
    if (licensed) {
      new GLTFLoader().load(
        licensed.url,
        (gltf) => {
          const obj = gltf.scene
          const box = new THREE.Box3().setFromObject(obj)
          const size = box.getSize(new THREE.Vector3())
          obj.scale.setScalar(spec.L / Math.max(size.x, size.z))
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
        () => buildCar(root, spec, paint, disposables),
      )
    } else buildCar(root, spec, paint, disposables)

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
  }, [bodyStyle, powertrain, make, model, year]) // eslint-disable-line react-hooks/exhaustive-deps

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
