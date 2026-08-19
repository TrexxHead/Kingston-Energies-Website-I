'use client'

import { useCallback, useEffect, useState } from 'react'
import { CloudLightning, Plus, Trash2, Check } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Button from '../ui/Button'
import TextInput from '../ui/TextInput'
import { CATALOG } from '@/lib/catalog'
import type { ChecklistCategory, ChecklistTiming, StormChecklistItem, DirectoryEntry } from '@/lib/stormPrepDefaults'

interface Content {
  checklist: StormChecklistItem[]
  kitProductIds: string[]
  directory: DirectoryEntry[]
  educationalTips: string[]
}

function newDirectoryEntry(): DirectoryEntry {
  return { name: '', description: '', url: '', source: '', lastReviewed: new Date().toISOString().slice(0, 10) }
}

const CATEGORY_OPTIONS: ChecklistCategory[] = ['power', 'light', 'food', 'records']
const TIMING_OPTIONS: ChecklistTiming[] = ['5-7-days', '72h', '24h', 'during']

function newItem(): StormChecklistItem {
  return { id: `custom-${Date.now().toString(36)}`, text: '', category: 'power', timing: '24h' }
}

/**
 * Admin control for the Storm prep checklist and storm-kit product picks —
 * what shows up on /hub/storm-prep/checklist and /resources. Starts
 * pre-filled with whatever is currently live (the shipped defaults, until
 * someone saves a change here), so opening this panel never looks blank.
 */
