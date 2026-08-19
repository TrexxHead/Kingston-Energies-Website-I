'use client'

import { ShieldCheck, TriangleAlert, Camera, RefreshCw } from 'lucide-react'
import Topbar from '../../_components/Topbar'
import { wizardCard } from '../../energy-checkup/_components/shared'
import StormPrepSubNav from '../_components/SubNav'

const SAFETY_FIRST = [
  'Never touch a downed power line — treat every line as live and call JPS, not an electrician, to report it.',
  'Don’t walk or drive through standing water — it can hide damage, debris, or a live electrical hazard.',
  'If you smell gas or hear hissing, leave the area and ventilate before doing anything else.',
  'Let a generator or vehicle cool and ventilate fully before refueling.',
]

const RESTORE_STEPS = [
  'Photograph any damage before you clean up or move anything — insurers generally want photos first.',
  'Check refrigerated and frozen food for safety before eating it — when in doubt, throw it out.',
  'Inspect your backup power gear for damage before reconnecting anything to it.',
  'Restock what you used from your storm kit and My Resources inventory while it’s fresh in mind.',
]

export default function RecoverPage() {
  return (
    <>
      <Topbar title="Storm prep" subtitle="Recovering" />
      <div className="ke-screen" style={{ padding: 32 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <StormPrepSubNav />

          <div style={{ ...wizardCard, marginBottom: 18, background: '#0d1714', color: '#eaf2ec' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <ShieldCheck size={20} color="var(--ke-green-400)" />
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, margin: 0 }}>Power&apos;s back — safety first</h2>
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {SAFETY_FIRST.map((s) => (
                <li key={s} style={{ fontSize: 13, color: 'rgba(234,242,236,.85)', lineHeight: 1.55 }}>{s}</li>
              ))}
            </ul>
          </div>

          <div style={{ ...wizardCard, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Camera size={16} color="var(--ke-green-600)" />
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, margin: 0 }}>Cleaning up and restocking</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {RESTORE_STEPS.map((s) => (
                <div key={s} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                  <RefreshCw size={13} color="var(--ke-green-600)" style={{ flexShrink: 0, marginTop: 3 }} />
                  <span style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.55 }}>{s}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--ke-sun-50)', border: '1px solid rgba(247,148,30,.3)', borderRadius: 14, padding: '16px 18px' }}>
            <TriangleAlert size={16} color="var(--ke-sun-500)" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.6 }}>
              This is general safety guidance, not instructions specific to your property or a substitute for JPS, the
              fire brigade, or a licensed electrician for anything you&apos;re unsure about.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
