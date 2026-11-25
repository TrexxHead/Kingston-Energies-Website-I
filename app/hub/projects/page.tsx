import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { customerProjects } from '@/lib/solarProjects.server'
import { STAGES, stageIndex, stageLabel, TYPE_LABEL, type DesignSnapshot } from '@/lib/solarProjects'
import Topbar from '../_components/Topbar'

export default async function HubProjectsPage() {
  const session = await getServerSession(authOptions)
  const projects = session?.user?.id ? await customerProjects({ id: session.user.id, email: session.user.email }).catch(() => []) : []
  return (
    <>
      <Topbar title="Solar projects" subtitle="From your design to switch-on: where each project is, and its documents." />
      <div className="ke-screen" style={{ padding: 32, display: 'grid', gap: 16, maxWidth: 960 }}>
        {projects.length === 0 ? (
          <div style={{ padding: 28, borderRadius: 20, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 20 }}>No solar projects yet</h2>
            <p style={{ color: 'var(--color-text-muted)', margin: '8px 0 16px' }}>Design a system from your JPS bill, then send it to us for a survey and quote. Projects sent with this account’s e-mail show up here.</p>
            <Link href="/solar/design" style={{ display: 'inline-flex', padding: '10px 18px', borderRadius: 999, background: 'var(--color-primary)', color: 'var(--color-primary-contrast)', fontWeight: 700, textDecoration: 'none' }}>
              Design your system
            </Link>
          </div>
        ) : (
          projects.map((p) => {
            const d = p.design as unknown as DesignSnapshot
            const i = stageIndex(p.stage)
            const pct = p.stage === 'cancelled' ? 0 : ((i + 1) / STAGES.length) * 100
            return (
              <Link key={p.id} href={`/hub/projects/${p.projectNo}`} style={{ display: 'grid', gap: 10, padding: 22, borderRadius: 20, background: 'var(--color-surface)', border: '1px solid var(--color-border)', textDecoration: 'none', color: 'var(--color-text)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <strong style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>
                    {d.kwp.toFixed(2)} kW {TYPE_LABEL[d.type].toLowerCase()}
                  </strong>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>{p.projectNo}</span>
                </div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
                  {d.modules} panels{d.inverterKw ? ` · ${d.inverterKw} kW inverter` : ''}
                  {d.batteryKwh ? ` · ${d.batteryKwh.toFixed(1)} kWh battery` : ''} · sent {p.createdAt.toLocaleDateString('en-JM', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <div aria-hidden style={{ height: 6, borderRadius: 999, background: 'var(--color-border)', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-primary)' }} />
                </div>
                <span style={{ fontWeight: 600, fontSize: 14, color: p.quoteStatus === 'sent' ? 'var(--color-primary-strong)' : 'var(--color-text)' }}>
                  {stageLabel(p.stage)}
                  {p.quoteStatus === 'sent' ? ' — your quote is ready to review' : ''}
                </span>
              </Link>
            )
          })
        )}
      </div>
    </>
  )
}
