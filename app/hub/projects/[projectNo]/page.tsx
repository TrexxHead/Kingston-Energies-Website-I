import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { customerProject } from '@/lib/solarProjects.server'
import { STAGES, stageIndex, DOC_KINDS, QUOTE_SECTIONS, quoteTotals, designSummaryLines, type DesignSnapshot, type Quote, type DocKind, type QuoteSection } from '@/lib/solarProjects'
import Topbar from '../../_components/Topbar'
import QuoteDecision from './QuoteDecision'

const money = (n: number) => `J$${n.toLocaleString('en-JM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const box = { padding: 22, borderRadius: 20, background: 'var(--color-surface)', border: '1px solid var(--color-border)' } as const
const h2 = { margin: '0 0 12px', fontFamily: 'var(--font-display)', fontSize: 19 } as const

export default async function HubProjectPage({ params }: { params: Promise<{ projectNo: string }> }) {
  const { projectNo } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) notFound()
  const p = await customerProject({ id: session.user.id, email: session.user.email }, projectNo).catch(() => null)
  if (!p) notFound()
  const d = p.design as unknown as DesignSnapshot
  const q = p.quote && (p.quoteStatus === 'sent' || p.quoteStatus === 'accepted' || p.quoteStatus === 'declined') ? (p.quote as unknown as Quote) : null
  const totals = q ? quoteTotals(q) : null
  const current = stageIndex(p.stage)
  const cancelled = p.stage === 'cancelled'
  const validUntil = q && p.quoteSentAt ? new Date(p.quoteSentAt.getTime() + q.validDays * 86_400_000) : null

  return (
    <>
      <Topbar title={`Solar project ${p.projectNo}`} subtitle={`${d.kwp.toFixed(2)} kW · sent ${p.createdAt.toLocaleDateString('en-JM', { day: 'numeric', month: 'long', year: 'numeric' })}`} />
      <div className="ke-screen" style={{ padding: 32, display: 'grid', gap: 16, maxWidth: 980 }}>
        <style>{CSS}</style>
        <Link href="/hub/projects" style={{ color: 'var(--color-text-muted)', fontSize: 13.5 }}>← All projects</Link>

        <section style={box} aria-labelledby="pt-track">
          <h2 id="pt-track" style={h2}>{cancelled ? 'This project was cancelled' : 'Where it is'}</h2>
          {!cancelled && (
            <ol className="ke-pt-track">
              {STAGES.map((s, i) => (
                <li key={s.id} className={i < current ? 'done' : i === current ? 'now' : ''} aria-current={i === current ? 'step' : undefined}>
                  <span className="dot" aria-hidden />
                  <span className="lbl">{s.label}</span>
                </li>
              ))}
            </ol>
          )}
          {!cancelled && current >= 0 && <p style={{ margin: '14px 0 0', color: 'var(--color-text)' }}>{STAGES[current].customer}</p>}
          {p.stage === 'enquiry' && !p.bookingNo && (
            <Link href={`/book?project=${p.projectNo}`} className="ke-pt-btn">
              Pick a survey time
            </Link>
          )}
        </section>

        {q && totals && (
          <section style={box} aria-labelledby="pt-quote">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
              <h2 id="pt-quote" style={h2}>Your quotation</h2>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                {p.quoteStatus === 'accepted' ? `Accepted ${p.quoteAcceptedAt?.toLocaleDateString('en-JM')}` : p.quoteStatus === 'declined' ? 'Declined' : validUntil ? `Valid until ${validUntil.toLocaleDateString('en-JM', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
              </span>
            </div>
            <p style={{ margin: '0 0 12px', color: 'var(--color-text-muted)', fontSize: 14 }}>
              {q.sizing.modules} × {q.sizing.moduleWatts} W panels ({q.sizing.kwp.toFixed(2)} kWp){q.sizing.inverterKw ? `, ${q.sizing.inverterKw} kW inverter` : ''}
              {q.sizing.batteryKwh ? `, ${q.sizing.batteryKwh.toFixed(1)} kWh battery` : ''} — about {q.sizing.expectedDailyKwh.toFixed(1)} kWh a day.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table className="ke-pt-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(QUOTE_SECTIONS) as QuoteSection[]).flatMap((sec) => {
                    const rows = q.lines.filter((l) => l.section === sec)
                    if (!rows.length) return []
                    return [
                      <tr key={sec} className="sec">
                        <td colSpan={3}>{QUOTE_SECTIONS[sec]}</td>
                      </tr>,
                      ...rows.map((l) => (
                        <tr key={l.id}>
                          <td>
                            {l.item}
                            {l.spec && <small>{l.spec}</small>}
                          </td>
                          <td>
                            {l.qty} {l.unit}
                          </td>
                          <td style={{ textAlign: 'right' }}>{l.unitPrice != null ? money(l.qty * l.unitPrice) : '—'}</td>
                        </tr>
                      )),
                    ]
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}>Subtotal</td>
                    <td style={{ textAlign: 'right' }}>{money(totals.subtotal)}</td>
                  </tr>
                  {totals.gct > 0 && (
                    <tr>
                      <td colSpan={2}>GCT ({q.gctRatePct}%)</td>
                      <td style={{ textAlign: 'right' }}>{money(totals.gct)}</td>
                    </tr>
                  )}
                  <tr className="total">
                    <td colSpan={2}>Total</td>
                    <td style={{ textAlign: 'right' }}>{money(totals.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {q.notes && <p style={{ margin: '12px 0 0', color: 'var(--color-text)', whiteSpace: 'pre-wrap', fontSize: 14 }}>{q.notes}</p>}
            {p.quoteStatus === 'sent' && <QuoteDecision projectNo={p.projectNo} />}
          </section>
        )}

        <section style={box} aria-labelledby="pt-docs">
          <h2 id="pt-docs" style={h2}>Documents</h2>
          {p.documents.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>Your design drawings, test results, inspector’s certificate and handover record will appear here as the project goes on.</p>
          ) : (
            <ul className="ke-pt-docs">
              {p.documents.map((doc) => (
                <li key={doc.id}>
                  <a href={doc.url ?? `/api/hub/projects/${p.projectNo}/documents/${doc.id}`} target="_blank" rel="noopener noreferrer">
                    {doc.name}
                  </a>
                  <span>{DOC_KINDS[doc.kind as DocKind] ?? doc.kind} · {doc.createdAt.toLocaleDateString('en-JM')}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section style={box} aria-labelledby="pt-design">
          <h2 id="pt-design" style={h2}>The design you sent</h2>
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--color-text)', fontSize: 14, lineHeight: 1.6 }}>
            {designSummaryLines(d).map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </section>

        {p.events.length > 0 && (
          <section style={box} aria-labelledby="pt-log">
            <h2 id="pt-log" style={h2}>Updates</h2>
            <ul className="ke-pt-log">
              {p.events.map((e) => (
                <li key={e.id}>
                  <time>{e.createdAt.toLocaleString('en-JM', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</time>
                  <span>{e.note ?? (e.stage ? STAGES.find((s) => s.id === e.stage)?.label : '')}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  )
}

const CSS = `
.ke-pt-track{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:4px}
.ke-pt-track li{display:grid;gap:6px;justify-items:center;text-align:center;font-size:11.5px;color:var(--color-text-muted);position:relative}
.ke-pt-track li:before{content:"";position:absolute;top:6px;left:-50%;right:50%;height:2px;background:var(--color-border)}
.ke-pt-track li:first-child:before{display:none}
.ke-pt-track li.done:before,.ke-pt-track li.now:before{background:var(--color-primary)}
.ke-pt-track .dot{position:relative;z-index:1;width:14px;height:14px;border-radius:999px;border:2px solid var(--color-border-strong);background:var(--color-surface)}
.ke-pt-track li.done .dot{background:var(--color-primary);border-color:var(--color-primary)}
.ke-pt-track li.now .dot{border-color:var(--color-primary);box-shadow:0 0 0 4px var(--color-primary-soft)}
.ke-pt-track li.now .lbl{color:var(--color-text);font-weight:700}
@media (max-width:760px){.ke-pt-track{grid-template-columns:1fr;gap:10px}.ke-pt-track li{grid-template-columns:14px 1fr;justify-items:start;text-align:left;gap:10px}.ke-pt-track li:before{display:none}}
.ke-pt-btn{display:inline-flex;margin-top:14px;padding:10px 18px;border-radius:999px;background:var(--color-primary);color:var(--color-primary-contrast)!important;font-weight:700;text-decoration:none}
.ke-pt-table{width:100%;border-collapse:collapse;font-size:14px;min-width:520px}
.ke-pt-table th{text-align:left;font-size:12.5px;color:var(--color-text-muted);padding:8px;border-bottom:1px solid var(--color-border)}
.ke-pt-table td{padding:8px;border-bottom:1px solid var(--color-border);vertical-align:top}
.ke-pt-table td small{display:block;color:var(--color-text-muted);font-size:12.5px}
.ke-pt-table tr.sec td{font-weight:700;background:var(--color-bg-subtle);font-size:13px}
.ke-pt-table tfoot td{font-weight:600;border-bottom:0}
.ke-pt-table tr.total td{font-size:16px;font-weight:800;border-top:2px solid var(--color-border-strong)}
.ke-pt-docs,.ke-pt-log{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.ke-pt-docs li{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:10px 12px;border-radius:12px;background:var(--color-bg-subtle)}
.ke-pt-docs span,.ke-pt-log time{color:var(--color-text-muted);font-size:13px}
.ke-pt-log li{display:grid;grid-template-columns:120px 1fr;gap:12px;font-size:14px}
`
