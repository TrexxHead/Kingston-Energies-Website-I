import Link from 'next/link'
import { Sparkles, ClipboardList, FileText, Stamp, Wrench, BadgeCheck, KeyRound, Activity, ArrowRight, CircleAlert } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import JsonLd from '@/components/JsonLd'
import { buildBreadcrumbs } from '@/lib/structuredData'

export const metadata = {
  title: 'Going solar in Jamaica, step by step',
  description: 'From your JPS bill to a working, inspected solar system: the design, site survey, approvals, hurricane-ready installation, handover and looking after it — in plain language.',
}

const breadcrumbs = buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Going solar in Jamaica' }])

const STEPS: { Icon: typeof Sparkles; title: string; body: React.ReactNode; points?: string[] }[] = [
  {
    Icon: Sparkles,
    title: 'Design it online',
    body: (
      <>
        Start from your JPS bill. <Link href="/solar/design">Design your system</Link> sizes the panels, inverter and battery from what you use and what must stay on in an outage — losses included — and gives a likely price. <Link href="/solar">The roof estimator</Link> checks the panels fit.
      </>
    ),
  },
  {
    Icon: ClipboardList,
    title: 'Site survey',
    body: 'A visit to confirm what the online design assumed. What we check:',
    points: [
      'Roof type, age and condition, and what’s under it (concrete slab, timber rafters, steel purlins)',
      'Clear roof facing south (or flat), and shade from tanks, parapets and trees between 9 am and 3 pm',
      'Distance from the sea and exposure to wind (hilltop, open coast)',
      'An indoor, ventilated spot on a solid wall for the inverter and battery',
      'Cable routes: panels to inverter, inverter to battery, inverter to your main panel',
      'Your main panel, earthing and the JPS meter',
    ],
  },
  {
    Icon: FileText,
    title: 'Your design and quote',
    body: 'A complete design is written down, so you can see what you’re paying for:',
    points: [
      'Your load table, with every assumption stated (fridges cycle — they don’t run at full power all day)',
      'Sizing with losses — about 25% of a panel’s rating never reaches your sockets',
      'A string plan checked against the inverter’s limits on a cool morning, when panel voltage is highest',
      'Breaker, fuse and cable sizes, and surge protection',
      'A single-line diagram and a full materials list',
      'The inverter settings, and the kWh you should expect each month',
    ],
  },
  {
    Icon: Stamp,
    title: 'Approvals',
    body: (
      <>
        Every solar installation must be inspected and certified under the Government Electrical Regulator (GER) by a licensed electrical inspector. A system that <em>sells power to JPS</em> also needs a generation licence and a Standard Offer Contract with JPS (net billing). One that never exports doesn’t need the licence — the inverter is set to zero export — but still needs the inspection. <Link href="/net-billing">How net billing works</Link>.
      </>
    ),
  },
  {
    Icon: Wrench,
    title: 'Installation, built for hurricanes',
    body: 'What good installation looks like in Jamaica:',
    points: [
      'Racking rated for the design wind speed, fixed to the maker’s spacing and anchor schedule, every bolt torqued and marked',
      'Concrete slabs: tilt legs on sealed anchors, with drainage kept clear; zinc roofs: feet fixed through the crest into the purlins, with sealing washers',
      'Arrays set back from roof edges, where uplift is strongest; low tilt (10–17°) on flat roofs',
      'Near the sea: aluminium rails, stainless fasteners, dissimilar metals kept apart, salt-mist-rated panels',
      'Inverter indoors, out of the sun, with clear space around it for cooling',
    ],
  },
  {
    Icon: BadgeCheck,
    title: 'Inspection and switch-on',
    body: 'Before anything is switched on: string voltages, polarity and insulation are tested and recorded, the licensed inspector issues the certificate, and — for an exporting system — JPS connects it.',
  },
  {
    Icon: KeyRound,
    title: 'Handover',
    body: 'You get the as-built diagram, datasheets, test results, settings, serial numbers and the inspector’s certificate — and we show you how to shut the system down safely, how to read the app, what each alarm means and who to call.',
  },
  {
    Icon: Activity,
    title: 'Living with solar',
    body: (
      <>
        Glance at the app daily; compare months; check twice a year (clean panels with water and a soft brush, check clamps and cables, clear the inverter’s vents). Before a storm, know how to isolate the system; after one, have clamps, anchors and cables checked before switching back on. <Link href="/solar/health">Is my system performing?</Link>
      </>
    ),
  },
]

const TYPES: [string, string, string, string][] = [
  ['Battery', 'None', 'Large', 'Sized for backup'],
  ['Power during an outage', 'No — it switches off with JPS', 'Yes', 'Yes, for the circuits you choose'],
  ['Upfront cost', 'Lowest', 'Highest', 'Medium to high'],
  ['Sized for', 'Lowering the bill', 'The cloudiest season', 'Bill + backup hours'],
  ['JPS approval', 'Needed (it exports)', 'Not for the grid — inspection still applies', 'Needed only if it exports'],
]

