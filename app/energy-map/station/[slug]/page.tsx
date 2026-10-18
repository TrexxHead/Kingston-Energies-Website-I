import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChargePrice } from '@/components/energy/ChargePrice'
import StationForMyCar from '@/components/garage/StationForMyCar'
import { notFound, permanentRedirect } from 'next/navigation'
import { CircleCheck, CircleHelp, CircleX, Navigation, ExternalLink, MapPin, ArrowLeft } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import JsonLd from '@/components/JsonLd'
import { buildBreadcrumbs, SITE_URL } from '@/lib/structuredData'
import { loadPublicStations, stationSlug, idFromSlug, type PublicStation } from '@/lib/map/publicStations.server'
import { nearbyPlaces } from '@/lib/map/nearby.server'
import { DISPLAY_LABEL, type DisplayState } from '@/lib/map/status'
import { stationMarkerState, STATE_MARKER_COLOR, POI_LABEL } from '@/lib/map/openStyle'
import { PARISHES } from '@/lib/map/parishes'
import QuickReport from '../../_components/QuickReport'
import StationMiniMap from './StationMiniMap'

/**
 * One page per published charger (roadmap M3) — what search engines index
 * and what people share. Status is derived exactly as on the map (same
 * loader), so a page never claims more than the map does.
 */

export const revalidate = 300

const ICON: Record<DisplayState, typeof CircleCheck> = { available: CircleCheck, status_unknown: CircleHelp, out_of_service: CircleX }
const ACCESS_TEXT: Record<string, string> = {
  public: 'Open to the public',
  customers_only: 'Customers only',
  restricted: 'Restricted access',
  private: 'Private',
  unknown: 'Public access not confirmed',
}

async function load(slug: string): Promise<PublicStation | null> {
  const id = idFromSlug(slug)
  if (!id) return null
  const [s] = await loadPublicStations({ id })
  return s ?? null
}

const parishName = (id: string) => PARISHES.find((p) => p.id === id)?.name ?? id

function connectorsText(s: PublicStation) {
  return [...new Set(s.connectorGroups.map((g) => g.connectorType))].join(', ')
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const s = await load((await params).slug)
  if (!s) return { title: 'Charger not found', robots: { index: false } }
  const where = [s.address, parishName(s.parish)].filter(Boolean).join(', ')
  const title = `${s.name} — EV charging in ${parishName(s.parish)}`
  const description = `${s.closed ? 'Closed. ' : ''}EV charger at ${where}${s.operator?.name ? `, run by ${s.operator.name}` : ''}. Connectors: ${connectorsText(s) || 'not confirmed'}. Status, access, hours and directions on the Jamaica Energy Map.`
  const url = `${SITE_URL}/energy-map/station/${stationSlug(s)}`
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: 'website' } }
}

