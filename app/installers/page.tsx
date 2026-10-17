import Link from 'next/link'
import { BadgeCheck, Phone, Mail, Globe } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import JsonLd from '@/components/JsonLd'
import { buildBreadcrumbs } from '@/lib/structuredData'
import { prisma } from '@/lib/prisma'
import { publishProblem } from '@/lib/installers'
import { PARISHES } from '@/lib/map/parishes'

export const metadata = {
  title: 'Licensed solar and electrical installers in Jamaica',
  description: 'Installers whose electrical licence Kingston Energies has checked — with what we saw and when — for solar, battery backup and EV charger installs.',
}
export const revalidate = 600

const breadcrumbs = buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Installer directory' }])
const parishName = (id: string) => PARISHES.find((p) => p.id === id)?.name ?? id
const date = (d: Date) => d.toLocaleDateString('en-JM', { day: 'numeric', month: 'short', year: 'numeric' })

export default async function InstallersPage({ searchParams }: { searchParams: Promise<{ parish?: string; service?: string }> }) {
  const { parish, service } = await searchParams
  const rows = await prisma.installer.findMany({ where: { status: 'published' }, orderBy: { name: 'asc' } }).catch(() => null)
  // Expired licences drop off at once, even before staff unpublish.
  const listed = (rows ?? []).filter((i) => !publishProblem(i))
  const shown = listed.filter((i) => (!parish || i.parishes.includes(parish)) && (!service || i.services.includes(service)))
  const services = [...new Set(listed.flatMap((i) => i.services))].sort()

  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--ke-dark-text)', background: 'var(--ke-dark-bg)', minHeight: '100vh' }}>
      <JsonLd data={breadcrumbs} />
      <style>{CSS}</style>
      <Navbar />
      <main style={{ paddingTop: 64 }}>
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 20px 28px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.3em', color: 'var(--ke-green-400)' }}>INSTALLER DIRECTORY</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(34px,6vw,56px)', lineHeight: 1.04, letterSpacing: '-.03em', color: '#fff', margin: '16px 0 0' }}>
            Licensed installers
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: 'rgba(234,242,236,.72)', margin: '18px 0 0', maxWidth: 680 }}>
            Every installer here showed us their electrical licence. We say what we checked and when — it isn’t a guarantee of their work, so get more than one quote.
          </p>
        </section>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 80px', display: 'grid', gap: 16 }}>
          {listed.length > 0 && (
            <form className="ke-in-filters" method="get">
              <select name="parish" defaultValue={parish ?? ''} aria-label="Parish">
                <option value="">All parishes</option>
                {PARISHES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select name="service" defaultValue={service ?? ''} aria-label="Service">
                <option value="">All services</option>
                {services.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button type="submit">Filter</button>
            </form>
          )}
          {rows === null ? (
            <p className="ke-in-empty">The directory can’t be loaded right now.</p>
          ) : listed.length === 0 ? (
            <p className="ke-in-empty">We’re checking installers’ licences now — the first listings will appear here soon. Need help today? <Link href="/book">Book a visit</Link> or <Link href="/contact">contact us</Link>.</p>
          ) : shown.length === 0 ? (
            <p className="ke-in-empty">No listed installer matches that filter yet.</p>
          ) : (
            <ul className="ke-in-list">
              {shown.map((i) => (
                <li key={i.id}>
                  <div>
                    <h2>{i.name}</h2>
                    {i.business && <p className="ke-in-sub">{i.business}</p>}
                    <p className="ke-in-sub">{i.services.join(' · ')}</p>
                    <p className="ke-in-sub">Serves {i.parishes.length === 14 ? 'all parishes' : i.parishes.map(parishName).join(', ')}</p>
                  </div>
                  <div className="ke-in-licence">
                    <BadgeCheck size={16} aria-hidden /> {i.licenceType}
                    {i.licenceExpires && <> · valid to {date(i.licenceExpires)}</>}
                    <small>Licence seen by Kingston Energies, {date(i.verifiedAt!)}</small>
                  </div>
                  <div className="ke-in-contact">
                    {i.phone && <a href={`tel:${i.phone}`}><Phone size={14} aria-hidden /> {i.phone}</a>}
                    {i.email && <a href={`mailto:${i.email}`}><Mail size={14} aria-hidden /> Email</a>}
                    {i.website && <a href={i.website} target="_blank" rel="noopener noreferrer nofollow"><Globe size={14} aria-hidden /> Website</a>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="ke-in-fine">Installers aren’t paid placements. To be listed, or to report a problem with a listing, <Link href="/contact">contact us</Link>.</p>
        </div>
      </main>
      <Footer />
    </div>
  )
}

const CSS = `
.ke-in-filters{display:flex;gap:8px;flex-wrap:wrap}
.ke-in-filters select,.ke-in-filters button{height:40px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);color:#fff;font:inherit;font-size:14px;padding:0 12px}
.ke-in-filters button{background:var(--ke-green-500);color:#0d1714;font-weight:700;border:0;cursor:pointer}
.ke-in-empty{margin:0;padding:22px;border-radius:18px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08);color:#fff;line-height:1.6}
.ke-in-empty a,.ke-in-fine a{color:var(--ke-green-400);font-weight:600}
.ke-in-list{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.ke-in-list li{padding:20px;border-radius:18px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08);display:grid;gap:12px}
.ke-in-list h2{margin:0;font-family:var(--font-display);font-size:19px;color:#fff}
.ke-in-sub{margin:4px 0 0;color:var(--ke-dark-text-muted);font-size:14px}
.ke-in-licence{display:flex;flex-wrap:wrap;gap:6px;align-items:center;color:var(--ke-green-400);font-size:13.5px;font-weight:600}
.ke-in-licence small{width:100%;color:var(--ke-dark-text-muted);font-weight:400;font-size:12.5px}
.ke-in-contact{display:flex;gap:14px;flex-wrap:wrap}
.ke-in-contact a{display:inline-flex;gap:6px;align-items:center;color:#fff;text-decoration:none;font-size:14px;font-weight:600}
.ke-in-fine{margin:0;color:var(--ke-dark-text-muted);font-size:12.5px}
`
