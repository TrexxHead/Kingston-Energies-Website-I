'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { card, muted, h2 } from '@/app/my-energy/_components/ui'
import { loadChecked, saveChecked } from '@/app/hub/storm-prep/_lib/checklist'
import { TIMING_LABEL, TIMING_ORDER, type StormChecklistItem } from '@/lib/stormPrepDefaults'

/**
 * The storm checklist (admin-editable content). Ticks are kept in this
 * browser under the same key as the signed-in Storm Prep hub, so progress
 * carries over when someone creates an account.
 */
export default function StormChecklist({ items }: { items: StormChecklistItem[] }) {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  useEffect(() => setChecked(loadChecked()), [])
  const toggle = (id: string) => {
    const next = new Set(checked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setChecked(next)
    saveChecked(next)
  }
  const done = items.filter((i) => checked.has(i.id)).length

  return (
    <section style={{ ...card, display: 'grid', gap: 14 }} aria-labelledby="cl-title">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h2 id="cl-title" style={h2}>Power checklist</h2>
        <span style={{ ...muted }} aria-live="polite">
          {done} of {items.length} done
        </span>
      </div>
      <div className="ke-sr-progress" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={done} aria-label="Checklist progress">
        <i style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} />
      </div>
      {TIMING_ORDER.map((t) => {
        const group = items.filter((i) => i.timing === t)
        if (!group.length) return null
        return (
          <fieldset key={t} className="ke-sr-group">
            <legend className="ke-sr-h3">{TIMING_LABEL[t]}</legend>
            {group.map((i) => (
              <label key={i.id} className="ke-sr-item">
                <input type="checkbox" checked={checked.has(i.id)} onChange={() => toggle(i.id)} />
                <span>{i.text}</span>
              </label>
            ))}
          </fieldset>
        )
      })}
      <p style={{ ...muted, margin: 0, fontSize: 12.5 }}>
        Saved in this browser. With an account, the <Link href="/hub/storm-prep" className="ke-sr-link">Storm Prep hub</Link> adds a family plan, supplies tracker and outage log.
      </p>
    </section>
  )
}
