import Link from 'next/link'
import { Receipt, Landmark, Activity, MapPin, CloudLightning, Tractor, ArrowRight } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import JsonLd from '@/components/JsonLd'
import { buildBreadcrumbs } from '@/lib/structuredData'
import Scene, { type SceneKind } from './_components/Scene'
import DrivewayCar from './_components/DrivewayCar'

export const metadata = {
  title: 'Solar & energy for Jamaican homes',
  description: 'Solar panels, battery backup and EV charging, designed online from your JPS bill, surveyed, quoted, installed, inspected and tracked step by step.',
}

const breadcrumbs = buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Solar & Energy' }])

interface Panel {
  id: string
  scene: SceneKind
  title: string
  line: string
  primary: { href: string; label: string }
  secondary: { href: string; label: string }
  stats?: [string, string][]
  dark?: boolean
}

const PANELS: Panel[] = [
  {
    id: 'solar',
    scene: 'day',
    title: 'Solar panels',
    line: 'Cut your JPS bill with the sunshine already on your roof.',
    primary: { href: '/solar/design', label: 'Design your system' },
    secondary: { href: '/solar', label: 'Check your roof' },
    stats: [
      ['5–7 kWh', 'per installed kW a day in Jamaica'],
      ['Losses included', 'sized the way a qualified designer does'],
      ['Free', 'online design with every figure shown'],
    ],
  },
  {
    id: 'backup',
    scene: 'night',
    title: 'Battery backup',
    line: 'When JPS goes out, your home stays on.',
    primary: { href: '/solar/design', label: 'Size your battery' },
    secondary: { href: '/storm-ready', label: 'Storm ready' },
    stats: [
      ['Essentials', 'fridge, lights, fans, Wi-Fi overnight'],
      ['Your evening', 'everything you use after dark'],
      ['A full day', 'without the grid'],
    ],
    dark: true,
  },
  {
    id: 'ev',
    scene: 'garage',
    title: 'Charge at home',
    line: 'Your car, filled overnight — or on sunshine.',
    primary: { href: '/home-charging', label: 'Charging at home' },
    secondary: { href: '/garage', label: 'Add your car' },
    dark: true,
  },
  {
    id: 'storm',
    scene: 'storm',
    title: 'Built for hurricane season',
    line: 'Racking rated for the wind, coastal-grade hardware, and a plan for before and after the storm.',
    primary: { href: '/guides/going-solar', label: 'How we install' },
    secondary: { href: '/solar/health', label: 'Check my system' },
    dark: true,
  },
]

const STEPS: [string, string][] = [
  ['Design', 'Online, from your bill'],
  ['Survey', 'Roof, wiring, main panel'],
  ['Quote', 'Every line priced'],
  ['Install & inspect', 'Licensed inspector’s certificate'],
  ['Switch on', 'Handover and documents'],
]

const TOOLS = [
  { href: '/bill-explainer', label: 'Bill Explainer', Icon: Receipt, blurb: 'Read your JPS bill from a photo' },
  { href: '/financing', label: 'Financing', Icon: Landmark, blurb: 'Monthly payments and the true rate' },
  { href: '/solar/health', label: 'System health check', Icon: Activity, blurb: 'Is your system performing?' },
  { href: '/energy-map', label: 'Energy Map', Icon: MapPin, blurb: 'EV chargers across Jamaica' },
  { href: '/storm-ready', label: 'Storm ready', Icon: CloudLightning, blurb: 'Live storms, backup runtime' },
  { href: '/business-tools', label: 'Business & farm', Icon: Tractor, blurb: 'Generators, solar water pumps' },
]

