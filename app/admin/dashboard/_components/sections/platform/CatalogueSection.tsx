'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, CircleCheck, CircleX, Upload } from 'lucide-react'
import { cardStyle, h3Style } from '../../ui/card'
import Badge from '../../ui/Badge'
import Button from '../../ui/Button'
import TextInput from '../../ui/TextInput'

type FieldState = 'verified' | 'claimed' | 'expired' | 'conflicting' | 'unknown'
interface FieldDef { key: string; label: string; unit?: string; type: 'number' | 'text'; critical: boolean; help?: string }
interface Evidence {
  id: string
  field: string
  valueNum: number | null
  valueText: string | null
  unit: string | null
  sourceType: string
  sourceUrl: string | null
  sourceNote: string | null
  reviewState: string
  createdBy: string | null
  verifiedBy: string | null
  expiresAt: string | null
  createdAt: string
}
interface Sku {
  id: string
  catalogId: string | null
  kind: string
  displayName: string
  manufacturer: string | null
  model: string | null
  regionVariant: string | null
  status: string
  notes: string | null
  evidence: Evidence[]
  fields: FieldDef[]
  resolved: Record<string, { state: FieldState; valueNum: number | null; valueText: string | null }>
  readiness: { publishable: boolean; verifiedCritical: number; totalCritical: number; blocking: { field: string; label: string; state: FieldState }[] }
}

const STATE_TONE: Record<FieldState, 'green' | 'orange' | 'red' | 'neutral' | 'blue'> = {
  verified: 'green',
  claimed: 'orange',
  expired: 'red',
  conflicting: 'red',
  unknown: 'neutral',
}
const STATE_LABEL: Record<FieldState, string> = { verified: 'Verified', claimed: 'Claim only', expired: 'Expired', conflicting: 'Conflicting', unknown: 'Unknown' }
const SOURCE_TYPES = ['manufacturer_doc', 'test_record', 'label_photo', 'supplier_doc', 'listing_claim']
const KINDS = ['power_station', 'power_bank', 'solar_panel', 'charger', 'cable', 'accessory']

const muted = { color: 'var(--color-text-muted)', fontSize: 13 } as const
const value = (v: { valueNum: number | null; valueText: string | null; unit?: string | null }) => (v.valueNum != null ? `${v.valueNum}${v.unit ? ' ' + v.unit : ''}` : v.valueText ?? '—')

/**
 * Catalogue evidence (backlog F05). Each exact SKU's specifications are
 * evidence records with a source; a recommendation can only use a SKU once
 * every critical field is verified — by someone other than the person who
 * recorded it.
 */
