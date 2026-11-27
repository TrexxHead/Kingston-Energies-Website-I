'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

/**
 * The design as a picture: a Jamaican flat-roof home photographed from above,
 * with the roof showing an array close to the recommended size, the inverter,
 * and — when the design has one — a battery on the wall. Day / night switch
 * shows where the power comes from; labels carry the design's real figures.
 *
 * The photographs are illustrations (generated scenes, one house in four
 * array sizes); the labels are the actual design. The picture shows the
 * nearest of four array sizes, never a panel count the design doesn't have —
 * the count itself is in the label.
 */

const IMG = '/images/solar-design'
type Tier = 'empty' | 'small' | 'medium' | 'large'
const tierFor = (modules: number): Tier => (modules <= 0 ? 'empty' : modules <= 10 ? 'small' : modules <= 15 ? 'medium' : 'large')
const DAY: Record<Tier, string> = { empty: `${IMG}/empty.webp`, small: `${IMG}/small.webp`, medium: `${IMG}/medium.webp`, large: `${IMG}/large.webp` }
const NIGHT: Record<Exclude<Tier, 'empty'>, string> = { small: `${IMG}/night-small.webp`, medium: `${IMG}/night-medium.webp`, large: `${IMG}/night-large.webp` }

// Positions in the 1168 × 880 photographs.
const W = 1168
const H = 880
const P = {
  roof: { large: [585, 215], medium: [570, 205], small: [595, 250], empty: [560, 190] } as Record<Tier, [number, number]>,
  inverter: [213, 488] as [number, number],
  battery: [254, 522] as [number, number],
  home: [690, 470] as [number, number],
  grid: [1120, 860] as [number, number],
}
const pct = ([x, y]: [number, number]) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` })

export interface SystemVisualProps {
  modules: number
  moduleWatts?: number
  kwp?: number
  inverterKw: number | null
  batteryKwh: number | null
  solarShare: number
  gridTied?: boolean
}

export default function SystemVisual({ modules, moduleWatts, kwp, inverterKw, batteryKwh, solarShare, gridTied }: SystemVisualProps) {
  const tier = tierFor(modules)
  const [night, setNight] = useState(false)
  const [open, setOpen] = useState<'panels' | 'inverter' | 'battery' | null>(null)
  // Keep the previous picture underneath while the new one fades in.
  const [layers, setLayers] = useState<string[]>([DAY[tier]])
  const hasBattery = batteryKwh != null && batteryKwh > 0
  const isNight = night && tier !== 'empty'
  const src = isNight ? NIGHT[tier as Exclude<Tier, 'empty'>] : DAY[tier]

  useEffect(() => {
    setLayers((l) => (l[l.length - 1] === src ? l : [...l.slice(-1), src]))
  }, [src])
  useEffect(() => {
    if (tier === 'empty') setNight(false)
  }, [tier])

  const roof = P.roof[tier]
  const label = `${modules} solar panels${inverterKw ? `, a ${inverterKw} kW inverter` : ''}${hasBattery ? ` and a ${batteryKwh!.toFixed(1)} kWh battery` : ''}${isNight ? ', at night' : ''}`

  // Energy flows (by day: sun → inverter → home, and → battery; at night: battery or grid → home).
  const flows: { d: string; tone: 'sun' | 'bat' | 'grid' }[] = []
  if (tier !== 'empty') {
    const [rx, ry] = roof
    const [ix, iy] = P.inverter
    const [bx, by] = P.battery
    const [hx, hy] = P.home
    const [gx, gy] = P.grid
    if (!isNight) {
      flows.push({ d: `M${rx} ${ry} C ${rx - 120} ${ry + 120}, ${ix + 40} ${iy - 150}, ${ix} ${iy - 40}`, tone: 'sun' })
      flows.push({ d: `M${ix + 20} ${iy - 10} C ${ix + 160} ${iy - 90}, ${hx - 160} ${hy - 60}, ${hx} ${hy}`, tone: 'sun' })
      if (hasBattery) flows.push({ d: `M${ix + 16} ${iy + 20} Q ${(ix + bx) / 2 + 10} ${iy + 50} ${bx} ${by + 10}`, tone: 'sun' })
    } else if (hasBattery) {
      flows.push({ d: `M${bx + 12} ${by - 10} C ${bx + 160} ${by - 110}, ${hx - 160} ${hy - 60}, ${hx} ${hy}`, tone: 'bat' })
    } else {
      flows.push({ d: `M${gx} ${gy} C ${gx - 140} ${gy - 160}, ${hx + 160} ${hy + 120}, ${hx} ${hy}`, tone: 'grid' })
    }
  }

  const nightLine = hasBattery
    ? 'At night the battery runs the home; when JPS goes out it keeps running.'
    : gridTied
      ? 'Grid-tied: at night the home runs on JPS, and it switches off in an outage.'
      : 'At night the home runs on JPS.'

  return (
    <div className="ke-sv" role="img" aria-label={label}>
      <style>{CSS}</style>
      <div className="ke-sv-frame">
        {layers.map((s, i) => (
          <Image key={s} src={s} alt="" fill sizes="(max-width: 900px) 100vw, 50vw" quality={80} priority={i === 0} className={`ke-sv-img${i === layers.length - 1 ? ' top' : ''}`} style={{ objectFit: 'cover' }} />
        ))}
        {tier !== 'empty' && hasBattery && (
          <div className={`ke-sv-bat${isNight ? ' night' : ''}`} aria-hidden>
            <Image src={`${IMG}/battery-day.png`} alt="" fill sizes="20vw" className="d" />
            <Image src={`${IMG}/battery-night.png`} alt="" fill sizes="20vw" className="n" />
          </div>
        )}
        {isNight && <div className="ke-sv-dusk" aria-hidden />}

        <svg className="ke-sv-flow" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
          {flows.map((f, i) => (
            <g key={`${isNight}-${i}`} className={`f ${f.tone}`}>
              <path d={f.d} className="glow" />
              <path d={f.d} className="dash" />
            </g>
          ))}
        </svg>

        {tier !== 'empty' && (
          <>
            <Tag at={[roof[0], Math.max(60, roof[1] - 125)]} open={open === 'panels'} onToggle={() => setOpen(open === 'panels' ? null : 'panels')} title={`${modules} panels`} sub={kwp ? `${kwp.toFixed(2)} kW${moduleWatts ? ` · ${moduleWatts} W each` : ''}` : undefined} detail={`Facing the sun on the roof. About ${Math.round(solarShare * 100)}% of your use, on an average day.`} />
            {inverterKw != null && <Tag at={[P.inverter[0] - 60, P.inverter[1] + 70]} open={open === 'inverter'} onToggle={() => setOpen(open === 'inverter' ? null : 'inverter')} title={`${inverterKw} kW inverter`} detail="Turns the panels’ DC into the 110/220 V your home uses." />}
            {hasBattery && <Tag at={[P.battery[0] + 30, P.battery[1] + 150]} open={open === 'battery'} onToggle={() => setOpen(open === 'battery' ? null : 'battery')} title={`${batteryKwh!.toFixed(1)} kWh battery`} detail="Charged by the sun during the day; runs the home at night and in outages." />}
          </>
        )}

        {tier !== 'empty' && (
          <div className="ke-sv-switch" role="radiogroup" aria-label="Time of day">
            <button type="button" role="radio" aria-checked={!night} onClick={() => setNight(false)}>
              <Sun size={14} aria-hidden /> Day
            </button>
            <button type="button" role="radio" aria-checked={night} onClick={() => setNight(true)}>
              <Moon size={14} aria-hidden /> Night
            </button>
          </div>
        )}
      </div>
      {tier !== 'empty' && <p className="ke-sv-cap">{isNight ? nightLine : hasBattery ? 'By day the panels run the home and charge the battery.' : 'By day the panels run the home; JPS tops up the rest.'}</p>}
    </div>
  )
}

function Tag({ at, title, sub, detail, open, onToggle }: { at: [number, number]; title: string; sub?: string; detail: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="ke-sv-tag" style={pct(at)}>
      <button type="button" aria-expanded={open} onClick={onToggle}>
        <span className="dot" aria-hidden />
        <strong>{title}</strong>
        {sub && <small>{sub}</small>}
      </button>
      {open && <p>{detail}</p>}
    </div>
  )
}

const CSS = `
.ke-sv{display:grid;gap:10px}
.ke-sv-frame{position:relative;aspect-ratio:${W}/${H};border-radius:14px;overflow:hidden;background:#0d1714;isolation:isolate}
.ke-sv-img{opacity:1}
.ke-sv-img.top{animation:ke-sv-in .7s ease both}
@keyframes ke-sv-in{from{opacity:0}to{opacity:1}}
.ke-sv-bat{position:absolute;left:${(140 / W) * 100}%;top:${(400 / H) * 100}%;width:${(220 / W) * 100}%;height:${(240 / H) * 100}%;pointer-events:none;animation:ke-sv-in .6s ease both}
.ke-sv-bat .n{opacity:0;transition:opacity .7s}
.ke-sv-bat.night .n{opacity:1}
.ke-sv-dusk{position:absolute;inset:0;background:radial-gradient(120% 80% at 50% 0%,rgba(10,20,40,.0),rgba(5,10,20,.25));pointer-events:none}
.ke-sv-flow{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.ke-sv-flow path{fill:none;stroke-linecap:round}
.ke-sv-flow .glow{stroke-width:14;opacity:.18}
.ke-sv-flow .dash{stroke-width:4.5;stroke-dasharray:2 22;animation:ke-sv-run 1.1s linear infinite}
.ke-sv-flow .sun path{stroke:#ffd25e}
.ke-sv-flow .bat path{stroke:#93c93f}
.ke-sv-flow .grid path{stroke:#9fb6ff}
@keyframes ke-sv-run{to{stroke-dashoffset:-24}}
.ke-sv-tag{position:absolute;transform:translate(-50%,-50%);z-index:2;max-width:min(240px,46%)}
.ke-sv-tag button{display:inline-flex;align-items:center;gap:7px;flex-wrap:wrap;padding:6px 11px 6px 9px;border-radius:999px;border:1px solid rgba(255,255,255,.28);background:rgba(10,18,15,.72);color:#fff;font:600 12.5px var(--font-body);backdrop-filter:blur(8px);cursor:pointer;white-space:nowrap;box-shadow:0 4px 18px rgba(0,0,0,.25)}
.ke-sv-tag button small{font-weight:500;color:rgba(255,255,255,.72)}
.ke-sv-tag .dot{width:8px;height:8px;border-radius:50%;background:#93c93f;box-shadow:0 0 0 3px rgba(147,201,63,.25)}
.ke-sv-tag p{margin:6px 0 0;padding:8px 11px;border-radius:12px;background:rgba(10,18,15,.86);color:rgba(255,255,255,.9);font-size:12.5px;line-height:1.4;white-space:normal}
.ke-sv-switch{position:absolute;right:10px;bottom:10px;z-index:3;display:flex;padding:3px;border-radius:999px;background:rgba(10,18,15,.7);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.18)}
.ke-sv-switch button{display:inline-flex;align-items:center;gap:5px;height:30px;padding:0 12px;border:0;border-radius:999px;background:transparent;color:rgba(255,255,255,.75);font:600 12.5px var(--font-body);cursor:pointer}
.ke-sv-switch button[aria-checked=true]{background:#fff;color:#0d1714}
.ke-sv-cap{margin:0;font-size:13px;color:var(--ke-dark-text-muted,rgba(234,242,236,.7));text-align:center}
@media (max-width:520px){.ke-sv-tag button{font-size:11px;padding:5px 9px}.ke-sv-tag button small{display:none}}
@media (prefers-reduced-motion:reduce){.ke-sv-flow .dash{animation:none;stroke-dasharray:none;opacity:.7}.ke-sv-img.top,.ke-sv-bat{animation:none}}
`
