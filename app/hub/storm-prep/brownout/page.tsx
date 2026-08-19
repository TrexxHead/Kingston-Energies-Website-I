'use client'

import { ShieldAlert, TriangleAlert, PlugZap } from 'lucide-react'
import Topbar from '../../_components/Topbar'
import { wizardCard } from '../../energy-checkup/_components/shared'
import StormPrepSubNav from '../_components/SubNav'

const SIGNS = [
  { title: 'Brownout (low voltage)', text: 'Lights dim or flicker, fans and motors run slower or sound strained, some devices restart or refuse to power on at all.' },
  { title: 'Surge', text: 'A brief spike above normal voltage — often as power is being restored after an outage.' },
  { title: 'Repeated short outages', text: 'Power cutting out and coming back over and over, rather than one clean loss.' },
]

const VULNERABLE = [
  'Refrigerator and freezer compressors',
  'Air conditioner compressors',
  'Water pumps and other motors',
  'Anything with sensitive electronics — TVs, computers, routers',
]

export default function BrownoutPage() {
  return (
    <>
      <Topbar title="Storm prep" subtitle="Brownout / low-voltage mode" />
      <div className="ke-screen" style={{ padding: 32 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <StormPrepSubNav />

          <div style={{ ...wizardCard, marginBottom: 18, background: '#3a2410', border: '1px solid rgba(224,176,74,.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <ShieldAlert size={20} color="#e0b04a" />
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, margin: 0, color: '#fbe9c9' }}>
                My power is low or unstable
              </h2>
            </div>
            <p style={{ fontSize: 13.5, color: 'rgba(251,233,201,.85)', margin: 0, lineHeight: 1.6, maxWidth: 640 }}>
              Motors and compressors — the fridge, the AC, water pumps — are the equipment most vulnerable to abnormal
              supply. This page is general education, not a diagnosis of your specific wiring or equipment. For any
              condition you&apos;re not sure about, a licensed electrician or JPS itself is the right call, not this
              website.
            </p>
          </div>

          <div style={{ ...wizardCard, marginBottom: 18 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, margin: '0 0 14px' }}>What you might be seeing</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {SIGNS.map((s) => (
                <div key={s.title}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5 }}>{s.title}</div>
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '4px 0 0', lineHeight: 1.55 }}>{s.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...wizardCard, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <PlugZap size={16} color="var(--ke-green-600)" />
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, margin: 0 }}>What&apos;s most at risk</h3>
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {VULNERABLE.map((v) => (
                <li key={v} style={{ fontSize: 13.5, color: 'var(--color-text-muted)' }}>{v}</li>
              ))}
            </ul>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--ke-sun-50)', border: '1px solid rgba(247,148,30,.3)', borderRadius: 14, padding: '16px 18px' }}>
            <TriangleAlert size={16} color="var(--ke-sun-500)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, marginBottom: 6 }}>What we&apos;d suggest — conservatively</div>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.6 }}>
                If you're seeing clear signs of unstable supply — dimming, flickering, equipment cycling oddly — consider
                unplugging your most sensitive or valuable equipment (fridge, AC, electronics) until supply looks normal
                again, and follow any guidance from JPS or a licensed electrician for your specific situation. This site
                does not sell or install surge protection or voltage-regulation equipment, and this page is not a
                substitute for a professional inspection of your home's wiring.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
