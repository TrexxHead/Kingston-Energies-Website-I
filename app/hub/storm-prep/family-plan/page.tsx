'use client'

import { useEffect, useState } from 'react'
import { Users, Download, Info } from 'lucide-react'
import Topbar from '../../_components/Topbar'
import { wizardCard } from '../../energy-checkup/_components/shared'
import { Field, inputStyle, Button } from '@/components/shop/ui'
import StormPrepSubNav from '../_components/SubNav'

const STORAGE_KEY = 'ke-storm-family-plan'

interface FamilyPlan {
  meetingPoint: string
  outOfAreaContact: string
  outOfAreaPhone: string
  localContact: string
  localPhone: string
  medicalNotes: string
  members: string
}

const EMPTY: FamilyPlan = {
  meetingPoint: '',
  outOfAreaContact: '',
  outOfAreaPhone: '',
  localContact: '',
  localPhone: '',
  medicalNotes: '',
  members: '',
}

function buildPlainText(plan: FamilyPlan): string {
  const line = (label: string, value: string) => `${label}: ${value.trim() || '—'}`
  return [
    'KINGSTON ENERGIES — FAMILY COMMUNICATION PLAN',
    `Saved ${new Date().toLocaleDateString('en-JM', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    '',
    'HOUSEHOLD MEMBERS',
    plan.members.trim() || '—',
    '',
    'MEETING POINT IF YOU CAN\'T GET HOME',
    line('Location', plan.meetingPoint),
    '',
    'OUT-OF-AREA CONTACT',
    '(Local lines can jam during a major storm — a contact outside the affected area is often easier to reach.)',
    line('Name', plan.outOfAreaContact),
    line('Phone', plan.outOfAreaPhone),
    '',
    'LOCAL EMERGENCY CONTACT',
    line('Name', plan.localContact),
    line('Phone', plan.localPhone),
    '',
    'MEDICAL NOTES',
    plan.medicalNotes.trim() || '—',
    '',
    'EMERGENCY NUMBERS (JAMAICA)',
    'Police: 119',
    'Fire & Ambulance: 110',
    'ODPEM: https://www.odpem.org.jm/',
    '',
    'This is a plan you fill in yourself — Kingston Energies does not verify or store these details on your',
    'behalf beyond this browser. Keep a printed or saved copy somewhere you can reach it without power or signal.',
  ].join('\n')
}

export default function FamilyPlanPage() {
  const [plan, setPlan] = useState<FamilyPlan>(EMPTY)
  const [loaded, setLoaded] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setPlan({ ...EMPTY, ...JSON.parse(raw) })
    } catch { /* ignore */ }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plan))
      setSaved(true)
      const t = setTimeout(() => setSaved(false), 1200)
      return () => clearTimeout(t)
    } catch { /* ignore */ }
  }, [plan, loaded])

  function update<K extends keyof FamilyPlan>(key: K, value: FamilyPlan[K]) {
    setPlan((p) => ({ ...p, [key]: value }))
  }

  function download() {
    const text = buildPlainText(plan)
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'kingston-energies-family-plan.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Topbar title="Storm prep" subtitle="Family communication plan" />
      <div className="ke-screen" style={{ padding: 32 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <StormPrepSubNav />

          <div style={{ ...wizardCard, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Users size={16} color="var(--ke-green-600)" />
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, margin: 0 }}>Family communication plan</h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '6px 0 20px', maxWidth: 620 }}>
              A short plan for how your household finds each other and gets help if phones or power go down. Fill it
              in once, download it, and keep a copy somewhere reachable without power or signal.
            </p>

            <div style={{ display: 'grid', gap: 18 }}>
              <Field label="Household members (name + age, one per line)">
                <textarea
                  value={plan.members}
                  onChange={(e) => update('members', e.target.value)}
                  rows={3}
                  placeholder={'e.g.\nMarcia Brown, 41\nDamian Brown, 44\nAaliyah Brown, 12'}
                  style={{ ...inputStyle, height: 'auto', padding: '11px 14px', resize: 'vertical' }}
                />
              </Field>

              <Field label="Meeting point if you can't get home">
                <input
                  type="text"
                  value={plan.meetingPoint}
                  onChange={(e) => update('meetingPoint', e.target.value)}
                  placeholder="e.g. Aunt Paulette's house, 12 Hope Road"
                  style={inputStyle}
                />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <Field label="Out-of-area contact name">
                  <input type="text" value={plan.outOfAreaContact} onChange={(e) => update('outOfAreaContact', e.target.value)} style={inputStyle} />
                </Field>
                <Field label="Out-of-area contact phone">
                  <input type="tel" value={plan.outOfAreaPhone} onChange={(e) => update('outOfAreaPhone', e.target.value)} style={inputStyle} />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <Field label="Local emergency contact name">
                  <input type="text" value={plan.localContact} onChange={(e) => update('localContact', e.target.value)} style={inputStyle} />
                </Field>
                <Field label="Local emergency contact phone">
                  <input type="tel" value={plan.localPhone} onChange={(e) => update('localPhone', e.target.value)} style={inputStyle} />
                </Field>
              </div>

              <Field label="Medical notes (allergies, medication, conditions)">
                <textarea
                  value={plan.medicalNotes}
                  onChange={(e) => update('medicalNotes', e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, height: 'auto', padding: '11px 14px', resize: 'vertical' }}
                />
              </Field>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
              <Button onClick={download} iconLeft={<Download size={15} />}>Download plan (.txt)</Button>
              <span style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>{saved ? 'Saved to this browser' : ''}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
              <Info size={13} color="var(--color-text-subtle)" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 11.5, color: 'var(--color-text-subtle)', margin: 0, lineHeight: 1.55 }}>
                Everything here stays in this browser (localStorage) and in the file you download — Kingston Energies
                doesn&apos;t send this to a server or store it against your account.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