export default function StormPrepCard() {
  const [content, setContent] = useState<Content | null>(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/storm-prep')
    if (res.ok) setContent(await res.json())
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    if (!content) return
    setBusy(true)
    setSaved(false)
    const res = await fetch('/api/admin/storm-prep', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content),
    })
    setBusy(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  const setItem = (i: number, patch: Partial<StormChecklistItem>) =>
    setContent((c) => (c ? { ...c, checklist: c.checklist.map((item, j) => (j === i ? { ...item, ...patch } : item)) } : c))
  const addItem = () => setContent((c) => (c ? { ...c, checklist: [...c.checklist, newItem()] } : c))
  const removeItem = (i: number) => setContent((c) => (c ? { ...c, checklist: c.checklist.filter((_, j) => j !== i) } : c))

  const toggleKitProduct = (id: string) =>
    setContent((c) =>
      c
        ? { ...c, kitProductIds: c.kitProductIds.includes(id) ? c.kitProductIds.filter((p) => p !== id) : [...c.kitProductIds, id] }
        : c,
    )

  const setDirectoryEntry = (i: number, patch: Partial<DirectoryEntry>) =>
    setContent((c) => (c ? { ...c, directory: c.directory.map((entry, j) => (j === i ? { ...entry, ...patch } : entry)) } : c))
  const addDirectoryEntry = () => setContent((c) => (c ? { ...c, directory: [...c.directory, newDirectoryEntry()] } : c))
  const removeDirectoryEntry = (i: number) => setContent((c) => (c ? { ...c, directory: c.directory.filter((_, j) => j !== i) } : c))

  const setTip = (i: number, value: string) =>
    setContent((c) => (c ? { ...c, educationalTips: c.educationalTips.map((t, j) => (j === i ? value : t)) } : c))
  const addTip = () => setContent((c) => (c ? { ...c, educationalTips: [...c.educationalTips, ''] } : c))
  const removeTip = (i: number) => setContent((c) => (c ? { ...c, educationalTips: c.educationalTips.filter((_, j) => j !== i) } : c))

  if (!content) {
    return (
      <div style={cardStyle}>
        <h3 style={h3Style}>Storm prep</h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading…</p>
      </div>
    )
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
        <CloudLightning size={17} color="var(--ke-green-600)" />
        <h3 style={{ ...h3Style, margin: 0 }}>Storm prep</h3>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '0 0 16px' }}>
        Controls the checklist and storm-kit picks on /hub/storm-prep. Item ids stay fixed once created, so editing
        text here doesn&apos;t reset anyone&apos;s progress — only removing an item does.
      </p>

      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Checklist items</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
        {content.checklist.map((item, i) => (
          <div key={item.id} style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <TextInput label="Text" value={item.text} onChange={(v) => setItem(i, { text: v })} multiline />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end' }}>
              <TextInput
                label="Category"
                value={item.category}
                onChange={(v) => setItem(i, { category: v as ChecklistCategory })}
                options={CATEGORY_OPTIONS}
              />
              <TextInput
                label="Timing"
                value={item.timing}
                onChange={(v) => setItem(i, { timing: v as ChecklistTiming })}
                options={TIMING_OPTIONS}
              />
              <Button size="sm" variant="outline" onClick={() => removeItem(i)}>
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Button size="sm" variant="outline" onClick={addItem} iconRight={<Plus size={13} />}>Add item</Button>

      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, margin: '20px 0 10px' }}>Storm kit products</div>
      <p style={{ fontSize: 12, color: 'var(--color-text-subtle)', margin: '0 0 10px' }}>
        Shown on /hub/storm-prep/resources — pick which real catalog products count as the storm kit.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 6 }}>
        {CATALOG.filter((p) => p.cat !== 'accessories').map((p) => {
          const picked = content.kitProductIds.includes(p.id)
          return (
            <label
              key={p.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, cursor: 'pointer',
                border: `1.5px solid ${picked ? 'var(--ke-green-500)' : 'var(--color-border)'}`,
                background: picked ? 'var(--ke-green-50)' : 'transparent',
              }}
            >
              <input type="checkbox" checked={picked} onChange={() => toggleKitProduct(p.id)} style={{ display: 'none' }} />
              <span
                style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: picked ? 'none' : '1.5px solid var(--color-border-strong)', background: picked ? 'var(--ke-green-500)' : '#fff',
                }}
              >
                {picked && <Check size={11} color="#fff" />}
              </span>
              <span style={{ fontSize: 12.5 }}>{p.name}</span>
            </label>
          )
        })}
      </div>

      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, margin: '20px 0 10px' }}>Resource &amp; help directory</div>
      <p style={{ fontSize: 12, color: 'var(--color-text-subtle)', margin: '0 0 10px' }}>
        Shown on /hub/storm-prep/directory. Real agencies only — leave phone blank rather than guess a number; link
        to the agency&apos;s own site instead.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
        {content.directory.map((entry, i) => (
          <div key={i} style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <TextInput label="Name" value={entry.name} onChange={(v) => setDirectoryEntry(i, { name: v })} />
              <TextInput label="Phone (optional)" value={entry.phone ?? ''} onChange={(v) => setDirectoryEntry(i, { phone: v || undefined })} />
            </div>
            <TextInput label="Description" value={entry.description} onChange={(v) => setDirectoryEntry(i, { description: v })} multiline />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <TextInput label="URL" value={entry.url} onChange={(v) => setDirectoryEntry(i, { url: v })} />
              <TextInput label="Source" value={entry.source} onChange={(v) => setDirectoryEntry(i, { source: v })} />
              <TextInput label="Last checked" value={entry.lastReviewed} onChange={(v) => setDirectoryEntry(i, { lastReviewed: v })} />
            </div>
            <Button size="sm" variant="outline" onClick={() => removeDirectoryEntry(i)}>
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
      </div>
      <Button size="sm" variant="outline" onClick={addDirectoryEntry} iconRight={<Plus size={13} />}>Add directory entry</Button>

      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, margin: '20px 0 10px' }}>Educational tips</div>
      <p style={{ fontSize: 12, color: 'var(--color-text-subtle)', margin: '0 0 10px' }}>
        Shown around Storm prep — generic, non-agency-attributed guidance only.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {content.educationalTips.map((tip, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <TextInput label={`Tip ${i + 1}`} value={tip} onChange={(v) => setTip(i, v)} multiline />
            </div>
            <Button size="sm" variant="outline" onClick={() => removeTip(i)}>
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
      </div>
      <Button size="sm" variant="outline" onClick={addTip} iconRight={<Plus size={13} />}>Add tip</Button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18 }}>
        <Button size="sm" variant="primary" onClick={save}>{busy ? 'Saving…' : 'Save Storm prep content'}</Button>
        {saved && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--ke-green-700)' }}>
            <Check size={14} /> Saved: live on the site
          </span>
        )}
      </div>
    </div>
  )
}
