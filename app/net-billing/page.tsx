import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import JsonLd from '@/components/JsonLd'
import { buildBreadcrumbs } from '@/lib/structuredData'
import NetBillingTracker from './_components/NetBillingTracker'
import { NET_BILLING_STEPS, OFFICIAL_LINKS } from './_components/steps'

export const metadata = {
  title: 'Net billing in Jamaica: going solar with JPS, step by step',
  description: 'The steps from quote to a two-way JPS meter for grid-connected solar, with a tracker for your own progress and links to JPS and the OUR for the official requirements.',
}

const breadcrumbs = buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Net billing guide' }])

export default function NetBillingPage() {
  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--ke-dark-text)', background: 'var(--ke-dark-bg)', minHeight: '100vh' }}>
      <JsonLd data={breadcrumbs} />
      <style>{CSS}</style>
      <Navbar />
      <main style={{ paddingTop: 64 }}>
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 20px 28px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.3em', color: 'var(--ke-green-400)' }}>NET BILLING</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(34px,6vw,56px)', lineHeight: 1.04, letterSpacing: '-.03em', color: '#fff', margin: '16px 0 0' }}>
            Going solar with JPS, step by step
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: 'rgba(234,242,236,.72)', margin: '18px 0 0', maxWidth: 700 }}>
            With net billing, solar power you don’t use flows to the grid and JPS credits it on your bill under a signed agreement. Here’s the general path from quote to two-way meter — and a place to keep track of yours.
          </p>
        </section>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 80px', display: 'grid', gap: 20 }}>
          <div className="ke-nb-two">
            <section className="ke-nb-card" aria-labelledby="nb-steps">
              <h2 id="nb-steps" className="ke-nb-h2">The steps</h2>
              <ol className="ke-nb-steps">
                {NET_BILLING_STEPS.map((s) => (
                  <li key={s.id}>
                    <strong>{s.title}</strong>
                    <p>{s.body}</p>
                  </li>
                ))}
              </ol>
            </section>
            <div style={{ display: 'grid', gap: 20, alignContent: 'start' }}>
              <NetBillingTracker />
              <section className="ke-nb-card" aria-labelledby="nb-official">
                <h2 id="nb-official" className="ke-nb-h2">Official requirements</h2>
                <p className="ke-nb-muted">
                  Forms, fees, size limits and how exported power is credited are set by JPS and regulated by the OUR, and they change. Check the current versions before you sign anything — we don’t quote them here.
                </p>
                <ul className="ke-nb-links">
                  {OFFICIAL_LINKS.map((l) => (
                    <li key={l.href}>
                      <a href={l.href} target="_blank" rel="noopener noreferrer">
                        {l.label} <ExternalLink size={13} aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="ke-nb-card" aria-labelledby="nb-tools">
                <h2 id="nb-tools" className="ke-nb-h2">Plan it</h2>
                <ul className="ke-nb-links">
                  <li><Link href="/solar">Rooftop solar estimator — size and yearly output for your roof</Link></li>
                  <li><Link href="/financing">Financing calculator — monthly cost of a loan</Link></li>
                  <li><Link href="/bill-explainer">Bill Explainer — understand your JPS bill</Link></li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

const CSS = `
.ke-nb-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:20px;align-items:start}
.ke-nb-card{padding:24px;border-radius:20px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08);display:grid;gap:12px}
.ke-nb-h2{margin:0;font-family:var(--font-display);font-size:20px;font-weight:700;color:#fff}
.ke-nb-muted{margin:0;color:var(--ke-dark-text-muted);font-size:13.5px;line-height:1.55}
.ke-nb-steps{margin:0;padding-left:22px;display:grid;gap:14px;color:#fff}
.ke-nb-steps li::marker{color:var(--ke-green-400);font-weight:700}
.ke-nb-steps p{margin:4px 0 0;color:var(--ke-dark-text-muted);font-size:14px;line-height:1.6}
.ke-nb-links{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.ke-nb-links a{color:var(--ke-green-400);font-weight:600;font-size:14px;text-decoration:none;display:inline-flex;gap:5px;align-items:center}
.ke-nb-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.ke-nb-list li{padding:12px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.08);display:grid;gap:10px}
.ke-nb-list li.is-current{border-color:rgba(110,200,90,.45);background:rgba(63,157,42,.07)}
.ke-nb-list li.is-done strong{color:var(--ke-dark-text-muted);text-decoration:line-through}
.ke-nb-head{display:flex;gap:10px;align-items:flex-start;cursor:pointer}
.ke-nb-head input{margin-top:3px;width:17px;height:17px;accent-color:var(--ke-green-500);flex:none}
.ke-nb-head strong{color:#fff;font-size:14.5px;display:block}
.ke-nb-head small{color:var(--ke-dark-text-muted);font-size:12.5px}
.ke-nb-fields{display:grid;grid-template-columns:150px 1fr;gap:8px}
@media (max-width:480px){.ke-nb-fields{grid-template-columns:1fr}}
`
