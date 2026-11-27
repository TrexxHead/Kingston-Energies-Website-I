import Link from 'next/link'
import { Receipt, Landmark, Activity, MapPin, CloudLightning, Tractor, ArrowRight } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import JsonLd from '@/components/JsonLd'
import { buildBreadcrumbs } from '@/lib/structuredData'
import Backdrop from './_components/Backdrop'
import HeroSunset from './_components/HeroSunset'
import OutageScene from './_components/OutageScene'

const IMG = '/images/energy'

export const metadata = {
  title: 'Solar & energy for Jamaican homes',
  description: 'Solar panels, battery backup and EV charging, designed online from your JPS bill, surveyed, quoted, installed, inspected and tracked step by step.',
}

const breadcrumbs = buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Solar & Energy' }])

interface Panel {
  id: string
  /** Poster still (always shown first). */
  image: string
  /** Optional silent loop, played only while visible. */
  video?: string
  position?: string
  title: string
  line: string
  primary: { href: string; label: string }
  secondary: { href: string; label: string }
  stats?: [string, string][]
}

const PANELS: Panel[] = [
  {
    id: 'solar',
    image: `${IMG}/rooftop.webp`,
    video: `${IMG}/rooftop.mp4`,
    position: 'center 70%',
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
    image: `${IMG}/outage.webp`,
    title: 'Battery backup',
    line: 'When JPS goes out, your home stays on.',
    primary: { href: '/solar/design', label: 'Size your battery' },
    secondary: { href: '/storm-ready', label: 'Storm ready' },
    stats: [
      ['Essentials', 'fridge, lights, fans, Wi-Fi overnight'],
      ['Your evening', 'everything you use after dark'],
      ['A full day', 'without the grid'],
    ],
  },
  {
    id: 'ev',
    image: `${IMG}/charging.webp`,
    video: `${IMG}/charging.mp4`,
    position: '62% center',
    title: 'Charge at home',
    line: 'Your car, filled overnight — or on sunshine.',
    primary: { href: '/home-charging', label: 'Charging at home' },
    secondary: { href: '/garage', label: 'Add your car' },
  },
  {
    id: 'storm',
    image: `${IMG}/storm.webp`,
    video: `${IMG}/storm.mp4`,
    position: '40% center',
    title: 'Built for hurricane season',
    line: 'Racking rated for the wind, coastal-grade hardware, and a plan for before and after the storm.',
    primary: { href: '/guides/going-solar', label: 'How we install' },
    secondary: { href: '/solar/health', label: 'Check my system' },
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
        <HeroSunset day={`${IMG}/home-day.webp`} dusk={`${IMG}/home-dusk.webp`} dayVideo={`${IMG}/home-day.mp4`} duskVideo={`${IMG}/home-dusk.mp4`}>
          <div className="ke-en-copy">
            <div className="ke-en-over">KINGSTON ENERGIES · SOLAR &amp; ENERGY</div>
            <h1 id="en-hero">Power that stays on.</h1>
            <p>Solar, battery backup and EV charging for Jamaican homes — designed online from your JPS bill, then surveyed, installed, inspected and tracked step by step.</p>
            <div className="ke-en-ctas">
              <Link href="/solar/design" className="ke-en-btn">Design your system</Link>
              <Link href="/guides/going-solar" className="ke-en-btn ghost">How it works</Link>
            </div>
          </div>
          <div className="ke-en-sunline" aria-hidden>
            <span>Sunshine on the roof</span>
            <i />
            <span>Stored for tonight</span>
          </div>
          <a href="#solar" className="ke-en-down" aria-label="Scroll to solar panels">↓</a>
        </HeroSunset>

        {PANELS.map((p) => (
          <section key={p.id} id={p.id} className="ke-en-panel" aria-labelledby={`en-${p.id}`}>
            {p.id === 'backup' ? <OutageScene gridOn={`${IMG}/grid-on.webp`} outage={p.image} gridOnVideo={`${IMG}/grid-on.mp4`} outageVideo={`${IMG}/outage.mp4`} /> : <Backdrop src={p.image} video={p.video} position={p.position} />}
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
          <div className="ke-en-flow-hero">
            <Backdrop src={`${IMG}/neighbourhood.webp`} video={`${IMG}/neighbourhood.mp4`} position="center 60%" />
            <div className="ke-en-flow-fade" />
            <h2 id="en-flow">From your bill to switch-on.</h2>
          </div>
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
        <p className="ke-en-note">Scenes on this page are illustrations of Jamaican homes, not photographs of a specific installation.</p>
      </main>
      <Footer />
    </div>
  )
}

const CSS = `
html{scroll-snap-type:y proximity}
.ke-en{overflow-x:clip}
.ke-bd{position:absolute;inset:0;z-index:-1;overflow:hidden;background:#0b1210}
.ke-bd-img{transform:scale(1.06);transition:transform 2.4s cubic-bezier(.2,.7,.2,1),opacity 1.6s ease}
.ke-bd.in .ke-bd-img{transform:scale(1)}
.ke-bd-vbox,.ke-en-layer{position:absolute;inset:0}
.ke-bd-vid{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .9s ease}
.ke-bd-vid.on{opacity:1}
.ke-en-panel{position:relative;min-height:100svh;display:flex;flex-direction:column;align-items:center;overflow:hidden;scroll-snap-align:start;isolation:isolate}
.ke-en-shade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(4,9,8,.55) 0%,rgba(4,9,8,.12) 34%,rgba(4,9,8,0) 55%,rgba(4,9,8,.6) 100%);z-index:0}
.ke-en-copy{position:relative;z-index:1;text-align:center;padding:14vh 20px 0;max-width:820px}
.ke-en-over{font-family:var(--font-mono);font-size:12px;letter-spacing:.3em;color:#fff;opacity:.85}
.ke-en h1,.ke-en-copy h2{font-family:var(--font-display);font-weight:800;letter-spacing:-.03em;line-height:1.02;margin:14px 0 0;color:#fff;text-shadow:0 2px 30px rgba(0,0,0,.3)}
.ke-en h1{font-size:clamp(40px,7vw,84px)}
.ke-en-copy h2{font-size:clamp(38px,6.5vw,72px)}
.ke-en-copy p{font-size:clamp(16px,2vw,20px);line-height:1.5;color:rgba(255,255,255,.92);margin:16px auto 0;max-width:640px;text-shadow:0 1px 16px rgba(0,0,0,.35)}
.ke-en-ctas{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:26px}
.ke-en a.ke-en-btn{display:inline-flex;align-items:center;justify-content:center;min-width:220px;height:46px;padding:0 24px;border-radius:999px;background:rgba(18,26,23,.88);color:#fff;font-weight:600;font-size:15px;text-decoration:none;backdrop-filter:blur(8px);transition:transform .15s,background .15s}
.ke-en a.ke-en-btn.ghost{background:rgba(244,246,243,.86);color:#0d1714}
.ke-en a.ke-en-btn:hover{transform:translateY(-1px)}
.ke-en-stats{position:relative;z-index:1;margin:auto 0 0;display:flex;gap:clamp(18px,5vw,64px);justify-content:center;flex-wrap:wrap;padding:14px 20px 4vh;text-align:center;text-shadow:0 1px 12px rgba(0,0,0,.6)}
.ke-en-stats dt{font-family:var(--font-display);font-weight:700;font-size:clamp(20px,2.6vw,28px);color:#fff}
.ke-en-stats dd{margin:4px 0 0;font-size:13.5px;color:rgba(255,255,255,.88);max-width:200px}
@media (max-width:640px){.ke-en-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:12px 14px 3vh}.ke-en-stats dt{font-size:16px}.ke-en-stats dd{font-size:11.5px;line-height:1.35}}
/* Hero: sticky picture, sunset driven by scroll (--p 0→1) */
.ke-en-sunset{--p:0;position:relative;height:190svh}
.ke-en-sticky{position:sticky;top:0;height:100svh;display:flex;flex-direction:column;align-items:center;overflow:hidden;isolation:isolate}
.ke-en-sunset .ke-en-copy{padding-top:13vh}
.ke-en-sunset .ke-bd-img{transition:none;transform:none}
.ke-en-dusk{opacity:var(--p)}
.ke-en-day{transform:scale(calc(1 + var(--p) * .04))}
.ke-en-sunline{position:relative;z-index:1;margin:auto 0 11vh;display:flex;align-items:center;gap:14px;font-family:var(--font-mono);font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.82);text-shadow:0 1px 10px rgba(0,0,0,.5)}
.ke-en-sunline i{position:relative;display:block;width:min(220px,30vw);height:2px;border-radius:2px;background:rgba(255,255,255,.3);overflow:hidden}
.ke-en-sunline i::after{content:'';position:absolute;inset:0;transform-origin:left;transform:scaleX(var(--p));background:linear-gradient(90deg,#ffd27a,#f2a640)}
.ke-en-sunline span:first-child{opacity:calc(1 - var(--p) * .5)}
.ke-en-sunline span:last-child{opacity:calc(.5 + var(--p) * .5)}
/* Battery backup: grid on → outage */
.ke-en-out{opacity:0;transition:opacity 1.6s ease}
.ke-en-out.on{opacity:1}
.ke-en button.ke-en-grid{position:absolute;z-index:2;right:clamp(16px,4vw,48px);bottom:clamp(120px,18vh,170px);display:inline-flex;align-items:center;gap:10px;height:44px;padding:0 18px 0 14px;border-radius:999px;border:1px solid rgba(255,255,255,.22);background:rgba(10,16,14,.62);color:#fff;font:600 14px var(--font-body);backdrop-filter:blur(10px);cursor:pointer;white-space:nowrap}
.ke-en-grid .dot{width:10px;height:10px;border-radius:50%;background:#f2c14e;box-shadow:0 0 0 4px rgba(242,193,78,.18)}
.ke-en-grid.is-out .dot{background:#93c93f;box-shadow:0 0 0 4px rgba(147,201,63,.2);animation:ke-en-pulse 1.8s ease-in-out infinite}
.ke-en-grid .hint{font-weight:500;color:rgba(255,255,255,.62);padding-left:10px;border-left:1px solid rgba(255,255,255,.2)}
@keyframes ke-en-pulse{50%{box-shadow:0 0 0 8px rgba(147,201,63,0)}}
@media (max-width:640px){.ke-en button.ke-en-grid{left:50%;right:auto;transform:translateX(-50%);bottom:auto;top:calc(14vh + 330px)}.ke-en-grid .hint{display:none}}
.ke-en-down{position:absolute;bottom:4vh;left:50%;transform:translateX(-50%);z-index:1;color:#fff;font-size:22px;text-decoration:none;animation:ke-en-bob 2s ease-in-out infinite}
@keyframes ke-en-bob{50%{transform:translate(-50%,6px)}}
@media (prefers-reduced-motion:reduce){.ke-en-down,.ke-en-grid .dot{animation:none!important}html{scroll-snap-type:none}.ke-bd-img{transition:none;transform:none!important}.ke-en-sunset{height:auto}.ke-en-sticky{position:relative}}
.ke-en-note{max-width:1100px;margin:0 auto;padding:0 20px 40px;font-size:12.5px;color:var(--ke-dark-text-muted);text-align:center}
.ke-en-flow-hero{position:relative;isolation:isolate;height:min(70vh,620px);width:100vw;margin-left:calc(50% - 50vw);display:flex;align-items:flex-end;justify-content:center;padding-bottom:36px;overflow:hidden}
.ke-en-flow-fade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,9,8,0) 30%,var(--ke-dark-bg) 100%)}
.ke-en-flow-hero h2{position:relative;z-index:1;text-shadow:0 2px 24px rgba(0,0,0,.4)}
.ke-en-flow{max-width:1100px;margin:0 auto;padding:0 20px 80px;text-align:center}
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