export default function CatalogueSection() {
  const [skus, setSkus] = useState<Sku[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/catalogue')
    if (res.ok) setSkus((await res.json()).skus)
    setLoading(false)
  }, [])
  useEffect(() => {
    load()
  }, [load])

  async function sync() {
    const res = await fetch('/api/admin/catalogue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'sync_storefront' }) })
    const d = await res.json()
    setMsg(res.ok ? `${d.created} storefront product(s) added as drafts.` : d.error)
    load()
  }

  const open = skus.find((s) => s.id === openId)
  if (open) return <SkuDetail sku={open} onBack={() => setOpenId(null)} onChanged={load} />

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <p style={{ ...muted, margin: 0, maxWidth: 680 }}>
          A product can back a recommendation only when every critical specification is verified from a document, by a second admin. Storefront values are imported as unverified claims.
        </p>
        <Button size="sm" onClick={sync} iconRight={<Upload size={14} />}>Import storefront products</Button>
      </div>
      {msg && <p role="status" style={muted}>{msg}</p>}
      <div style={cardStyle}>
        <h3 style={h3Style}>Products</h3>
        {loading ? (
          <p style={muted}>Loading…</p>
        ) : skus.length === 0 ? (
          <p style={muted}>No products yet. Import the storefront products to start.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ textAlign: 'left', ...muted }}>
                <th style={{ padding: 8 }}>Product</th>
                <th style={{ padding: 8 }}>Type</th>
                <th style={{ padding: 8 }}>Exact model</th>
                <th style={{ padding: 8 }}>Critical specs verified</th>
                <th style={{ padding: 8 }}>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {skus.map((s) => (
                <tr key={s.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                  <td style={{ padding: 8, fontWeight: 600 }}>{s.displayName}</td>
                  <td style={{ padding: 8 }}>{s.kind.replace('_', ' ')}</td>
                  <td style={{ padding: 8 }}>{s.model ? `${s.manufacturer ?? ''} ${s.model}`.trim() : <span style={muted}>Not recorded</span>}</td>
                  <td style={{ padding: 8 }}>
                    <Badge tone={s.readiness.publishable ? 'green' : 'orange'}>
                      {s.readiness.verifiedCritical} / {s.readiness.totalCritical}
                    </Badge>
                  </td>
                  <td style={{ padding: 8 }}>
                    <Badge tone={s.status === 'published' ? 'green' : s.status === 'retired' ? 'grey' : 'neutral'}>{s.status}</Badge>
                  </td>
                  <td style={{ padding: 8, textAlign: 'right' }}>
                    <Button size="sm" variant="outline" onClick={() => setOpenId(s.id)}>Open</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function SkuDetail({ sku, onBack, onChanged }: { sku: Sku; onBack: () => void; onChanged: () => void }) {
  const [ident, setIdent] = useState({ manufacturer: sku.manufacturer ?? '', model: sku.model ?? '', regionVariant: sku.regionVariant ?? '', kind: sku.kind })
  const [field, setField] = useState<string | null>(null)
  const [ev, setEv] = useState({ value: '', unit: '', sourceType: 'manufacturer_doc', sourceUrl: '', sourceNote: '', expiresAt: '' })
  const [msg, setMsg] = useState<string | null>(null)

  async function patchSku(body: object) {
    const res = await fetch(`/api/admin/catalogue/${sku.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const d = await res.json()
    setMsg(res.ok ? 'Saved.' : d.blocking ? `${d.error} Still needed: ${d.blocking.map((b: { label: string }) => b.label).join(', ')}.` : d.error)
    onChanged()
  }

  async function addEvidence() {
    const def = sku.fields.find((f) => f.key === field)
    if (!def) return
    const num = def.type === 'number'
    if (num && !Number.isFinite(Number(ev.value))) {
      setMsg('Enter a number for this field.')
      return
    }
    const res = await fetch(`/api/admin/catalogue/${sku.id}/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        field: def.key,
        valueNum: num ? Number(ev.value) : null,
        valueText: num ? null : ev.value,
        unit: ev.unit || def.unit || null,
        sourceType: ev.sourceType,
        sourceUrl: ev.sourceUrl || null,
        sourceNote: ev.sourceNote || null,
        expiresAt: ev.expiresAt ? new Date(ev.expiresAt).toISOString() : null,
      }),
    })
    const d = await res.json()
    setMsg(res.ok ? 'Evidence recorded — another admin needs to verify it.' : d.error)
    if (res.ok) {
      setField(null)
      setEv({ value: '', unit: '', sourceType: 'manufacturer_doc', sourceUrl: '', sourceNote: '', expiresAt: '' })
    }
    onChanged()
  }

  async function review(id: string, reviewState: 'verified' | 'rejected') {
    const res = await fetch(`/api/admin/catalogue/evidence/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reviewState }) })
    const d = await res.json()
    setMsg(res.ok ? `Evidence ${reviewState}.` : d.error)
    onChanged()
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <Button size="sm" variant="outline" onClick={onBack}>
          <ArrowLeft size={14} /> All products
        </Button>
      </div>
      <div style={{ ...cardStyle, display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <h3 style={{ ...h3Style, margin: 0 }}>{sku.displayName}</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Badge tone={sku.readiness.publishable ? 'green' : 'orange'}>{sku.readiness.publishable ? 'Ready to publish' : `${sku.readiness.blocking.length} critical spec(s) outstanding`}</Badge>
            <Button size="sm" onClick={() => patchSku({ status: 'published' })} disabled={sku.status === 'published'}>Publish</Button>
            {sku.status === 'published' && <Button size="sm" variant="outline" onClick={() => patchSku({ status: 'in_review' })}>Unpublish</Button>}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
          <TextInput label="Manufacturer" value={ident.manufacturer} onChange={(v) => setIdent({ ...ident, manufacturer: v })} />
          <TextInput label="Exact model number" value={ident.model} onChange={(v) => setIdent({ ...ident, model: v })} />
          <TextInput label="Regional variant" value={ident.regionVariant} onChange={(v) => setIdent({ ...ident, regionVariant: v })} placeholder="e.g. US 120 V" />
          <TextInput label="Product type" value={ident.kind} onChange={(v) => setIdent({ ...ident, kind: v })} options={KINDS} />
        </div>
        <div>
          <Button size="sm" variant="outline" onClick={() => patchSku({ manufacturer: ident.manufacturer || null, model: ident.model || null, regionVariant: ident.regionVariant || null, kind: ident.kind })}>
            Save identity
          </Button>
        </div>
        <p style={{ ...muted, margin: 0 }}>Also record the exact model in the “Exact manufacturer model number” spec below, with its source — that’s what the publish rule checks.</p>
        {msg && <p role="status" style={{ ...muted, margin: 0, color: 'var(--color-text)' }}>{msg}</p>}
      </div>

      <div style={cardStyle}>
        <h3 style={h3Style}>Specifications</h3>
        <div style={{ display: 'grid', gap: 10 }}>
          {sku.fields.map((f) => {
            const r = sku.resolved[f.key]
            const rows = sku.evidence.filter((e) => e.field === f.key)
            return (
              <div key={f.key} style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>
                    {f.label} {f.unit && <span style={muted}>({f.unit})</span>} {f.critical && <Badge tone="blue">Critical</Badge>}
                  </span>
                  <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                    <span>{r.state === 'unknown' ? '' : value({ ...r, unit: f.unit })}</span>
                    <Badge tone={STATE_TONE[r.state]}>{STATE_LABEL[r.state]}</Badge>
                    <Button size="sm" variant="outline" ariaLabel={`Add evidence for ${f.label}`} onClick={() => setField(field === f.key ? null : f.key)}>Add evidence</Button>
                  </span>
                </div>
                {f.help && <p style={{ ...muted, margin: '4px 0 0', fontSize: 12 }}>{f.help}</p>}
                {rows.length > 0 && (
                  <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'grid', gap: 6 }}>
                    {rows.map((e) => (
                      <li key={e.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', ...muted, fontSize: 12.5 }}>
                        <span>
                          <strong style={{ color: 'var(--color-text)' }}>{value(e)}</strong> · {e.sourceType.replace('_', ' ')}
                          {e.sourceUrl && (
                            <>
                              {' · '}
                              <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-link)' }}>source</a>
                            </>
                          )}
                          {e.sourceNote ? ` · ${e.sourceNote.split('\n')[0]}` : ''} · recorded by {e.createdBy ?? 'unknown'}
                          {e.verifiedBy ? ` · verified by ${e.verifiedBy}` : ''}
                          {e.expiresAt ? ` · expires ${new Date(e.expiresAt).toLocaleDateString('en-JM')}` : ''}
                        </span>
                        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          <Badge tone={e.reviewState === 'verified' ? 'green' : e.reviewState === 'rejected' ? 'red' : 'neutral'}>{e.reviewState}</Badge>
                          {e.reviewState === 'unverified' && e.sourceType !== 'listing_claim' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => review(e.id, 'verified')}>
                                <CircleCheck size={13} /> Verify
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => review(e.id, 'rejected')}>
                                <CircleX size={13} /> Reject
                              </Button>
                            </>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {field === f.key && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10, marginTop: 10 }}>
                    <TextInput label={`Value${f.unit ? ` (${f.unit})` : ''}`} value={ev.value} onChange={(v) => setEv({ ...ev, value: v })} type={f.type === 'number' ? 'number' : 'text'} />
                    <TextInput label="Source type" value={ev.sourceType} onChange={(v) => setEv({ ...ev, sourceType: v })} options={SOURCE_TYPES} />
                    <TextInput label="Document link" value={ev.sourceUrl} onChange={(v) => setEv({ ...ev, sourceUrl: v })} placeholder="https://… datasheet or manual" />
                    <TextInput label="Expires (optional)" value={ev.expiresAt} onChange={(v) => setEv({ ...ev, expiresAt: v })} type="date" />
                    <div style={{ gridColumn: '1 / -1' }}>
                      <TextInput label="Note (page, table, test conditions)" value={ev.sourceNote} onChange={(v) => setEv({ ...ev, sourceNote: v })} />
                    </div>
                    <div>
                      <Button size="sm" onClick={addEvidence} disabled={!ev.value.trim()}>Record evidence</Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