export default async function StationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const s = await load(slug)
  if (!s) notFound()
  const canonical = stationSlug(s)
  if (slug !== canonical) permanentRedirect(`/energy-map/station/${canonical}`)

  const state = s.closed ? null : stationMarkerState(s.connectorGroups.map((g) => g.status?.state))
  const nearby = await nearbyPlaces(s)
  const Icon = state ? ICON[state] : CircleX
  const color = state ? STATE_MARKER_COLOR[state] : '#7d8a84'
  const google = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`
  const waze = `https://waze.com/ul?ll=${s.lat},${s.lng}&navigate=yes`
  const url = `${SITE_URL}/energy-map/station/${canonical}`

  const place = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    '@id': url,
    name: s.name,
    url,
    description: `EV charging station${s.operator?.name ? ` operated by ${s.operator.name}` : ''}. Connectors: ${connectorsText(s) || 'not confirmed'}.`,
    address: { '@type': 'PostalAddress', ...(s.address ? { streetAddress: s.address } : {}), addressRegion: parishName(s.parish), addressCountry: 'JM' },
    geo: { '@type': 'GeoCoordinates', latitude: s.lat, longitude: s.lng },
    ...(s.hours ? { openingHours: s.hours } : {}),
    amenityFeature: s.connectorGroups.map((g) => ({ '@type': 'LocationFeatureSpecification', name: `${g.connectorType} (${g.currentType}${g.maxPowerKw != null ? `, up to ${g.maxPowerKw} kW` : ''})`, value: true })),
  }
  const crumbs = buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Jamaica Energy Map', path: '/energy-map' }, { name: s.name }])

  const notesText = s.pricingNotes ? `${s.pricingNotes}${s.pricingObservedAt ? ` (seen ${new Date(s.pricingObservedAt).toLocaleDateString('en-JM', { day: 'numeric', month: 'short', year: 'numeric' })})` : ''}` : null
  const facts: [string, ReactNode][] = [
    ['Access', [ACCESS_TEXT[s.access] ?? s.access, s.accessNotes].filter(Boolean).join(' — ')],
    ['Hours', s.hours ?? 'Not confirmed'],
    ['Paying', s.paymentNotes ?? 'Not confirmed'],
    [
      'Price',
      s.price ? (
        <>
          <ChargePrice price={s.price} />
          {notesText && <div className="ke-st__fine">{notesText}</div>}
        </>
      ) : s.connectorGroups.some((g) => g.price) ? (
        'Live prices differ by connector — shown with each connector above.'
      ) : (
        notesText ?? 'Not confirmed'
      ),
    ],
  ]

  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--ke-dark-text)', background: 'var(--ke-dark-bg)', minHeight: '100vh' }}>
      <JsonLd data={crumbs} />
      <JsonLd data={place} />
      <style>{CSS}</style>
      <Navbar />
      <main style={{ paddingTop: 64 }}>
        <div className="ke-st">
          <Link href="/energy-map" className="ke-st__back">
            <ArrowLeft size={15} aria-hidden /> Jamaica Energy Map
          </Link>
          <header>
            <div className="ke-st__eyebrow">EV CHARGING · {parishName(s.parish).toUpperCase()}</div>
            <h1>{s.name}</h1>
            <p className="ke-st__sub">{[s.operator?.name, s.address, parishName(s.parish)].filter(Boolean).join(' · ')}</p>
          </header>

          <div className="ke-st__grid">
            <div className="ke-st__main">
              <section className="ke-st__card" aria-labelledby="st-status">
                <h2 id="st-status" className="ke-st__status" style={{ color }}>
                  <Icon size={22} aria-hidden /> {s.closed ? 'Closed' : DISPLAY_LABEL[state as DisplayState]}
                </h2>
                {!s.closed && (
                  <ul className="ke-st__groups">
                    {s.connectorGroups.map((g) => (
                      <li key={g.id}>
                        <div>
                          <strong>{g.connectorType}</strong> · {g.currentType}
                          {g.maxPowerKw != null && <> · up to {g.maxPowerKw} kW</>}
                          {g.count != null && <> · {g.count} connector{g.count === 1 ? '' : 's'}</>}
                          {g.portsShared && <> · shares a port</>}
                        </div>
                        {g.status && (
                          <div className="ke-st__detail">
                            {DISPLAY_LABEL[g.status.state]} — {g.status.detail}
                          </div>
                        )}
                        {g.price && (
                          <div className="ke-st__detail">
                            <ChargePrice price={g.price} compact />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="ke-st__fine">“Available” means confirmed working recently, not that a connector is free right now.</p>
                {!s.closed && <StationForMyCar groups={s.connectorGroups} price={s.price ?? s.connectorGroups.find((g) => g.price)?.price ?? null} />}
                {!s.closed && <QuickReport stationId={s.id} />}
              </section>

              <section className="ke-st__card" aria-labelledby="st-info">
                <h2 id="st-info" className="ke-st__h2">Before you go</h2>
                <dl className="ke-st__facts">
                  {facts.map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
                {(s.operator?.website || s.operator?.appInfo) && (
                  <p className="ke-st__fine">
                    {s.operator?.appInfo && <>{s.operator.appInfo} </>}
                    {s.operator?.website && (
                      <a href={s.operator.website} target="_blank" rel="noopener noreferrer" className="ke-st__link">
                        {s.operator.name} website <ExternalLink size={12} aria-hidden />
                      </a>
                    )}
                  </p>
                )}
              </section>

              {nearby && nearby.length > 0 && (
                <section className="ke-st__card" aria-labelledby="st-near">
                  <h2 id="st-near" className="ke-st__h2">While you charge</h2>
                  <p className="ke-st__fine">Places within a short walk, from OpenStreetMap and Overture Maps. Opening hours aren’t checked.</p>
                  <ul className="ke-st__near">
                    {nearby.map((p) => (
                      <li key={p.name}>
                        <span>
                          {p.name}
                          <small>{p.category ? p.category.replace(/_/g, ' ') : POI_LABEL[p.kind]}</small>
                        </span>
                        <span className="ke-st__dist">{p.metres < 1000 ? `${Math.max(10, Math.round(p.metres / 10) * 10)} m` : `${(p.metres / 1000).toFixed(1)} km`}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <aside className="ke-st__side">
              <StationMiniMap lat={s.lat} lng={s.lng} name={s.name} color={color} />
              <div className="ke-st__actions">
                <a href={google} target="_blank" rel="noopener noreferrer" className="ke-st__btn ke-st__btn--primary">
                  <Navigation size={15} aria-hidden /> Directions
                </a>
                <a href={waze} target="_blank" rel="noopener noreferrer" className="ke-st__btn">
                  Waze
                </a>
              </div>
              <p className="ke-st__fine">
                <MapPin size={12} aria-hidden /> {s.lat.toFixed(5)}, {s.lng.toFixed(5)}
              </p>
              {s.sources.length > 0 && (
                <div className="ke-st__card ke-st__card--small">
                  <h2 className="ke-st__h3">Sources</h2>
                  <ul>
                    {s.sources.map((src, i) => (
                      <li key={i}>
                        {src.url ? (
                          <a href={src.url} target="_blank" rel="noopener noreferrer" className="ke-st__link">
                            {src.sourceName}
                          </a>
                        ) : (
                          src.sourceName
                        )}
                        {src.verifiedAt && <> · verified {new Date(src.verifiedAt).toLocaleDateString('en-JM', { day: 'numeric', month: 'short', year: 'numeric' })}</>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="ke-st__fine">
                Something wrong or out of date? Use the buttons above or <Link href="/contact" className="ke-st__link">contact us</Link>.
              </p>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

const CSS = `
.ke-st{max-width:1100px;margin:0 auto;padding:40px 20px 80px}
.ke-st__back{display:inline-flex;align-items:center;gap:6px;color:var(--ke-green-400);font-weight:600;font-size:14px;text-decoration:none;margin-bottom:28px}
.ke-st__eyebrow{font-family:var(--font-mono);font-size:12px;letter-spacing:.24em;color:var(--ke-green-400)}
.ke-st h1{font-family:var(--font-display);font-weight:800;font-size:clamp(30px,5vw,48px);line-height:1.06;letter-spacing:-.025em;color:#fff;margin:12px 0 0}
.ke-st__sub{color:var(--ke-dark-text-muted);font-size:16px;margin:10px 0 0}
.ke-st__grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:20px;margin-top:28px;align-items:start}
@media (max-width:820px){.ke-st__grid{grid-template-columns:1fr}.ke-st__side{order:-1}}
.ke-st__main,.ke-st__side{display:grid;gap:16px}
.ke-st__card{padding:22px;border-radius:20px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08);display:grid;gap:12px}
.ke-st__card--small{padding:16px;gap:6px}
.ke-st__card--small ul{margin:0;padding-left:16px;font-size:13px;line-height:1.6}
.ke-st__status{display:flex;align-items:center;gap:10px;margin:0;font-family:var(--font-display);font-size:22px;font-weight:700}
.ke-st__h2{margin:0;font-family:var(--font-display);font-size:19px;font-weight:700;color:#fff}
.ke-st__h3{margin:0;font-size:14px;font-weight:700;color:#fff}
.ke-st__groups{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.ke-st__groups li{padding:12px 14px;border-radius:12px;background:rgba(255,255,255,.03);color:#fff;font-size:14.5px}
.ke-st__detail{color:var(--ke-dark-text-muted);font-size:13px;margin-top:4px}
.ke-st__fine{margin:0;color:var(--ke-dark-text-muted);font-size:12.5px;line-height:1.55}
.ke-st__facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin:0}
.ke-st__facts dt{font-size:12px;color:var(--ke-dark-text-muted)}
.ke-st__facts dd{margin:2px 0 0;color:#fff;font-size:14.5px;line-height:1.45}
.ke-st__near{list-style:none;margin:0;padding:0;display:grid;gap:2px}
.ke-st__near li{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06);color:#fff;font-size:14.5px}
.ke-st__near small{display:block;color:var(--ke-dark-text-muted);font-size:12px;text-transform:capitalize}
.ke-st__dist{color:var(--ke-dark-text-muted);font-variant-numeric:tabular-nums;white-space:nowrap}
.ke-st__actions{display:flex;gap:8px}
.ke-st a.ke-st__btn,.ke-st a.ke-st__btn:visited,.ke-st a.ke-st__btn:hover{color:#fff}
.ke-st__btn{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:7px;height:42px;border-radius:12px;border:1px solid rgba(255,255,255,.16);color:#fff;font-weight:600;font-size:14px;text-decoration:none}
.ke-st__btn--primary{background:#2f80ed;border-color:transparent}
.ke-st__btn:hover{filter:brightness(1.08)}
.ke-st__link{color:var(--ke-green-400);font-weight:600;text-decoration:none;display:inline-flex;align-items:center;gap:4px}
.ke-st__map{height:280px;border-radius:18px;overflow:hidden;background:#a7d3ee}
`