export default function EnergyHome() {
  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--ke-dark-text)', background: 'var(--ke-dark-bg)', minHeight: '100vh' }}>
      <JsonLd data={breadcrumbs} />
      <style>{CSS}</style>
      <Navbar />
      <main className="ke-en">
        <section className="ke-en-panel ke-en-hero" aria-labelledby="en-hero">
          <Scene kind="day" />
          <div className="ke-en-shade" />
          <div className="ke-en-copy">
            <div className="ke-en-over">KINGSTON ENERGIES · SOLAR &amp; ENERGY</div>
            <h1 id="en-hero">Power that stays on.</h1>
            <p>Solar, battery backup and EV charging for Jamaican homes — designed online from your JPS bill, then surveyed, installed, inspected and tracked step by step.</p>
            <div className="ke-en-ctas">
              <Link href="/solar/design" className="ke-en-btn">Design your system</Link>
              <Link href="/guides/going-solar" className="ke-en-btn ghost">How it works</Link>
            </div>
          </div>
          <a href="#solar" className="ke-en-down" aria-label="Scroll to solar panels">↓</a>
        </section>

        {PANELS.map((p) => (
          <section key={p.id} id={p.id} className={`ke-en-panel${p.dark ? ' is-dark' : ''}`} aria-labelledby={`en-${p.id}`}>
            <Scene kind={p.scene} />
            {p.scene === 'garage' && <DrivewayCar />}
            <div className="ke-en-shade" />
            <div className="ke-en-copy">
              <h2 id={`en-${p.id}`}>{p.title}</h2>
              <p>{p.line}</p>
              <div className="ke-en-ctas">
                <Link href={p.primary.href} className="ke-en-btn">{p.primary.label}</Link>
                <Link href={p.secondary.href} className="ke-en-btn ghost">{p.secondary.label}</Link>
              </div>
            </div>
            {p.stats && (
              <dl className="ke-en-stats">
                {p.stats.map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        ))}

        <section className="ke-en-flow" aria-labelledby="en-flow">
          <h2 id="en-flow">From your bill to switch-on.</h2>
          <p>Follow every step in your account — survey, quote, approvals, installation, inspection and handover, with your documents in one place.</p>
          <ol>
            {STEPS.map(([t, s], i) => (
              <li key={t}>
                <span>{String(i + 1).padStart(2, '0')}</span>
                <strong>{t}</strong>
                <small>{s}</small>
              </li>
            ))}
          </ol>
          <div className="ke-en-ctas" style={{ justifyContent: 'center' }}>
            <Link href="/solar/design" className="ke-en-btn">Start your design</Link>
            <Link href="/guides/going-solar" className="ke-en-btn ghost">The full process</Link>
          </div>
        </section>

        <section className="ke-en-tools" aria-labelledby="en-tools">
          <h2 id="en-tools">Tools for every energy question.</h2>
          <div>
            {TOOLS.map((t) => (
              <Link key={t.href} href={t.href}>
                <t.Icon size={20} aria-hidden />
                <strong>{t.label}</strong>
                <span>{t.blurb}</span>
                <ArrowRight size={16} aria-hidden className="go" />
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

const CSS = `
html{scroll-snap-type:y proximity}
.ke-en-panel{position:relative;min-height:100svh;display:flex;flex-direction:column;align-items:center;overflow:hidden;scroll-snap-align:start;isolation:isolate}
.ke-en-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,12,10,.55) 0%,rgba(6,12,10,.05) 38%,rgba(6,12,10,0) 60%,rgba(6,12,10,.55) 100%);z-index:0}
.ke-en-panel:not(.is-dark) .ke-en-shade{background:linear-gradient(180deg,rgba(255,255,255,.0) 0%,rgba(6,12,10,0) 55%,rgba(6,12,10,.45) 100%)}
.ke-en-copy{position:relative;z-index:1;text-align:center;padding:14vh 20px 0;max-width:820px}
.ke-en-hero .ke-en-copy{padding-top:13vh}
.ke-en-over{font-family:var(--font-mono);font-size:12px;letter-spacing:.3em;color:#fff;opacity:.85}
.ke-en h1,.ke-en-copy h2{font-family:var(--font-display);font-weight:800;letter-spacing:-.03em;line-height:1.02;margin:14px 0 0;color:#fff;text-shadow:0 2px 30px rgba(0,0,0,.25)}
.ke-en h1{font-size:clamp(40px,7vw,84px)}
.ke-en-copy h2{font-size:clamp(38px,6.5vw,72px)}
.ke-en-panel:not(.is-dark):not(.ke-en-hero) .ke-en-copy h2,.ke-en-panel:not(.is-dark):not(.ke-en-hero) .ke-en-copy p{color:#0d1714;text-shadow:none}
.ke-en-copy p{font-size:clamp(16px,2vw,20px);line-height:1.5;color:rgba(255,255,255,.9);margin:16px auto 0;max-width:640px}
.ke-en-hero .ke-en-copy p{color:#0d1714;font-weight:500}
.ke-en-hero h1{color:#0d1714;text-shadow:none}
.ke-en-hero .ke-en-over{color:#0d1714}
.ke-en-ctas{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:26px}
.ke-en a.ke-en-btn{display:inline-flex;align-items:center;justify-content:center;min-width:220px;height:46px;padding:0 24px;border-radius:999px;background:rgba(18,26,23,.9);color:#fff;font-weight:600;font-size:15px;text-decoration:none;backdrop-filter:blur(6px);transition:transform .15s}
.ke-en a.ke-en-btn.ghost{background:rgba(244,246,243,.82);color:#0d1714}
.ke-en a.ke-en-btn:hover{transform:translateY(-1px)}
.ke-en-stats{position:relative;z-index:1;margin:auto 0 0;display:flex;gap:clamp(18px,5vw,64px);justify-content:center;flex-wrap:wrap;padding:14px 20px 3.5vh;text-align:center;text-shadow:0 1px 12px rgba(0,0,0,.55)}
.ke-en-stats dt{font-family:var(--font-display);font-weight:700;font-size:clamp(20px,2.6vw,28px);color:#fff}
.ke-en-stats dd{margin:4px 0 0;font-size:13.5px;color:rgba(255,255,255,.85);max-width:200px}
.ke-en-down{position:absolute;bottom:4vh;left:50%;transform:translateX(-50%);z-index:1;color:#fff;font-size:22px;text-decoration:none;animation:ke-en-bob 2s ease-in-out infinite}
@keyframes ke-en-bob{50%{transform:translate(-50%,6px)}}
@media (prefers-reduced-motion:reduce){.ke-en-down{animation:none}html{scroll-snap-type:none}}
.ke-en-flow{max-width:1100px;margin:0 auto;padding:110px 20px 80px;text-align:center}
.ke-en-flow h2,.ke-en-tools h2{font-family:var(--font-display);font-weight:800;font-size:clamp(32px,5vw,54px);letter-spacing:-.03em;color:#fff;margin:0}
.ke-en-flow>p{color:rgba(234,242,236,.72);font-size:17px;line-height:1.6;max-width:640px;margin:16px auto 0}
.ke-en-flow ol{list-style:none;margin:44px 0 10px;padding:0;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}
@media (max-width:820px){.ke-en-flow ol{grid-template-columns:1fr 1fr}}
.ke-en-flow li{display:grid;gap:6px;padding:22px 16px;border-radius:20px;background:var(--ke-dark-card);border:1px solid var(--ke-dark-hairline);text-align:left}
.ke-en-flow li span{font-family:var(--font-mono);font-size:12px;color:var(--ke-green-400)}
.ke-en-flow li strong{color:#fff;font-family:var(--font-display);font-size:18px}
.ke-en-flow li small{color:var(--ke-dark-text-muted);font-size:13px}
.ke-en-tools{max-width:1100px;margin:0 auto;padding:30px 20px 110px}
.ke-en-tools>div{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:12px;margin-top:28px}
.ke-en-tools a{position:relative;display:grid;gap:4px;padding:22px 22px 22px;border-radius:20px;background:var(--ke-dark-card);border:1px solid var(--ke-dark-hairline);text-decoration:none;color:var(--ke-dark-text-muted);transition:border-color .15s}
.ke-en-tools a:hover{border-color:var(--ke-green-400)}
.ke-en-tools a svg{color:var(--ke-green-400)}
.ke-en-tools a strong{color:#fff;font-family:var(--font-display);font-size:17px;margin-top:6px}
.ke-en-tools a .go{position:absolute;right:20px;top:24px;color:var(--ke-dark-text-muted)}
`
