'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, RefreshCw, Trash2 } from 'lucide-react'
import { cardStyle, h3Style } from '../../ui/card'
import Badge from '../../ui/Badge'
import Button from '../../ui/Button'
import TextInput from '../../ui/TextInput'
import { SHEET_COLUMNS, SHEET_KINDS, SHEET_KIND_LABEL, type SheetKind } from '@/lib/refdata/priceSheets'

const muted = { color: 'var(--color-text-muted)', fontSize: 13 } as const

interface Sheet {
  id?: string
  kind: SheetKind
  url: string
  autoApprove: boolean
}
interface Last {
  at: string
  trigger: 'cron' | 'manual'
  results: { sheetId: string; kind: SheetKind; ok: boolean; added: string[]; unchanged: number; errors: string[] }[]
}

/**
 * Automatic price sync: the owner keeps prices in Google Sheets (one tab per
 * kind, published to the web as CSV). Every morning, and on "Sync now", new
 * prices become drafts here — or are approved straight away for a sheet set
 * to auto-approve.
 */
export default function PriceSyncPanel({ onSynced }: { onSynced: () => Promise<void> | void }) {
  const [sheets, setSheets] = useState<Sheet[]>([])
  const [last, setLast] = useState<Last | null>(null)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [help, setHelp] = useState<SheetKind | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/refdata/sync')
    if (!res.ok) return
    const j = await res.json()
    setSheets(j.sheets)
    setLast(j.last)
    setDirty(false)
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const set = (i: number, patch: Partial<Sheet>) => {
    setSheets(sheets.map((s, j) => (j === i ? { ...s, ...patch } : s)))
    setDirty(true)
  }

  async function save() {
    setBusy(true)
    setMsg(null)
    const res = await fetch('/api/admin/refdata/sync', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sheets }) })
    const j = await res.json().catch(() => ({}))
    if (res.ok) {
      setSheets(j.sheets)
      setDirty(false)
      setMsg('Saved.')
    } else setMsg(j.error ?? 'Could not save.')
    setBusy(false)
  }

  async function syncNow() {
    setBusy(true)
    setMsg(null)
    const res = await fetch('/api/admin/refdata/sync', { method: 'POST' })
    const j = await res.json().catch(() => ({}))
    if (res.ok) {
      setLast(j.last)
      await onSynced()
    } else setMsg(j.error ?? 'Sync failed.')
    setBusy(false)
  }

  return (
    <div style={{ ...cardStyle, display: 'grid', gap: 10 }}>
      <h3 style={{ ...h3Style, margin: 0 }}>Automatic price sync</h3>
      <p style={{ ...muted, margin: 0 }}>
        Keep prices in a Google Sheet — one tab per kind, with the column headings below — and publish each tab to the web as CSV (File → Share → Publish to web → choose the tab → Comma-separated values). Paste the link here. Every morning at 6 am, and whenever you press <em>Sync now</em>, changed prices are added as drafts for you to approve. Tick <em>auto-approve</em> only for a sheet you trust, such as one only you edit.
      </p>
      {sheets.map((s, i) => (
        <div key={s.id ?? i} style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,1fr) 2fr auto auto', gap: 8, alignItems: 'end' }}>
          <TextInput label="Prices in this tab" value={SHEET_KIND_LABEL[s.kind]} onChange={(v) => set(i, { kind: SHEET_KINDS.find((k) => SHEET_KIND_LABEL[k] === v) ?? s.kind })} options={SHEET_KINDS.map((k) => SHEET_KIND_LABEL[k])} />
          <TextInput label="Published CSV link" value={s.url} onChange={(v) => set(i, { url: v.trim() })} placeholder="https://docs.google.com/spreadsheets/d/e/…/pub?gid=0&single=true&output=csv" />
          <label style={{ ...muted, display: 'flex', gap: 6, alignItems: 'center', paddingBottom: 8 }}>
            <input type="checkbox" checked={s.autoApprove} onChange={(e) => set(i, { autoApprove: e.target.checked })} /> auto-approve
          </label>
          <Button
            size="sm"
            variant="outline"
            ariaLabel={`Remove ${SHEET_KIND_LABEL[s.kind]} sheet`}
            onClick={() => {
              setSheets(sheets.filter((_, j) => j !== i))
              setDirty(true)
            }}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button
          size="sm"
          variant="outline"
          iconRight={<Plus size={14} />}
          onClick={() => {
            setSheets([...sheets, { kind: 'fuel_price', url: '', autoApprove: false }])
            setDirty(true)
          }}
        >
          Add a sheet
        </Button>
        {dirty && (
          <Button size="sm" onClick={save} disabled={busy}>
            Save sheets
          </Button>
        )}
        {!dirty && sheets.length > 0 && (
          <Button size="sm" onClick={syncNow} disabled={busy} iconRight={<RefreshCw size={14} />}>
            {busy ? 'Syncing…' : 'Sync now'}
          </Button>
        )}
      </div>
      {msg && <p role="status" style={{ ...muted, margin: 0 }}>{msg}</p>}

      {last && (
        <div style={{ display: 'grid', gap: 6, borderTop: '1px solid var(--color-border)', paddingTop: 8 }} data-testid="sync-last">
          <span style={muted}>
            Last sync {new Date(last.at).toLocaleString('en-JM')} ({last.trigger === 'cron' ? 'daily' : 'run by hand'})
          </span>
          {last.results.map((r) => (
            <div key={r.sheetId} style={{ display: 'grid', gap: 2 }}>
              <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', fontSize: 13.5 }}>
                <Badge tone={r.ok ? 'green' : r.added.length ? 'orange' : 'red'}>{r.ok ? 'ok' : r.added.length ? 'partly' : 'failed'}</Badge>
                {SHEET_KIND_LABEL[r.kind]}: {r.added.length ? `${r.added.length} updated` : r.ok || r.unchanged ? 'no changes' : 'not read'}
                {r.unchanged ? `, ${r.unchanged} unchanged` : ''}
              </span>
              {r.added.length > 0 && <span style={muted}>{r.added.join(' · ')}</span>}
              {r.errors.map((e) => (
                <span key={e} style={{ ...muted, color: 'var(--color-danger)' }}>
                  {e}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}

      <details>
        <summary style={{ ...muted, cursor: 'pointer' }}>Column headings for each tab</summary>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0' }}>
          {SHEET_KINDS.map((k) => (
            <Button key={k} size="sm" variant={help === k ? 'primary' : 'outline'} onClick={() => setHelp(k)}>
              {SHEET_KIND_LABEL[k]}
            </Button>
          ))}
        </div>
        {help && (
          <div style={{ display: 'grid', gap: 6 }}>
            <code style={{ fontSize: 12, wordBreak: 'break-all', padding: 8, border: '1px solid var(--color-border)', borderRadius: 6 }}>{SHEET_COLUMNS[help].join(',')}</code>
            <p style={{ ...muted, margin: 0 }}>{SHEET_HELP[help]} Every row needs <code>source_title</code> (where you read the price). <code>effective_from</code> is YYYY-MM-DD; blank means today.</p>
          </div>
        )}
      </details>
    </div>
  )
}

const SHEET_HELP: Record<SheetKind, string> = {
  fuel_price: 'One row per grade (e.g. E10 87, E10 90, ULSD). The rows with the newest effective_from become one record. basis: pump_average (default) or ex_refinery.',
  charging_price: 'One row per operator; the operator name must match the stations on the map. Bands are optional: start/end as HH:MM (24-hour, Jamaica time; a band can run past midnight, e.g. 18:00 to 06:00), days as every day, Mon-Fri or Sat-Sun. Up to four bands (band3_…, band4_… work too).',
  lender_offer: 'One row per loan product, copied from the lender’s own page. rate_is_from: yes when the lender says “from x%”. rate_type: fixed or variable.',
  install_price: 'One row (the last row is used): J$ per kWp fitted, low and high; optional smallest job and battery J$ per kWh.',
  tariff_fuel: 'The monthly JPS fuel & IPP rate in J$ per kWh. The newest row updates the line labelled “Fuel…” on each approved tariff (or only those matching customer_class), making a new tariff version.',
}
