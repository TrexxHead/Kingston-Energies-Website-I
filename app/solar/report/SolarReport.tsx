'use client'

import { useEffect, useState } from 'react'
import { decodeSnapshot, type SolarSnapshot } from '@/lib/solar/report'

const J = (n: number) => `J$${Math.round(n).toLocaleString('en-JM')}`
const k = (n: number) => Math.round(n).toLocaleString('en-JM')
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function SolarReport() {
  const [s, setS] = useState<SolarSnapshot | null | undefined>(undefined)
  useEffect(() => setS(decodeSnapshot(window.location.hash.slice(1))), [])
  if (s === undefined) return null
  if (!s)
    return (
      <main className="rp">
        <style>{CSS}</style>
        <p>This report link is incomplete. Go back to the <a href="/solar">solar estimator</a> and open the report again.</p>
      </main>
    )

  const max = s.production ? Math.max(...s.production.monthly, 1) : 1
  return (
    <main className="rp">
      <style>{CSS}</style>
      <div className="rp-bar no-print">
        <button type="button" onClick={() => window.print()}>Print or save as PDF</button>
        <a href="/solar">Back to the estimator</a>
      </div>

      <header className="rp-head">
        <div>
          <div className="rp-brand">KINGSTON ENERGIES</div>
          <h1>Rooftop solar estimate</h1>
          <p>
            {s.place.parish ? `${s.place.parish}, ` : ''}Jamaica · {s.place.lat.toFixed(4)}, {s.place.lng.toFixed(4)} · prepared {new Date(`${s.date}T12:00:00Z`).toLocaleDateString('en-JM', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <RoofOutline ring={s.roof.ring} />
      </header>

      <section className="rp-grid">
        <Fact k="System" v={`${s.system.modules} panels · ${s.system.kwp.toFixed(2)} kWp`} />
        <Fact k="Roof" v={`${s.roof.type} · ~${k(s.roof.areaM2)} m² (${s.roof.source === 'drawn' ? 'drawn by you' : 'map outline'})`} />
        <Fact k="Panels face" v={`${s.system.facing}, ${s.system.tiltDeg}° tilt · ${s.system.lossPct}% losses`} />
        {s.production && <Fact k="Yearly output" v={`${k(s.production.low)}–${k(s.production.high)} kWh (most likely ${k(s.production.base)})`} />}
        {s.usage && <Fact k="Your use" v={`${k(s.usage.monthlyKwh)} kWh a month${s.usage.evKwh ? ` incl. ~${k(s.usage.evKwh)} for your EV` : ''} · ${s.usage.daytimePct}% in daytime`} />}
      </section>

      {s.production && (
        <section>
          <h2>Output by month (kWh)</h2>
          <svg viewBox="0 0 600 170" width="100%" role="img" aria-label="Monthly solar output">
            {s.production.monthly.map((m, i) => {
              const h = (m / max) * 120
              return (
                <g key={i}>
                  <rect x={10 + i * 49} y={140 - h} width={36} height={h} rx={3} fill="#2f8f5b" />
                  <text x={28 + i * 49} y={134 - h} fontSize="10" textAnchor="middle" fill="#333">{k(m)}</text>
                  <text x={28 + i * 49} y={158} fontSize="10" textAnchor="middle" fill="#666">{MONTHS[i]}</text>
                </g>
              )
            })}
          </svg>
          <p className="rp-fine">Source: {s.production.source}.</p>
        </section>
      )}

      <section>
        <h2>Money</h2>
        <table className="rp-table">
          <thead>
            <tr>
              <th />
              <th>Yearly saving</th>
              {s.price && <th>Installed price</th>}
              {s.price && <th>Repays in</th>}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Solar only</td>
              <td>{s.savings ? `${J(s.savings.daytime)}–${J(s.savings.upper)}` : 'Needs the approved tariff'}</td>
              {s.price && <td>{`${J(s.price.low)}–${J(s.price.high)}`}</td>}
              {s.price && <td>{s.price.paybackLow != null ? `${s.price.paybackLow.toFixed(1)}–${s.price.paybackHigh!.toFixed(1)} yrs` : '—'}</td>}
            </tr>
            {s.battery && (
              <tr>
                <td>With {/^8|^11|^18/.test(String(s.battery.kwh)) ? 'an' : 'a'} {s.battery.kwh} kWh battery</td>
                <td>{s.battery.daytime != null ? `${J(s.battery.daytime)}–${J(s.battery.upper!)}` : '—'}</td>
                {s.price && <td>{s.batteryPrice ? `${J(s.batteryPrice.low)}–${J(s.batteryPrice.high)}` : 'Battery prices not entered'}</td>}
                {s.price && <td>{s.batteryPrice?.paybackLow != null ? `${s.batteryPrice.paybackLow.toFixed(1)}–${s.batteryPrice.paybackHigh!.toFixed(1)} yrs` : '—'}</td>}
              </tr>
            )}
          </tbody>
        </table>
        <p className="rp-fine">
          {s.savings ? `Savings at the approved tariff “${s.savings.tariff}”, using the price of the last kWh on each bill. The lower figure counts only electricity used while the sun is up. ` : ''}
          {s.price ? `Prices: ${s.price.source}. A range, not a quote. ` : ''}Payback is price ÷ yearly saving, before loan interest.
        </p>
      </section>

      <section>
        <h2>Assumptions</h2>
        <ul className="rp-list">
          {s.assumptions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </section>

      <footer className="rp-foot">
        An estimate from the Kingston Energies rooftop solar estimator (calculator version {s.engine}). A site visit confirms shading, roof condition and structure before any quote. Roof outlines © OpenStreetMap contributors / Overture Maps Foundation.
      </footer>
    </main>
  )
}

function Fact({ k: key, v }: { k: string; v: string }) {
  return (
    <div className="rp-fact">
      <span>{key}</span>
      <strong>{v}</strong>
    </div>
  )
}

/** The roof outline, drawn to scale (equirectangular with latitude correction). */
function RoofOutline({ ring }: { ring: [number, number][] }) {
  if (ring.length < 3) return null
  const lat0 = (ring.reduce((a, p) => a + p[1], 0) / ring.length) * (Math.PI / 180)
  const pts = ring.map(([x, y]) => [x * Math.cos(lat0), -y])
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const span = Math.max(maxX - minX, maxY - minY) || 1
  const sc = (v: number, min: number) => 10 + ((v - min) / span) * 100
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${sc(p[0], minX).toFixed(1)},${sc(p[1], minY).toFixed(1)}`).join(' ') + ' Z'
  return (
    <svg viewBox="0 0 120 120" width="110" height="110" role="img" aria-label="Your roof outline">
      <path d={d} fill="#f7c64a" fillOpacity={0.5} stroke="#b07a00" strokeWidth={2} />
    </svg>
  )
}

const CSS = `
body{background:#fff !important}
.rp{max-width:820px;margin:0 auto;padding:28px 24px 40px;color:#1b1f1d;font-family:var(--font-body,system-ui);background:#fff}
.rp a{color:#1d6b43}
.rp-bar{display:flex;gap:14px;align-items:center;margin-bottom:18px}
.rp-bar button{padding:10px 16px;border-radius:999px;border:0;background:#2f8f5b;color:#fff;font-weight:700;cursor:pointer}
.rp-head{display:flex;justify-content:space-between;gap:16px;align-items:center;border-bottom:2px solid #2f8f5b;padding-bottom:14px;margin-bottom:16px}
.rp-brand{font-size:11px;letter-spacing:.3em;color:#2f8f5b;font-weight:700}
.rp h1{margin:6px 0 4px;font-size:28px}
.rp h2{font-size:16px;margin:20px 0 8px;color:#1b1f1d}
.rp-head p{margin:0;color:#555;font-size:13px}
.rp-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.rp-fact{padding:8px 10px;border:1px solid #e3e7e5;border-radius:8px;display:grid;gap:2px}
.rp-fact span{font-size:11px;color:#666}
.rp-fact strong{font-size:13.5px}
.rp-table{width:100%;border-collapse:collapse;font-size:13px}
.rp-table th,.rp-table td{border-bottom:1px solid #e3e7e5;padding:7px 6px;text-align:left}
.rp-table th{color:#555;font-weight:600}
.rp-fine{font-size:11.5px;color:#666;margin:6px 0 0}
.rp-list{font-size:12.5px;color:#333;padding-left:18px;margin:0}
.rp-foot{margin-top:22px;padding-top:10px;border-top:1px solid #e3e7e5;font-size:11px;color:#666}
@media print{.no-print,.ke-no-print{display:none !important}.rp{padding:0}@page{size:A4;margin:16mm}}
@media (max-width:560px){.rp-grid{grid-template-columns:1fr}}
`