const MYTHS: [string, string][] = [
  ['“My fridge uses its full rating 24 hours a day.”', 'A compressor cycles on and off — often 30–50% of the time. Counting it at full power all day can make a system more than twice as big as it needs to be.'],
  ['“A 5 kW system makes 25 kWh a day.”', 'Heat, dust, wiring and the inverter take about a quarter: expect about 19 kWh on a 5-hour sun day. Good designs size for that.'],
  ['“A 10 kWh battery gives me 10 kWh.”', 'Lithium batteries shouldn’t be drained to zero and lose a little in charging, so a battery is sized above what you need.'],
  ['“More panels in a row is always fine.”', 'Panel voltage rises on cool mornings. Too many in one string can exceed the inverter’s limit and damage it — every string must be checked.'],
]

const SOURCES: [string, string][] = [
  ['Cadmus / USAID — PV licences and processes in Jamaica (Jan 2024)', 'https://cadmusgroup.com/wp-content/uploads/2024/03/SESR-Jamaica_Factsheet_PV-Licenses-and-Processes.pdf'],
  ['OUR — on solar panels (2013)', 'https://our.org.jm/wp-content/uploads/2021/04/media_release_-_our_on_solar_panel.pdf'],
  ['JIS — new electricity regulations (GER)', 'https://jis.gov.jm/new-electricity-regulations-approved-by-the-house/'],
  ['Jamaica Observer — inspection of solar systems (Nov 2024)', 'https://jamaicaobserver.com/2024/11/03/no-solace-solar'],
  ['Our Today — solar tax credit licence waiver (Mar 2025)', 'https://our.today/government-waives-electricity-licence-requirement-for-solar-tax-credit/'],
]

