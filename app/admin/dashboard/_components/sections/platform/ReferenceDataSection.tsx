'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { priceSummary } from '@/lib/refdata/chargingPrice'
import { SYNC_ACTOR } from '@/lib/refdata/priceSheets'
import PriceSyncPanel from './PriceSyncPanel'
import { cardStyle, h3Style } from '../../ui/card'
import Badge from '../../ui/Badge'
import Button from '../../ui/Button'
import TextInput from '../../ui/TextInput'
import { REF_KIND_LABEL, FUEL_GRADES, type RefKind, type RefRecord } from '@/lib/refdata/types'
import type { TariffComponent } from '@/lib/energy/engine/tariff'
import { PARISHES } from '@/lib/map/parishes'

const muted = { color: 'var(--color-text-muted)', fontSize: 13 } as const
const today = () => new Date().toISOString().slice(0, 10)
const num = (v: string) => (v.trim() === '' ? NaN : Number(v))

/**
 * Reference data (roadmap R0). The public calculators — solar savings, Bill
 * Explainer, EV costs, storm hub — only use APPROVED records in effect today.
 * Enter numbers exactly as published, with the document you read them from.
 */
export default function ReferenceDataSection() {
  const [records, setRecords] = useState<RefRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState<RefKind | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/refdata')
    if (res.ok) setRecords((await res.json()).records)
    setLoading(false)
  }, [])
  useEffect(() => {
    load()
  }, [load])

  async function act(id: string, body: object | null) {
    setMsg(null)
    const res = await fetch(`/api/admin/refdata/${id}`, body ? { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { method: 'DELETE' })
    if (!res.ok) setMsg((await res.json().catch(() => ({}))).error ?? 'Failed.')
    await load()
  }

  if (adding) return <RecordEditor kind={adding} onDone={async () => { setAdding(null); await load() }} />

  const kinds: RefKind[] = ['tariff', 'fuel_price', 'charging_price', 'lender_offer', 'install_price', 'shelter_list']
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ ...cardStyle, display: 'grid', gap: 10 }}>
        <p style={{ ...muted, margin: 0 }}>
          The public numbers our calculators rely on. Enter them exactly as published (JPS / OUR tariff schedule, Petrojam price notice, ODPEM shelter list) with the document you read them from. Calculators use only <strong>approved</strong> records in effect today — with none, they say so instead of guessing.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {kinds.map((k) => (
            <Button key={k} size="sm" variant="outline" onClick={() => setAdding(k)} iconRight={<Plus size={14} />}>
              {REF_KIND_LABEL[k]}
            </Button>
          ))}
        </div>
        {msg && <p role="alert" style={{ ...muted, color: '#c0392b', margin: 0 }}>{msg}</p>}
      </div>
      <PriceSyncPanel onSynced={load} />
      {kinds.map((k) => {
        const list = records.filter((r) => r.kind === k)
        return (
          <div key={k} style={{ ...cardStyle, display: 'grid', gap: 8 }}>
            <h3 style={{ ...h3Style, margin: 0 }}>{REF_KIND_LABEL[k]}</h3>
            {loading ? <p style={muted}>Loading…</p> : list.length === 0 && <p style={{ ...muted, margin: 0 }}>None yet — calculators that need this will say it isn’t available.</p>}
            {list.map((r) => (
              <div key={r.id} style={{ display: 'grid', gap: 4, borderTop: '1px solid var(--color-border)', paddingTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <strong style={{ fontSize: 14 }}>{r.name}</strong>
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Badge tone={r.status === 'approved' ? 'green' : r.status === 'draft' ? 'orange' : 'grey'}>{r.status}</Badge>
                    {r.status === 'draft' && <Button size="sm" onClick={() => act(r.id, { status: 'approved' })}>Approve</Button>}
                    {r.status === 'approved' && <Button size="sm" variant="outline" onClick={() => act(r.id, { status: 'retired' })}>Retire</Button>}
                    {r.status === 'draft' && (
                      <Button size="sm" variant="outline" ariaLabel={`Delete draft ${r.name}`} onClick={() => window.confirm(`Delete draft “${r.name}”?`) && act(r.id, null)}>
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </span>
                </div>
                <span style={muted}>
                  In effect {r.effectiveFrom}
                  {r.effectiveTo ? ` to ${r.effectiveTo}` : ' onwards'} · Source: {r.source.url ? <a href={r.source.url} target="_blank" rel="noopener noreferrer">{r.source.title}</a> : r.source.title} (read {r.source.retrievedAt})
                </span>
                <span style={muted}>
                  Entered by {r.createdBy ?? 'unknown'}
                  {r.reviewedBy
                    ? r.createdBy === SYNC_ACTOR && r.reviewedBy === SYNC_ACTOR
                      ? ' · auto-approved (the sheet is set to auto-approve)'
                      : ` · approved by ${r.reviewedBy}${r.reviewedBy === r.createdBy ? ' (same person — ask a second admin to double-check when possible)' : ''}`
                    : ''}
                </span>
                <Summary r={r} />
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function Summary({ r }: { r: RefRecord }) {
  if (r.kind === 'tariff') {
    const d = r.data as RefRecord<'tariff'>['data']
    return (
      <ul style={{ ...muted, margin: 0, paddingLeft: 18 }}>
        <li>{d.customerClass}</li>
        {d.components.map((c, i) => (
          <li key={i}>
            {c.label}:{' '}
            {c.kind === 'fixed'
              ? `J$${c.amountPerPeriod} per bill`
              : c.kind === 'per_kwh'
                ? `J$${c.ratePerKwh}/kWh`
                : c.kind === 'percent'
                  ? `${c.percent}% of the above`
                  : c.blocks.map((b) => `${b.upToKwh ? `up to ${b.upToKwh} kWh` : 'above'} J$${b.ratePerKwh}/kWh`).join('; ')}
          </li>
        ))}
      </ul>
    )
  }
  if (r.kind === 'fuel_price') {
    const d = r.data as RefRecord<'fuel_price'>['data']
    return <span style={muted}>{d.basis === 'pump_average' ? 'Average pump prices' : 'Ex-refinery prices (exclude taxes and retail margin)'}: {d.grades.map((g) => `${g.grade} J$${g.pricePerLitre}/L`).join(' · ')}</span>
  }
  if (r.kind === 'shelter_list') return <span style={muted}>{(r.data as RefRecord<'shelter_list'>['data']).shelters.length} shelters</span>
  if (r.kind === 'install_price') {
    const d = r.data as RefRecord<'install_price'>['data']
    return <span style={muted}>{d.basis}: J${d.perKwpLow.toLocaleString()}–{d.perKwpHigh.toLocaleString()} per kWp{d.minimumJob ? `, smallest job J$${d.minimumJob.toLocaleString()}` : ''}{d.batteryPerKwhLow != null ? `, battery J$${d.batteryPerKwhLow.toLocaleString()}–${d.batteryPerKwhHigh?.toLocaleString()} per kWh` : ''}</span>
  }
  if (r.kind === 'lender_offer') {
    const l = r.data as RefRecord<'lender_offer'>['data']
    return <span style={muted}>{l.lender} — {l.product}: {l.rateIsFrom ? 'from ' : ''}{l.annualRatePct}% {l.rateType}{l.maxTermMonths ? `, up to ${l.maxTermMonths} months` : ''}{l.minDepositPct != null ? `, ${l.minDepositPct}% deposit` : ''}{l.processingFeePct != null ? `, ${l.processingFeePct}% processing` : ''}{l.monthlyFee != null ? `, J$${l.monthlyFee}/month fee` : ''}</span>
  }
  const d = r.data as RefRecord<'charging_price'>['data']
  return <span style={muted}>{d.operator}: {priceSummary(d) || 'not per kWh'}{d.notes ? ` — ${d.notes}` : ''}</span>
}

type CompDraft = { kind: TariffComponent['kind']; label: string; amount: string; percent: string; blocks: { upTo: string; rate: string }[] }

function RecordEditor({ kind, onDone }: { kind: RefKind; onDone: () => void }) {
  const [name, setName] = useState('')
  const [from, setFrom] = useState(today())
  const [to, setTo] = useState('')
  const [srcTitle, setSrcTitle] = useState('')
  const [srcUrl, setSrcUrl] = useState('')
  const [srcRead, setSrcRead] = useState(today())
  const [msg, setMsg] = useState<string | null>(null)
  // tariff
  const [cls, setCls] = useState('Rate 10 — Residential')
  const [notes, setNotes] = useState('')
  const [comps, setComps] = useState<CompDraft[]>([])
  // fuel
  const [basis, setBasis] = useState<'pump_average' | 'ex_refinery'>('pump_average')
  const [grades, setGrades] = useState<{ grade: string; price: string }[]>(FUEL_GRADES.slice(0, 4).map((g) => ({ grade: g, price: '' })))
  // charging
  const [operator, setOperator] = useState('')
  const [perKwh, setPerKwh] = useState('')
  const [bands, setBands] = useState<{ label: string; start: string; end: string; days: string; price: string }[]>([])
  const [sessionFee, setSessionFee] = useState('')
  const [idleFee, setIdleFee] = useState('')
  const [idleGrace, setIdleGrace] = useState('')
  // install price
  const [ipBasis, setIpBasis] = useState('Kingston Energies price list')
  const [kwpLow, setKwpLow] = useState('')
  const [kwpHigh, setKwpHigh] = useState('')
  const [minJob, setMinJob] = useState('')
  const [batLow, setBatLow] = useState('')
  const [batHigh, setBatHigh] = useState('')
  const [includes, setIncludes] = useState('')
  // shelters
  const [csv, setCsv] = useState('')
  // lender
  const [lender, setLender] = useState('')
  const [product, setProduct] = useState('')
  const [rate, setRate] = useState('')
  const [rateFrom, setRateFrom] = useState('no')
  const [rateType, setRateType] = useState<'fixed' | 'variable'>('fixed')
  const [maxTerm, setMaxTerm] = useState('')
  const [minDeposit, setMinDeposit] = useState('')
  const [procFee, setProcFee] = useState('')
  const [otherFees, setOtherFees] = useState('')
  const [monthlyFee, setMonthlyFee] = useState('')
  const [lifeIns, setLifeIns] = useState('')
  const [maxLoan, setMaxLoan] = useState('')

  const addComp = (k: TariffComponent['kind']) =>
    setComps([...comps, { kind: k, label: k === 'fixed' ? 'Customer charge' : k === 'energy_blocks' ? 'Energy charge' : k === 'per_kwh' ? 'Fuel & IPP charge' : 'GCT', amount: '', percent: '', blocks: k === 'energy_blocks' ? [{ upTo: '100', rate: '' }, { upTo: '', rate: '' }] : [] }])
  const setComp = (i: number, patch: Partial<CompDraft>) => setComps(comps.map((c, j) => (j === i ? { ...c, ...patch } : c)))

  function buildData(): unknown {
    if (kind === 'tariff')
      return {
        customerClass: cls,
        geography: 'Jamaica (JPS)',
        notes: notes.trim() || null,
        components: comps.map((c) =>
          c.kind === 'fixed'
            ? { kind: 'fixed', label: c.label, amountPerPeriod: num(c.amount) }
            : c.kind === 'per_kwh'
              ? { kind: 'per_kwh', label: c.label, ratePerKwh: num(c.amount) }
              : c.kind === 'percent'
                ? { kind: 'percent', label: c.label, percent: num(c.percent) }
                : { kind: 'energy_blocks', label: c.label, blocks: c.blocks.map((b) => ({ upToKwh: b.upTo.trim() ? num(b.upTo) : null, ratePerKwh: num(b.rate) })) },
        ),
      }
    if (kind === 'fuel_price') return { basis, currency: 'JMD', grades: grades.filter((g) => g.price.trim()).map((g) => ({ grade: g.grade, pricePerLitre: num(g.price) })) }
    if (kind === 'lender_offer')
      return { lender, product, annualRatePct: num(rate), rateIsFrom: rateFrom === 'yes', rateType, maxTermMonths: maxTerm.trim() ? num(maxTerm) : null, minDepositPct: minDeposit.trim() ? num(minDeposit) : null, processingFeePct: procFee.trim() ? num(procFee) : null, otherUpfrontFees: otherFees.trim() ? num(otherFees) : null, monthlyFee: monthlyFee.trim() ? num(monthlyFee) : null, lifeInsurancePctPerYear: lifeIns.trim() ? num(lifeIns) : null, maxLoan: maxLoan.trim() ? num(maxLoan) : null, notes: notes.trim() || null }
    if (kind === 'install_price')
      return {
        basis: ipBasis,
        perKwpLow: num(kwpLow),
        perKwpHigh: num(kwpHigh),
        minimumJob: minJob.trim() ? num(minJob) : null,
        batteryPerKwhLow: batLow.trim() ? num(batLow) : null,
        batteryPerKwhHigh: batHigh.trim() ? num(batHigh) : null,
        includes: includes.trim() || null,
      }
    if (kind === 'charging_price')
      return {
        operator,
        pricePerKwh: perKwh.trim() ? num(perKwh) : null,
        periods: bands.filter((b) => b.price.trim()).map((b) => ({ label: b.label.trim() || 'Peak', start: b.start, end: b.end, ...(b.days === 'Mon–Fri' ? { days: [1, 2, 3, 4, 5] } : b.days === 'Sat–Sun' ? { days: [0, 6] } : {}), pricePerKwh: num(b.price) })),
        sessionFee: sessionFee.trim() ? num(sessionFee) : null,
        idleFeePerMin: idleFee.trim() ? num(idleFee) : null,
        idleGraceMin: idleGrace.trim() ? num(idleGrace) : null,
        notes: notes.trim() || null,
      }
    const shelters = csv
      .split('\n')
      .map((l) => l.split(',').map((x) => x.trim()))
      .filter((p) => p[0])
      .map(([n, parish, address, lat, lng]) => ({ name: n, parish, address: address || null, lat: lat ? Number(lat) : null, lng: lng ? Number(lng) : null }))
    return { shelters }
  }

  async function save() {
    setMsg(null)
    const res = await fetch('/api/admin/refdata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, name, effectiveFrom: from, effectiveTo: to || null, source: { title: srcTitle, url: srcUrl.trim() || null, retrievedAt: srcRead }, data: buildData() }),
    })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) return setMsg(d.error ?? 'Could not save.')
    onDone()
  }

  return (
    <div style={{ ...cardStyle, display: 'grid', gap: 12 }}>
      <h3 style={{ ...h3Style, margin: 0 }}>New {REF_KIND_LABEL[kind].toLowerCase()} (draft)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
        <TextInput label="Name" value={name} onChange={setName} placeholder={kind === 'tariff' ? 'JPS Rate 10 — Oct 2026' : kind === 'fuel_price' ? 'Petrojam prices — week of 15 Oct 2026' : ''} />
        <TextInput label="In effect from" type="date" value={from} onChange={setFrom} />
        <TextInput label="Until (blank = open)" type="date" value={to} onChange={setTo} />
        <TextInput label="Source document" value={srcTitle} onChange={setSrcTitle} placeholder="e.g. OUR — JPS tariff schedule 2026" />
        <TextInput label="Source link" value={srcUrl} onChange={setSrcUrl} />
        <TextInput label="Date you read it" type="date" value={srcRead} onChange={setSrcRead} />
      </div>

      {kind === 'tariff' && (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
            <TextInput label="Customer class" value={cls} onChange={setCls} />
            <TextInput label="Notes (what isn’t modelled)" value={notes} onChange={setNotes} />
          </div>
          <p style={{ ...muted, margin: 0 }}>Add each line of the published schedule in bill order. Percentages (e.g. GCT) apply to everything listed above them.</p>
          {comps.map((c, i) => (
            <div key={i} style={{ display: 'grid', gap: 8, padding: 10, border: '1px solid var(--color-border)', borderRadius: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8, alignItems: 'end' }}>
                <TextInput label={`Line ${i + 1} label`} value={c.label} onChange={(v) => setComp(i, { label: v })} />
                {c.kind === 'fixed' && <TextInput label="J$ per bill" value={c.amount} onChange={(v) => setComp(i, { amount: v })} />}
                {c.kind === 'per_kwh' && <TextInput label="J$ per kWh" value={c.amount} onChange={(v) => setComp(i, { amount: v })} />}
                {c.kind === 'percent' && <TextInput label="Percent" value={c.percent} onChange={(v) => setComp(i, { percent: v })} />}
                <div style={{ justifySelf: 'end' }}>
                  <Button size="sm" variant="outline" ariaLabel={`Remove line ${i + 1}`} onClick={() => setComps(comps.filter((_, j) => j !== i))}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
              {c.kind === 'energy_blocks' &&
                c.blocks.map((b, bi) => (
                  <div key={bi} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <TextInput label={bi === c.blocks.length - 1 ? 'Above (leave blank)' : 'Up to kWh'} value={b.upTo} onChange={(v) => setComp(i, { blocks: c.blocks.map((x, k) => (k === bi ? { ...x, upTo: v } : x)) })} />
                    <TextInput label="J$ per kWh" value={b.rate} onChange={(v) => setComp(i, { blocks: c.blocks.map((x, k) => (k === bi ? { ...x, rate: v } : x)) })} />
                  </div>
                ))}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button size="sm" variant="outline" onClick={() => addComp('fixed')}>+ Fixed charge</Button>
            <Button size="sm" variant="outline" onClick={() => addComp('energy_blocks')}>+ Energy blocks</Button>
            <Button size="sm" variant="outline" onClick={() => addComp('per_kwh')}>+ Per-kWh charge</Button>
            <Button size="sm" variant="outline" onClick={() => addComp('percent')}>+ Percentage (tax)</Button>
          </div>
        </div>
      )}

      {kind === 'fuel_price' && (
        <div style={{ display: 'grid', gap: 8 }}>
          <TextInput label="Price basis" value={basis} onChange={(v) => setBasis(v as typeof basis)} options={['pump_average', 'ex_refinery']} />
          <p style={{ ...muted, margin: 0 }}>Pump prices are what drivers pay. Petrojam’s notice lists ex-refinery prices, which exclude taxes and retail margin — the EV calculator only uses pump prices.</p>
          {grades.map((g, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
              <TextInput label="Grade" value={g.grade} onChange={(v) => setGrades(grades.map((x, j) => (j === i ? { ...x, grade: v } : x)))} />
              <TextInput label="J$ per litre" value={g.price} onChange={(v) => setGrades(grades.map((x, j) => (j === i ? { ...x, price: v } : x)))} />
            </div>
          ))}
        </div>
      )}

      {kind === 'charging_price' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
          <TextInput label="Operator" value={operator} onChange={setOperator} placeholder="JPS Charge 'n Go" />
          <TextInput label="Standard J$ per kWh (blank if not per kWh)" value={perKwh} onChange={setPerKwh} />
          <TextInput label="J$ per session (blank if none)" value={sessionFee} onChange={setSessionFee} />
          <TextInput label="Idle fee J$ per minute" value={idleFee} onChange={setIdleFee} />
          <TextInput label="Free minutes before idle fee" value={idleGrace} onChange={setIdleGrace} />
          <TextInput label="Notes" value={notes} onChange={setNotes} />
          <div style={{ gridColumn: '1 / -1', display: 'grid', gap: 8 }}>
            <p style={{ ...muted, margin: 0 }}>Time-of-day prices (Jamaica time). A band that ends at or before it starts runs past midnight, e.g. 18:00 → 06:00. Outside every band the standard price applies.</p>
            {bands.map((b, i) => {
              const set = (patch: Partial<typeof b>) => setBands(bands.map((x, j) => (j === i ? { ...x, ...patch } : x)))
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1.2fr 1fr auto', gap: 8, alignItems: 'end' }}>
                  <TextInput label="Band name" value={b.label} onChange={(v) => set({ label: v })} placeholder="Evening" />
                  <TextInput label="From (HH:MM)" value={b.start} onChange={(v) => set({ start: v })} />
                  <TextInput label="To (HH:MM)" value={b.end} onChange={(v) => set({ end: v })} />
                  <TextInput label="Days" value={b.days} onChange={(v) => set({ days: v })} options={['every day', 'Mon–Fri', 'Sat–Sun']} />
                  <TextInput label="J$ per kWh" value={b.price} onChange={(v) => set({ price: v })} />
                  <Button size="sm" variant="outline" ariaLabel={`Remove band ${i + 1}`} onClick={() => setBands(bands.filter((_, j) => j !== i))}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              )
            })}
            <div>
              <Button size="sm" variant="outline" onClick={() => setBands([...bands, { label: 'Evening', start: '18:00', end: '06:00', days: 'every day', price: '' }])}>
                + Add time band
              </Button>
            </div>
          </div>
        </div>
      )}

      {kind === 'install_price' && (
        <div style={{ display: 'grid', gap: 8 }}>
          <p style={{ ...muted, margin: 0 }}>What a typical grid-tied system costs fitted (panels, inverter, mounting, labour), per kWp of panels. Use your own price list or a dated survey of real quotes. The solar estimator multiplies this by the system size and shows it as a range — never as a quote.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
            <TextInput label="Where the range comes from" value={ipBasis} onChange={setIpBasis} />
            <TextInput label="Low J$ per kWp" value={kwpLow} onChange={setKwpLow} />
            <TextInput label="High J$ per kWp" value={kwpHigh} onChange={setKwpHigh} />
            <TextInput label="Smallest job J$ (optional)" value={minJob} onChange={setMinJob} />
            <TextInput label="Battery low J$ per kWh (optional)" value={batLow} onChange={setBatLow} />
            <TextInput label="Battery high J$ per kWh (optional)" value={batHigh} onChange={setBatHigh} />
            <TextInput label="Includes / excludes" value={includes} onChange={setIncludes} placeholder="Excludes roof repairs and JPS fees" />
          </div>
        </div>
      )}

      {kind === 'lender_offer' && (
        <div style={{ display: 'grid', gap: 8 }}>
          <p style={{ ...muted, margin: 0 }}>Copy the lender’s advertised terms from their own page. The public calculator shows them as advertised rates with your source and date — never as an offer or a partnership.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
            <TextInput label="Lender" value={lender} onChange={setLender} />
            <TextInput label="Loan product" value={product} onChange={setProduct} placeholder="e.g. Green energy loan" />
            <TextInput label="Annual rate %" value={rate} onChange={setRate} />
            <TextInput label="Rate is “from” (lowest advertised)" value={rateFrom} onChange={setRateFrom} options={['no', 'yes']} />
            <TextInput label="Fixed or variable" value={rateType} onChange={(v) => setRateType(v as typeof rateType)} options={['fixed', 'variable']} />
            <TextInput label="Longest term (months)" value={maxTerm} onChange={setMaxTerm} />
            <TextInput label="Minimum deposit %" value={minDeposit} onChange={setMinDeposit} />
            <TextInput label="Processing fee % of loan" value={procFee} onChange={setProcFee} />
            <TextInput label="Other upfront fees J$ (legal, stamp duty…)" value={otherFees} onChange={setOtherFees} />
            <TextInput label="Monthly account / service fee J$" value={monthlyFee} onChange={setMonthlyFee} />
            <TextInput label="Life insurance % a year of balance" value={lifeIns} onChange={setLifeIns} />
            <TextInput label="Largest loan J$" value={maxLoan} onChange={setMaxLoan} />
            <TextInput label="Notes (fees, eligibility)" value={notes} onChange={setNotes} />
          </div>
        </div>
      )}

      {kind === 'shelter_list' && (
        <div style={{ display: 'grid', gap: 6 }}>
          <p style={{ ...muted, margin: 0 }}>
            Paste one shelter per line: <code>name, parish, address, latitude, longitude</code>. Parish names: {PARISHES.map((p) => p.name).join(', ')}. Leave coordinates blank if unknown — the shelter is listed but not pinned.
          </p>
          <TextInput label="Shelters" value={csv} onChange={setCsv} multiline />
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button size="sm" onClick={save}>Save draft</Button>
        <Button size="sm" variant="outline" onClick={onDone}>Cancel</Button>
        {msg && <span role="alert" style={{ ...muted, color: '#c0392b' }}>{msg}</span>}
      </div>
    </div>
  )
}
