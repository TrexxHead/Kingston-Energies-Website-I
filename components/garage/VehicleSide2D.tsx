import { useId } from 'react'
import { designFor } from '@/lib/vehicles/designs'
import { specFor, type BuildSpec } from '@/lib/vehicles/buildSpec'
import { sideGeometry, mix } from '@/lib/vehicles/sideGeometry'
import type { BodyStyle, Powertrain } from '@/lib/vehicles/vehicle'

/**
 * The garage's car as a 2D side view (SVG), drawn from the same data as the
 * 3D model: the model's published length, height, wheelbase, ground clearance
 * and tyre size set the proportions; its design cues set the lamps, roof,
 * spoiler, cladding and wheels. Painted in the owner's colour with layered
 * gradients for the paint, glass and wheels. An illustration, not a photo.
 *
 * Units are metres (x from the rear bumper to the front, y up); the car faces right.
 */
export default function VehicleSide2D({ bodyStyle, colour, powertrain, make, model, year, height = 300 }: { bodyStyle: BodyStyle; colour: string; powertrain: Powertrain; make?: string; model?: string; year?: number; height?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const s = specFor(designFor(make, model, year), bodyStyle, powertrain)
  const g = sideGeometry(s)
  const { L, H } = s
  const padX = 0.32
  const vb = [-padX, -(H + 0.28), L + padX * 2, H + 0.28 + 0.14]
  const id = (k: string) => `${uid}-${k}`
  const url = (k: string) => `url(#${id(k)})`
  const dark = s.roof !== 'body'
  const paintLight = mix(colour, '#ffffff', 0.38)
  const paintDark = mix(colour, '#000000', 0.5)
  const paintMid = mix(colour, '#000000', 0.12)

  return (
    <svg viewBox={vb.join(' ')} width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Side view of ${make && model ? `a ${make} ${model}` : `a ${bodyStyle}`}`} style={{ display: 'block', width: '100%', height: 'auto', maxHeight: height, margin: '0 auto' }}>
      <defs>
        <linearGradient id={id('paint')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={paintLight} />
          <stop offset="0.3" stopColor={colour} />
          <stop offset="0.52" stopColor={mix(colour, '#ffffff', 0.16)} />
          <stop offset="0.6" stopColor={paintMid} />
          <stop offset="0.86" stopColor={mix(colour, '#000000', 0.3)} />
          <stop offset="1" stopColor={paintDark} />
        </linearGradient>
        {/* Sky reflection sweeping along the flank. */}
        <linearGradient id={id('sheen')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.3" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.02" />
          <stop offset="0.7" stopColor="#fff" stopOpacity="0.07" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('glass')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b4a55" />
          <stop offset="0.45" stopColor="#18222a" />
          <stop offset="1" stopColor="#0a0f13" />
        </linearGradient>
        <linearGradient id={id('gloss')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2c3238" />
          <stop offset="0.5" stopColor="#0d1013" />
          <stop offset="1" stopColor="#050607" />
        </linearGradient>
        <radialGradient id={id('rim')} cx="0.42" cy="0.38" r="0.7">
          <stop offset="0" stopColor="#f4f6f8" />
          <stop offset="0.55" stopColor="#b9c0c6" />
          <stop offset="1" stopColor="#7b848c" />
        </radialGradient>
        <radialGradient id={id('tyre')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.72" stopColor="#1d1f22" />
          <stop offset="0.9" stopColor="#2b2e31" />
          <stop offset="1" stopColor="#111214" />
        </radialGradient>
        <radialGradient id={id('shadow')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.55" />
          <stop offset="0.6" stopColor="#000" stopOpacity="0.22" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('lamp')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a333b" />
          <stop offset="1" stopColor="#0b0f12" />
        </linearGradient>
        <linearGradient id={id('tail')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff5a4f" />
          <stop offset="0.5" stopColor="#c8141b" />
          <stop offset="1" stopColor="#6d080c" />
        </linearGradient>
        <filter id={id('glow')} x="-50%" y="-200%" width="200%" height="500%">
          <feGaussianBlur stdDeviation="0.012" />
        </filter>
        <clipPath id={id('body')}>
          <path d={g.body} />
        </clipPath>
        <clipPath id={id('win')}>
          <path d={g.windows} />
        </clipPath>
      </defs>

      {/* Ground shadow */}
      <ellipse cx={L / 2} cy={0.01} rx={L * 0.58} ry={0.11} fill={url('shadow')} />
      {g.wheels.map((w) => (
        <ellipse key={`cs${w.x}`} cx={w.x} cy={0.005} rx={s.tyreR * 1.1} ry={0.035} fill="#000" opacity={0.55} />
      ))}

      {/* Wheel wells */}
      {g.wheels.map((w) => (
        <circle key={`well${w.x}`} cx={w.x} cy={-s.tyreR} r={g.archR} fill="#060708" />
      ))}

      {/* Body */}
      <path d={g.body} fill={url('paint')} />
      <g clipPath={url('body')}>
        <rect x={0} y={-H - 0.1} width={L} height={H + 0.2} fill={url('sheen')} />
        {dark && <path d={g.greenhouse} fill={url('gloss')} />}
        {/* Lower body shading and the dark rocker */}
        <path d={g.rocker} fill="#0c0e10" opacity={s.extras.includes('cladding') ? 0.95 : 0.8} />
        {s.extras.includes('cladding') && <path d={g.cladding} fill="none" stroke="#141619" strokeWidth={0.07} />}
        <path d={g.bumpers} fill="#0e1012" opacity={0.85} />
        {/* Shoulder line: a crisp highlight over a soft shadow */}
        <path d={g.shoulder} fill="none" stroke="#000" strokeOpacity={0.22} strokeWidth={0.014} transform="translate(0 0.008)" />
        <path d={g.shoulder} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={0.008} />
        {s.extras.includes('zCrease') && <path d={g.zCrease} fill="none" stroke="#fff" strokeOpacity={0.3} strokeWidth={0.008} />}
        {/* Door shut lines and handles */}
        {g.seams.map((d, i) => (
          <g key={`seam${i}`}>
            <path d={d} fill="none" stroke="#000" strokeOpacity={0.45} strokeWidth={0.006} />
            <path d={d} fill="none" stroke="#fff" strokeOpacity={0.12} strokeWidth={0.004} transform="translate(0.006 0)" />
          </g>
        ))}
        {g.handles.map((h, i) => (
          <rect key={`h${i}`} x={h.x} y={-h.y} width={0.13} height={0.022} rx={0.011} fill={dark ? '#0d0f11' : mix(colour, '#000000', 0.35)} />
        ))}
        {/* Contrast C-pillar blade / chrome trim */}
        {g.cBlade && <path d={g.cBlade} fill={s.extras.includes('chromeDPillar') ? '#d9dee2' : '#8f979e'} />}
      </g>

      {/* Windows */}
      <path d={g.windows} fill={url('glass')} />
      <g clipPath={url('win')}>
        <path d={g.reflection} fill="#fff" opacity={0.1} />
      </g>
      <path d={g.windows} fill="none" stroke={s.roof === 'body' ? '#0b0d0f' : '#1a1f24'} strokeWidth={0.012} />
      <path d={g.bPillar} fill="#0a0c0e" />
      {s.extras.includes('chromeArc') && <path d={g.windowArc} fill="none" stroke="#dfe4e8" strokeWidth={0.014} />}

      {/* Roof rails and spoilers */}
      {s.extras.includes('roofRails') && <path d={g.rails} fill="#16191c" />}
      {g.spoiler && <path d={g.spoiler} fill={dark ? url('gloss') : url('paint')} />}

      {/* Mirror */}
      <path d={g.mirrorStalk} fill="#0d0f11" />
      <path d={g.mirror} fill={dark ? url('gloss') : url('paint')} />

      {/* Lamps */}
      <g clipPath={url('body')}>
        {g.head.housing.map((d, i) => (
          <path key={`hh${i}`} d={d} fill={url('lamp')} />
        ))}
        {g.head.light.map((d, i) => (
          <g key={`hl${i}`}>
            <path d={d} fill="none" stroke="#dff1ff" strokeWidth={0.03} opacity={0.5} filter={url('glow')} />
            <path d={d} fill="none" stroke="#ffffff" strokeWidth={0.012} strokeLinecap="round" />
          </g>
        ))}
        {g.head.dots.map((c, i) => (
          <rect key={`hd${i}`} x={c[0]} y={-c[1]} width={0.026} height={0.026} rx={0.004} fill="#f4fbff" />
        ))}
        {g.tail.housing.map((d, i) => (
          <path key={`th${i}`} d={d} fill={url('tail')} />
        ))}
        {g.tail.light.map((d, i) => (
          <g key={`tl${i}`}>
            <path d={d} fill="none" stroke="#ff3b30" strokeWidth={0.03} opacity={0.55} filter={url('glow')} />
            <path d={d} fill="none" stroke="#ff8a80" strokeWidth={0.011} strokeLinecap="round" />
          </g>
        ))}
      </g>

      {/* Wheels */}
      {g.wheels.map((w) => (
        <Wheel key={`w${w.x}`} cx={w.x} r={s.tyreR} rimR={s.rimR} style={s.wheel} rimFill={url('rim')} tyreFill={url('tyre')} />
      ))}
    </svg>
  )
}

function Wheel({ cx, r, rimR, style, rimFill, tyreFill }: { cx: number; r: number; rimR: number; style: BuildSpec['wheel']; rimFill: string; tyreFill: string }) {
  const cy = -r
  const spokes: string[] = []
  const hubR = rimR * 0.2
  const spoke = (a: number, w0: number, w1: number, r0 = hubR * 0.9, r1 = rimR * 0.94) => {
    const p = (rad: number, off: number) => [cx + Math.cos(a) * rad - Math.sin(a) * off, cy + Math.sin(a) * rad + Math.cos(a) * off]
    const pts = [p(r0, -w0), p(r1, -w1), p(r1, w1), p(r0, w0)]
    spokes.push(`M${pts.map((q) => q.map((v) => v.toFixed(4)).join(' ')).join('L')}Z`)
  }
  const tau = Math.PI * 2
  if (style === 'spoke5') for (let k = 0; k < 5; k++) spoke((k / 5) * tau - Math.PI / 2, rimR * 0.11, rimR * 0.2)
  if (style === 'twin') for (let k = 0; k < 5; k++) for (const o of [-0.16, 0.16]) spoke((k / 5) * tau - Math.PI / 2 + o, rimR * 0.05, rimR * 0.07)
  if (style === 'multi') for (let k = 0; k < 10; k++) spoke((k / 10) * tau, rimR * 0.04, rimR * 0.06)
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={tyreFill} />
      <circle cx={cx} cy={cy} r={r * 0.985} fill="none" stroke="#3a3d41" strokeOpacity={0.5} strokeWidth={0.006} />
      {/* Barrel and brake disc behind the spokes */}
      <circle cx={cx} cy={cy} r={rimR} fill="#1b1e21" />
      <circle cx={cx} cy={cy} r={rimR * 0.74} fill="#5d646a" />
      <circle cx={cx} cy={cy} r={rimR * 0.36} fill="#3c4247" />
      <rect x={cx + rimR * 0.36} y={cy - rimR * 0.5} width={rimR * 0.2} height={rimR * 0.42} rx={rimR * 0.05} fill="#2a2e32" />
      {style === 'aero' ? (
        <>
          <circle cx={cx} cy={cy} r={rimR * 0.97} fill="#3a4046" />
          <circle cx={cx} cy={cy} r={rimR * 0.97} fill={rimFill} opacity={0.35} />
          {Array.from({ length: 5 }, (_, k) => {
            const a = (k / 5) * tau - Math.PI / 2 + 0.6
            const x = cx + Math.cos(a) * rimR * 0.62
            const y = cy + Math.sin(a) * rimR * 0.62
            return <ellipse key={k} cx={x} cy={y} rx={rimR * 0.24} ry={rimR * 0.08} transform={`rotate(${(a * 180) / Math.PI} ${x} ${y})`} fill="#c9cfd4" />
          })}
          <circle cx={cx} cy={cy} r={rimR * 0.97} fill="none" stroke="#7d868d" strokeWidth={0.008} />
        </>
      ) : (
        spokes.map((d, i) => <path key={i} d={d} fill={rimFill} />)
      )}
      <circle cx={cx} cy={cy} r={rimR * 0.97} fill="none" stroke={rimFill} strokeWidth={rimR * 0.07} />
      <circle cx={cx} cy={cy} r={hubR} fill={rimFill} stroke="#6d757c" strokeWidth={0.004} />
      <circle cx={cx} cy={cy} r={hubR * 0.45} fill="#2c3136" />
    </g>
  )
}