export default function GoingSolarPage() {
  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--ke-dark-text)', background: 'var(--ke-dark-bg)', minHeight: '100vh' }}>
      <JsonLd data={breadcrumbs} />
      <Navbar />
      <style>{CSS}</style>
      <main style={{ paddingTop: 64 }} className="ke-gs">
        <section className="ke-gs-hero">
          <div className="ke-gs-over">GOING SOLAR IN JAMAICA</div>
          <h1>From your bill to a working system.</h1>
          <p>Eight steps, from a design you can see online to a certified, hurricane-ready system you know how to look after.</p>
          <Link href="/solar/design" className="ke-gs-cta">
            Design your system <ArrowRight size={16} aria-hidden />
          </Link>
        </section>

        <section className="ke-gs-wrap" aria-label="The steps">
          <ol className="ke-gs-steps">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="ke-gs-dot" aria-hidden>
                  <s.Icon size={18} />
                </span>
                <div>
                  <div className="ke-gs-n">Step {i + 1}</div>
                  <h2>{s.title}</h2>
                  <p>{s.body}</p>
                  {s.points && (
                    <ul>
                      {s.points.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="ke-gs-wrap" id="types" aria-labelledby="types-h">
          <h2 id="types-h" className="ke-gs-h2">Which kind of system?</h2>
          <div className="ke-gs-table">
            <table>
              <thead>
                <tr>
                  <th />
                  <th>Grid-tied</th>
                  <th>Off-grid</th>
                  <th>Hybrid</th>
                </tr>
              </thead>
              <tbody>
                {TYPES.map((r) => (
                  <tr key={r[0]}>
                    <th scope="row">{r[0]}</th>
                    <td>{r[1]}</td>
                    <td>{r[2]}</td>
                    <td>{r[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ke-gs-note">
            Most Jamaican homes choose a <strong>hybrid</strong>: outages are common; under net billing, power sold to JPS is credited at well below the price you pay for it, so storing your own solar for the evening is usually worth more; and every kWh you don’t buy saves the full retail price.
          </p>
        </section>

        <section className="ke-gs-wrap" aria-labelledby="myths-h">
          <h2 id="myths-h" className="ke-gs-h2">Four common solar myths</h2>
          <div className="ke-gs-myths">
            {MYTHS.map(([m, t]) => (
              <div key={m}>
                <strong>{m}</strong>
                <p>{t}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="ke-gs-wrap" aria-labelledby="money-h">
          <h2 id="money-h" className="ke-gs-h2">Incentives</h2>
          <p className="ke-gs-note">
            <CircleAlert size={15} aria-hidden style={{ display: 'inline', verticalAlign: '-2px', color: 'var(--ke-sun-400)' }} /> As reported: a tax credit of up to J$1.2 million for residential solar at a primary residence (installed from 1 January 2023, with a GER inspector’s certificate), with the licence requirement for it waived in March 2025; and panels, inverters and lithium batteries imported free of duty and GCT. Confirm the amount, eligibility and deadlines with Tax Administration Jamaica and Jamaica Customs before relying on them.
          </p>
        </section>

        <section className="ke-gs-wrap ke-gs-end">
          <h2 className="ke-gs-h2">Ready when you are.</h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/solar/design" className="ke-gs-cta">
              Design your system <ArrowRight size={16} aria-hidden />
            </Link>
            <Link href="/book" className="ke-gs-ghost">
              Book a site survey
            </Link>
          </div>
          <details className="ke-gs-src">
            <summary>Sources</summary>
            <ul>
              {SOURCES.map(([t, u]) => (
                <li key={u}>
                  <a href={u} target="_blank" rel="noopener noreferrer">
                    {t}
                  </a>
                </li>
              ))}
            </ul>
            <p>Rules and incentives change; confirm current steps with the Ministry, JPS and a licensed electrical inspector.</p>
          </details>
        </section>
      </main>
      <Footer />
    </div>
  )
}

const CSS = `
.ke-gs a{color:var(--ke-green-400)}
.ke-gs-hero{max-width:900px;margin:0 auto;padding:72px 20px 40px;text-align:center}
.ke-gs-over{font-family:var(--font-mono);font-size:12px;letter-spacing:.3em;color:var(--ke-green-400)}
.ke-gs-hero h1{font-family:var(--font-display);font-weight:800;font-size:clamp(36px,6.5vw,68px);line-height:1.02;letter-spacing:-.03em;color:#fff;margin:16px 0 0}
.ke-gs-hero p{font-size:18px;line-height:1.6;color:rgba(234,242,236,.72);margin:18px auto 26px;max-width:620px}
.ke-gs a.ke-gs-cta{display:inline-flex;align-items:center;gap:8px;height:50px;padding:0 26px;border-radius:999px;background:var(--ke-green-500);color:#0d1714;font-weight:700;text-decoration:none}
.ke-gs a.ke-gs-ghost{display:inline-flex;align-items:center;height:50px;padding:0 24px;border-radius:999px;border:1px solid rgba(255,255,255,.25);color:#fff;font-weight:600;text-decoration:none}
.ke-gs-wrap{max-width:860px;margin:0 auto;padding:24px 20px 40px}
.ke-gs-h2{font-family:var(--font-display);font-weight:800;font-size:clamp(26px,4vw,38px);letter-spacing:-.02em;color:#fff;margin:0 0 18px}
.ke-gs-steps{list-style:none;margin:0;padding:0;position:relative}
.ke-gs-steps:before{content:"";position:absolute;left:21px;top:8px;bottom:8px;width:2px;background:linear-gradient(var(--ke-green-500),rgba(120,173,40,.15))}
.ke-gs-steps>li{position:relative;display:grid;grid-template-columns:44px 1fr;gap:18px;padding:0 0 30px}
.ke-gs-dot{position:relative;z-index:1;display:grid;place-items:center;width:44px;height:44px;border-radius:999px;background:var(--ke-dark-card);border:1px solid rgba(147,201,63,.45);color:var(--ke-green-400)}
.ke-gs-n{font-family:var(--font-mono);font-size:11.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--ke-dark-text-muted)}
.ke-gs-steps h2{font-family:var(--font-display);font-size:22px;color:#fff;margin:4px 0 6px}
.ke-gs-steps p{margin:0;color:rgba(234,242,236,.78);font-size:15.5px;line-height:1.65}
.ke-gs-steps ul{margin:10px 0 0;padding-left:18px;color:rgba(234,242,236,.72);font-size:14.5px;line-height:1.6;display:grid;gap:4px}
.ke-gs-table{overflow-x:auto;border-radius:18px;border:1px solid var(--ke-dark-hairline)}
.ke-gs-table table{width:100%;border-collapse:collapse;font-size:14px;min-width:560px}
.ke-gs-table th,.ke-gs-table td{padding:12px 14px;text-align:left;border-bottom:1px solid rgba(255,255,255,.06);color:rgba(234,242,236,.82);vertical-align:top}
.ke-gs-table thead th{color:#fff;font-family:var(--font-display);font-size:15px;background:rgba(255,255,255,.03)}
.ke-gs-table tbody th{color:var(--ke-dark-text-muted);font-weight:600}
.ke-gs-table td:last-child{color:#fff;background:rgba(147,201,63,.06)}
.ke-gs-note{color:rgba(234,242,236,.78);font-size:15px;line-height:1.65;margin:16px 0 0}
.ke-gs-myths{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:12px}
.ke-gs-myths div{padding:16px 18px;border-radius:18px;background:var(--ke-dark-card);border:1px solid var(--ke-dark-hairline)}
.ke-gs-myths strong{color:#fff;font-family:var(--font-display);font-size:16px}
.ke-gs-myths p{margin:8px 0 0;color:rgba(234,242,236,.72);font-size:14px;line-height:1.6}
.ke-gs-end{text-align:center;padding-bottom:80px}
.ke-gs-src{margin-top:28px;text-align:left;color:var(--ke-dark-text-muted);font-size:13px}
.ke-gs-src summary{cursor:pointer}
.ke-gs-src ul{margin:8px 0;padding-left:18px;display:grid;gap:4px}
`
