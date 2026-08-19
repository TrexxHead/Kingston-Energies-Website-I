'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import Topbar from '../../_components/Topbar'
import { wizardCard } from '../../energy-checkup/_components/shared'
import { Badge } from '@/components/shop/ui'
import StormPrepSubNav from '../_components/SubNav'
import { CHECKLIST, loadChecked, saveChecked } from '../_lib/checklist'

export default function StormPrepChecklistPage() {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setChecked(loadChecked())
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    saveChecked(checked)
  }, [checked, loaded])

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const done = checked.size
  const pct = Math.round((done / CHECKLIST.length) * 100)

  return (
    <>
      <Topbar title="Storm prep" subtitle="Before the power goes" />
      <div className="ke-screen" style={{ padding: 32 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <StormPrepSubNav />

          <div style={wizardCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, margin: 0 }}>Before the power goes</h3>
              <Badge tone={pct === 100 ? 'green' : 'neutral'}>{done} of {CHECKLIST.length} done</Badge>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: 'var(--ke-gray-100)', overflow: 'hidden', margin: '12px 0 18px' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--ke-green-500)', transition: 'width .4s var(--ease-out)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {CHECKLIST.map((item) => {
                const isChecked = checked.has(item.id)
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggle(item.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                      padding: '10px 8px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      background: 'transparent',
                    }}
                  >
                    <span
                      style={{
                        width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                        border: isChecked ? 'none' : '1.5px solid var(--color-border-strong)',
                        background: isChecked ? 'var(--ke-green-500)' : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {isChecked && <Check size={13} color="#fff" />}
                    </span>
                    <span style={{ fontSize: 13.5, lineHeight: 1.5, color: isChecked ? 'var(--color-text-muted)' : 'var(--color-text)', textDecoration: isChecked ? 'line-through' : 'none' }}>
                      {item.text}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
