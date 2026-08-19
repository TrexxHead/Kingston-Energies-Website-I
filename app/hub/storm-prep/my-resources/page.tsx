'use client'

import { useEffect, useState } from 'react'
import { Boxes, Info } from 'lucide-react'
import Topbar from '../../_components/Topbar'
import { wizardCard } from '../../energy-checkup/_components/shared'
import { Field, inputStyle } from '@/components/shop/ui'
import StormPrepSubNav from '../_components/SubNav'

const STORAGE_KEY = 'ke-storm-my-resources'

interface ResourceStock {
  waterDays: string
  foodDays: string
  fuelLitres: string
  medicationDays: string
  suppliesNotes: string
}

const EMPTY: ResourceStock = { waterDays: '', foodDays: '', fuelLitres: '', medicationDays: '', suppliesNotes: '' }

const FIELDS: { key: keyof ResourceStock; label: string; type: 'number' | 'text'; suffix?: string }[] = [
  { key: 'waterDays', label: 'Drinking water on hand', type: 'number', suffix: 'days’ supply' },
  { key: 'foodDays', label: 'Non-perishable food on hand', type: 'number', suffix: 'days’ supply' },
  { key: 'fuelLitres', label: 'Fuel stored (generator/vehicle)', type: 'number', suffix: 'litres' },
  { key: 'medicationDays', label: 'Prescription medication on hand', type: 'number', suffix: 'days’ supply' },
]

function daysColor(days: string): string {
  const n = Number(days)
  if (!days || Number.isNaN(n)) return 'var(--color-text-subtle)'
  if (n < 3) return '#c0392b'
  if (n < 7) return '#b8720f'
  return 'var(--ke-green-600)'
}

export default function MyResourcesPage() {
  const [stock, setStock] = useState<ResourceStock>(EMPTY)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setStock({ ...EMPTY, ...JSON.parse(raw) })
    } catch { /* ignore */ }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stock))
    } catch { /* ignore */ }
  }, [stock, loaded])

  function update<K extends keyof ResourceStock>(key: K, value: ResourceStock[K]) {
    setStock((s) => ({ ...s, [key]: value }))
  }

  return (
    <>
      <Topbar title="Storm prep" subtitle="My resources" />
      <div className="ke-screen" style={{ padding: 32 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <StormPrepSubNav />

          <div style={{ ...wizardCard, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Boxes size={16} color="var(--ke-green-600)" />
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, margin: 0 }}>What you actually have on hand</h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '6px 0 20px', maxWidth: 600 }}>
              A running inventory, not a shopping list — how many days each supply would actually last if the power
              (or the roads) went out today. Update it as you use things up or restock.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 18 }}>
              {FIELDS.map((f) => (
                <Field key={f.key} label={f.label}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={f.type}
                      min={0}
                      value={stock[f.key]}
                      onChange={(e) => update(f.key, e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  {f.suffix && (
                    <div style={{ fontSize: 11.5, marginTop: 6, color: daysColor(stock[f.key]), fontWeight: 600 }}>
                      {stock[f.key] ? `${stock[f.key]} ${f.suffix}` : 'Not tracked yet'}
                    </div>
                  )}
                </Field>
              ))}
            </div>

            <Field label="Other supplies (batteries, first aid, flashlights, cash, documents…)">
              <textarea
                value={stock.suppliesNotes}
                onChange={(e) => update('suppliesNotes', e.target.value)}
                rows={3}
                placeholder={'e.g.\nBatteries: AA×20, AAA×12\nFirst aid kit: checked June\nCash: J$15,000 kept aside'}
                style={{ ...inputStyle, height: 'auto', padding: '11px 14px', resize: 'vertical' }}
              />
            </Field>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--ke-mist)', borderRadius: 14, padding: '14px 18px' }}>
            <Info size={15} color="var(--color-text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.6 }}>
              This inventory lives in this browser only — Kingston Energies doesn&apos;t store it against your
              account. Red means under 3 days, amber means under a week.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
