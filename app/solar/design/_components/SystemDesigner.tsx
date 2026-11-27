'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Receipt, ListChecks, Minus, Plus, CalendarCheck, Save, Check, ChevronDown, Sun, BatteryCharging, Cpu, Zap, Moon, MapPin } from 'lucide-react'
import { card, label, input, muted, h2, fmt } from '@/app/my-energy/_components/ui'
import { useProfileSnapshot } from '@/lib/energy/useEnergyProfile'
import { scenarioDevices } from '@/lib/energy/profileSchema'
import { evaluateScenario } from '@/lib/energy/engine/scenario'
import { DESIGN_DEFAULTS, LOSS_CHAIN, BATTERY_PATH_FACTOR, designSystem, type SystemType } from '@/lib/energy/engine/systemDesign'
import { estimateSavings } from '@/lib/energy/engine/solar'
import { installPriceRange } from '@/lib/energy/engine/installPrice'
import { CALC_ENGINE_VERSION } from '@/lib/energy/engine/version'
import { useActiveRecord } from '@/lib/refdata/useRefData'
import { tariffFromPublic } from '@/lib/refdata/types'
import SystemVisual from './SystemVisual'
import QuoteRequest from './QuoteRequest'
import type { DesignSnapshot } from '@/lib/solarProjects'

/**
 * “Design your system” — one flow from a household to a system, a price and
 * a site survey: how much power you use (from the JPS bill or your saved
 * equipment), what must stay on when JPS goes out, and the system that
 * follows, sized by the shared engine (notebook method, engine 1.9.0).
 */

// Typical running watts for "what runs together on a busy evening" — assumed, and labelled so.
const PEAK_ITEMS: { id: string; label: string; watts: number; surgeX?: number; max: number }[] = [
  { id: 'ac', label: 'Air conditioners (inverter, ~12,000 BTU)', watts: 1000, surgeX: 1.5, max: 6 },
  { id: 'fridge', label: 'Fridges / freezers (running)', watts: 150, surgeX: 4, max: 4 },
  { id: 'pump', label: 'Water pump (1 hp)', watts: 750, surgeX: 3, max: 2 },
  { id: 'stove', label: 'Electric stove (2 burners)', watts: 3000, max: 1 },
  { id: 'microwave', label: 'Microwave', watts: 1000, max: 2 },
  { id: 'kettle', label: 'Kettle', watts: 1500, max: 1 },
  { id: 'washer', label: 'Washing machine', watts: 800, surgeX: 2, max: 1 },
  { id: 'iron', label: 'Clothes iron', watts: 1200, max: 1 },
]
const BASE_EVENING_W = 400 // lights, fans, TVs, Wi-Fi, chargers — assumed
// Essentials overnight (12 h): fridge 150 W × 12 h × 40%, LED lights 100 W × 5 h, 2 fans × 50 W × 8 h, Wi-Fi 10 W × 12 h, TV 100 W × 4 h.
const ESSENTIALS_NIGHT_WH = 720 + 500 + 800 + 120 + 400

type Source = 'bill' | 'equipment'
type Backup = 'none' | 'essentials' | 'night' | 'day'

const TYPE_LABEL: Record<SystemType, string> = { grid_tied: 'Grid-tied', hybrid: 'Hybrid (solar + battery)', off_grid: 'Off-grid' }

export default function SystemDesigner() {
  const { profile } = useProfileSnapshot()
  const { record: tariffRecord } = useActiveRecord('tariff', 'residential')
  const { record: priceRecord } = useActiveRecord('install_price')

  const [source, setSource] = useState<Source>('bill')
  const [billKwh, setBillKwh] = useState('')
  const [billNote, setBillNote] = useState<string | null>(null)
  const [nightPct, setNightPct] = useState(50)
  const [counts, setCounts] = useState<Record<string, number>>({ ac: 1, fridge: 1, pump: 0, stove: 0, microwave: 1, kettle: 0, washer: 0, iron: 0 })
  const [backup, setBackup] = useState<Backup>('night')
  const [offGrid, setOffGrid] = useState(false)
  const [moduleW, setModuleW] = useState(DESIGN_DEFAULTS.moduleWatts)
  const [psh, setPsh] = useState(DESIGN_DEFAULTS.peakSunHours)
  const [showWorking, setShowWorking] = useState(false)
  const [saved, setSaved] = useState(false)
  const [quoteOpen, setQuoteOpen] = useState(false)

  // Prefill from the bill history kept on this device (Bill Explainer).
  useEffect(() => {
    try {
      const b = JSON.parse(localStorage.getItem('ke-bill-history-v1') ?? '[]') as { kwh: number; days: number }[]
      if (Array.isArray(b) && b.length) {
        const avg = b.reduce((a, x) => a + (x.kwh / Math.max(1, x.days)) * 30, 0) / b.length
        setBillKwh(String(Math.round(avg)))
        setBillNote(`Average of ${b.length} saved bill${b.length === 1 ? '' : 's'}`)
      }
    } catch {
      /* storage unavailable */
    }
  }, [])

  // Saved equipment (My Energy): the first property's first scenario.
  const equipment = useMemo(() => {
    const prop = profile?.properties.find((p) => p.devices.length && p.scenarios.length)
    if (!prop) return null
    const r = evaluateScenario(scenarioDevices(prop, prop.scenarios[0]))
    return r.ok ? { name: prop.name, scenario: prop.scenarios[0].name, ...r.value } : null
  }, [profile])
  useEffect(() => {
    if (equipment) setSource('equipment')
  }, [equipment])

  const billMonthly = Number(billKwh) > 0 ? Number(billKwh) : null
  const dailyWh = source === 'equipment' && equipment ? equipment.kwhPerDay.base * 1000 : billMonthly ? (billMonthly * 1000) / 30 : 0
  const nightWh = dailyWh * (nightPct / 100)
  const quickPeak = BASE_EVENING_W + PEAK_ITEMS.reduce((a, it) => a + (counts[it.id] ?? 0) * it.watts, 0)
  const quickSurge = quickPeak + Math.max(0, ...PEAK_ITEMS.filter((it) => (counts[it.id] ?? 0) > 0 && it.surgeX).map((it) => it.watts * (it.surgeX! - 1)))
  const peakW = source === 'equipment' && equipment ? equipment.simultaneousWatts : quickPeak
  const surgeW = source === 'equipment' && equipment ? (equipment.startupPeakWatts ?? undefined) : quickSurge
  const essentialsWh = source === 'equipment' && equipment ? equipment.essentialKwhPerDay.base * 1000 * (nightPct / 100) : ESSENTIALS_NIGHT_WH

  const type: SystemType = offGrid ? 'off_grid' : backup === 'none' ? 'grid_tied' : 'hybrid'
  const storageWh = backup === 'essentials' ? Math.min(essentialsWh, nightWh || essentialsWh) : backup === 'day' ? dailyWh : nightWh

  const design = useMemo(
    () =>
      dailyWh > 0
        ? designSystem({ type, dailyWh, nightWh, storageWh: type === 'grid_tied' ? undefined : storageWh, peakWatts: peakW || undefined, surgeWatts: surgeW, peakSunHours: psh, moduleWatts: moduleW, billMonthlyKwh: source === 'equipment' ? (billMonthly ?? undefined) : undefined })
        : null,
    [type, dailyWh, nightWh, storageWh, peakW, surgeW, psh, moduleW, source, billMonthly],
  )
  const d = design?.ok ? design.value : null
  const usableBatteryKwh = d?.battery ? (d.battery.nameplateWh * DESIGN_DEFAULTS.depthOfDischarge) / 1000 : 0
  const nightAvgW = nightWh / 12
  const backupHours = d?.battery && nightAvgW > 0 ? (backup === 'essentials' ? (usableBatteryKwh * 1000) / (essentialsWh / 12) : (usableBatteryKwh * 1000) / nightAvgW) : null

  // Money: savings on the bill (approved tariff), installed price (approved price record).
  const tariff = tariffRecord ? tariffFromPublic(tariffRecord) : null
  const monthlyUseKwh = (dailyWh * 30) / 1000
  const savings = useMemo(() => {
    if (!d || !tariff || monthlyUseKwh <= 0) return null
    const monthly = Array.from({ length: 12 }, (_, m) => (d.array.expectedDailyWh * [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m]) / 1000)
    const annual = monthly.reduce((a, b) => a + b, 0)
    return estimateSavings(tariff, { kwp: d.array.kwp, annualKwh: { low: annual * 0.9, base: annual, high: annual * 1.1 }, monthlyKwh: monthly }, [monthlyUseKwh], d.solarShare, new Date().toISOString().slice(0, 10))
  }, [d, tariff, monthlyUseKwh])
  const price = useMemo(
    () => (d && priceRecord ? installPriceRange({ kwp: d.array.kwp, rates: priceRecord.data, batteryKwh: usableBatteryKwh || undefined, annualSaving: savings?.ok ? { low: savings.value.annualDaytime, high: savings.value.annualDaytime } : undefined }) : null),
    [d, priceRecord, usableBatteryKwh, savings],
  )

  function save() {
    if (!d) return
    try {
      const key = 'ke-system-designs-v1'
      const list = JSON.parse(localStorage.getItem(key) ?? '[]')
      list.unshift({ date: new Date().toISOString().slice(0, 10), engine: CALC_ENGINE_VERSION, type, dailyWh: Math.round(dailyWh), nightWh: Math.round(nightWh), storageWh: Math.round(storageWh), peakW, modules: d.array.modules, moduleW, kwp: d.array.kwp, inverterKw: d.inverter.sizeKw, batteryKwh: d.battery ? +(d.battery.nameplateWh / 1000).toFixed(1) : null })
      localStorage.setItem(key, JSON.stringify(list.slice(0, 5)))
      setSaved(true)
    } catch {
      /* storage unavailable */
    }
  }
  useEffect(() => setSaved(false), [d])

  // What “Get my quote” sends: the design's inputs, outputs and stated assumptions.
  const snapshot: DesignSnapshot | null =
    d && design?.ok
      ? {
          engine: CALC_ENGINE_VERSION,
          type: d.type,
          source,
          billMonthlyKwh: billMonthly,
          dailyWh: Math.round(dailyWh),
          nightWh: Math.round(nightWh),
          storageWh: d.battery ? Math.round(storageWh) : null,
          peakW: peakW ? Math.round(peakW) : null,
          surgeW: surgeW ? Math.round(surgeW) : null,
          backup: offGrid ? 'night' : backup,
          peakSunHours: psh,
          derate: d.derate,
          modules: d.array.modules,
          moduleWatts: d.array.moduleWatts,
          kwp: d.array.kwp,
          expectedDailyKwh: Math.round(d.array.expectedDailyWh / 100) / 10,
          inverterKw: d.inverter.sizeKw,
          batteryKwh: d.battery ? Math.round(d.battery.nameplateWh / 100) / 10 : null,
          batteryDcCurrentA: d.battery?.dcCurrentA ? Math.round(d.battery.dcCurrentA) : null,
          solarShare: d.solarShare,
          priceRange: price?.ok ? { low: Math.round(price.value.total.low), high: Math.round(price.value.total.high) } : null,
          assumptions: design.assumptions.map((a) => `${a.description}${a.value != null ? `: ${a.value}${a.unit ? ` ${a.unit}` : ''}` : ''}`).slice(0, 30),
        }
      : null
  useEffect(() => setQuoteOpen(false), [snapshot?.kwp, snapshot?.batteryKwh, snapshot?.inverterKw])

  const priceMid = price?.ok ? Math.round((price.value.total.low + price.value.total.high) / 2) : null
  const financeHref = priceMid ? `/financing?price=${priceMid}${savings?.ok ? `&saving=${Math.round(savings.value.annualDaytime / 12)}` : ''}` : '/financing'

  return (
    <div className="ke-sd">
      <style>{CSS}</style>

      {/* ── Left: the system, live ── */}
      <aside className="ke-sd-stage" aria-live="polite">
        <div className="ke-sd-visual">
          <SystemVisual modules={d?.array.modules ?? 0} moduleWatts={d?.array.moduleWatts} kwp={d?.array.kwp} inverterKw={d?.inverter.sizeKw ?? null} batteryKwh={d?.battery ? d.battery.nameplateWh / 1000 : null} solarShare={d?.solarShare ?? 0} gridTied={d?.type === 'grid_tied'} />
        </div>
        {d ? (
          <>
            <div className="ke-sd-type">{TYPE_LABEL[d.type]}</div>
            <div className="ke-sd-stats">
              <Stat Icon={Sun} big={`${d.array.modules}`} unit="panels" sub={`${fmt(d.array.kwp, 2)} kW · ${d.array.moduleWatts} W each`} />
              <Stat Icon={Cpu} big={d.inverter.sizeKw ? `${d.inverter.sizeKw}` : '—'} unit="kW inverter" sub={d.type === 'grid_tied' ? 'Grid-tie' : '110/220 V, 50 Hz hybrid'} />
              {d.battery ? <Stat Icon={BatteryCharging} big={fmt(d.battery.nameplateWh / 1000, 1)} unit="kWh battery" sub={`${fmt(usableBatteryKwh, 1)} kWh usable`} /> : <Stat Icon={BatteryCharging} big="—" unit="no battery" sub="No power in outages" />}
              <Stat Icon={Zap} big={`${Math.round(d.solarShare * 100)}%`} unit="of your use" sub={`from the sun on an average day · ≈ ${fmt(d.array.expectedDailyWh / 1000, 1)} kWh`} />
            </div>
            {backupHours != null && (
              <p className="ke-sd-out">
                <Moon size={15} aria-hidden />
                <span>
                  When JPS goes out at dusk, a full battery keeps {backup === 'essentials' ? 'your essentials' : 'your evening use'} on for about <strong>{fmt(Math.min(backupHours, 72), 0)}{backupHours > 72 ? '+' : ''} hours</strong>.
                </span>
              </p>
            )}
            <div className="ke-sd-money">
              {price?.ok ? (
                <>
                  <div>
                    <span className="ke-sd-k">Likely installed price</span>
                    <strong>
                      J${fmt(Math.round(price.value.total.low / 1000) * 1000, 0)} – J${fmt(Math.round(price.value.total.high / 1000) * 1000, 0)}
                    </strong>
                  </div>
                  {savings?.ok && (
                    <div>
                      <span className="ke-sd-k">Bill saving</span>
                      <strong>≈ J${fmt(Math.round(savings.value.annualDaytime / 12 / 100) * 100, 0)}/month</strong>
                    </div>
                  )}
                  {price.value.paybackYears && (
                    <div>
                      <span className="ke-sd-k">Pays for itself in</span>
                      <strong>
                        {fmt(price.value.paybackYears.low, 1)}–{fmt(price.value.paybackYears.high, 1)} years
                      </strong>
                    </div>
                  )}
                </>
              ) : (
                <p style={{ ...muted, margin: 0, fontSize: 13 }}>{priceRecord === undefined ? 'Loading prices…' : 'Installed prices aren’t published yet — a site survey gives you an exact quote.'}</p>
              )}
            </div>
            {quoteOpen && snapshot && <QuoteRequest design={snapshot} onClose={() => setQuoteOpen(false)} />}
            <div className="ke-sd-ctas" hidden={quoteOpen}>
              <button type="button" className="ke-sd-primary" onClick={() => setQuoteOpen(true)}>
                <CalendarCheck size={16} aria-hidden /> Get my quote
              </button>
              <Link href={financeHref} className="ke-sd-ghost">
                Monthly payments
              </Link>
              <button type="button" className="ke-sd-ghost" onClick={save} aria-live="polite">
                {saved ? <Check size={15} aria-hidden /> : <Save size={15} aria-hidden />} {saved ? 'Saved' : 'Save design'}
              </button>
            </div>
          </>
        ) : (
          <p style={{ ...muted, textAlign: 'center', margin: '8px 0 0' }}>{design && !design.ok ? design.message : 'Tell us how much power you use to see your system.'}</p>
        )}
      </aside>

      {/* ── Right: the choices ── */}
      <div className="ke-sd-steps">
        <section style={card} aria-labelledby="sd-1">
          <Step n={1} id="sd-1" title="How much power do you use?" />
          <div className="ke-sd-seg" role="radiogroup" aria-label="Where your usage comes from">
            <button type="button" role="radio" aria-checked={source === 'bill'} onClick={() => setSource('bill')}>
              <Receipt size={15} aria-hidden /> From my JPS bill
            </button>
            <button type="button" role="radio" aria-checked={source === 'equipment'} onClick={() => setSource('equipment')}>
              <ListChecks size={15} aria-hidden /> From my equipment
            </button>
          </div>
          {source === 'bill' ? (
            <div style={{ display: 'grid', gap: 14, marginTop: 14 }}>
              <div>
                <label htmlFor="sd-kwh" style={label}>
                  kWh per month
                </label>
                <input id="sd-kwh" style={input} inputMode="numeric" value={billKwh} onChange={(e) => (setBillKwh(e.target.value.replace(/[^\d]/g, '').slice(0, 5)), setBillNote(null))} placeholder="e.g. 350 — it’s on your JPS bill" />
                <p style={{ ...muted, fontSize: 12.5, margin: '6px 0 0' }}>
                  {billNote ?? 'Use an average of a few months if you can.'} <Link href="/bill-explainer" style={{ color: 'var(--ke-green-400)' }}>Read it from a bill photo</Link>
                </p>
              </div>
              <div>
                <span style={label}>What runs at the same time on a busy evening?</span>
                <div className="ke-sd-items">
                  {PEAK_ITEMS.map((it) => (
                    <div key={it.id} className="ke-sd-item">
                      <span>
                        {it.label}
                        <small> · {fmt(it.watts, 0)} W</small>
                      </span>
                      <span className="ke-sd-step">
                        <button type="button" aria-label={`Fewer ${it.label}`} onClick={() => setCounts((c) => ({ ...c, [it.id]: Math.max(0, (c[it.id] ?? 0) - 1) }))}>
                          <Minus size={14} />
                        </button>
                        <b aria-label={`${it.label}: ${counts[it.id] ?? 0}`}>{counts[it.id] ?? 0}</b>
                        <button type="button" aria-label={`More ${it.label}`} onClick={() => setCounts((c) => ({ ...c, [it.id]: Math.min(it.max, (c[it.id] ?? 0) + 1) }))}>
                          <Plus size={14} />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
                <p style={{ ...muted, fontSize: 12.5, margin: '6px 0 0' }}>
                  Typical figures (assumed) plus {BASE_EVENING_W} W for lights, fans, TVs and Wi-Fi: about <strong style={{ color: '#fff' }}>{fmt(quickPeak, 0)} W</strong> at once. For your own figures, list your equipment in <Link href="/my-energy" style={{ color: 'var(--ke-green-400)' }}>My Energy</Link>.
                </p>
              </div>
            </div>
          ) : equipment ? (
            <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
              <p style={{ ...muted, margin: 0 }}>
                From <strong style={{ color: '#fff' }}>{equipment.name}</strong> · {equipment.scenario}: about <strong style={{ color: '#fff' }}>{fmt(equipment.kwhPerDay.base, 1)} kWh a day</strong>, up to {fmt(equipment.simultaneousWatts, 0)} W at once
                {equipment.startupPeakWatts ? `, ${fmt(equipment.startupPeakWatts, 0)} W with a motor starting` : ''}.
                {equipment.unresolved.length > 0 && ` ${equipment.unresolved.length} item${equipment.unresolved.length === 1 ? ' is' : 's are'} missing figures and left out.`}
              </p>
              <div>
                <label htmlFor="sd-kwh2" style={label}>
                  Your JPS bill, kWh per month (to check the list)
                </label>
                <input id="sd-kwh2" style={input} inputMode="numeric" value={billKwh} onChange={(e) => setBillKwh(e.target.value.replace(/[^\d]/g, '').slice(0, 5))} placeholder="Optional" />
              </div>
              <Link href="/my-energy" style={{ color: 'var(--ke-green-400)', fontSize: 13.5 }}>
                Edit my equipment
              </Link>
            </div>
          ) : (
            <p style={{ ...muted, marginTop: 14 }}>
              No equipment saved yet. <Link href="/my-energy" style={{ color: 'var(--ke-green-400)' }}>List what you run in My Energy</Link>, or use your bill.
            </p>
          )}
          <div style={{ marginTop: 16 }}>
            <label htmlFor="sd-night" style={label}>
              How much of it is after dark? <strong style={{ color: 'var(--ke-green-400)' }}>{nightPct}%</strong>
            </label>
            <input id="sd-night" type="range" min={20} max={85} step={5} value={nightPct} onChange={(e) => setNightPct(Number(e.target.value))} className="ke-sd-range" />
            <p style={{ ...muted, fontSize: 12.5, margin: '2px 0 0' }}>A/C at night pushes this to 60–70%. Batteries are sized for what you use after dark.</p>
          </div>
        </section>

        <section style={card} aria-labelledby="sd-2">
          <Step n={2} id="sd-2" title="When JPS goes out, keep on…" />
          <div className="ke-sd-cards" role="radiogroup" aria-label="Backup">
            {(
              [
                ['essentials', 'Essentials overnight', `Fridge, lights, fans, Wi-Fi, TV — about ${fmt(essentialsWh / 1000, 1)} kWh`],
                ['night', 'Your whole evening and night', `Everything you use after dark — about ${fmt(nightWh / 1000, 1)} kWh`],
                ['day', 'A full day without JPS', `A whole day’s use — about ${fmt(dailyWh / 1000, 1)} kWh`],
                ['none', 'Nothing — just lower my bill', 'Grid-tied: cheapest, but no power in an outage'],
              ] as [Backup, string, string][]
            ).map(([k, t, s]) => (
              <button key={k} type="button" role="radio" aria-checked={backup === k && !offGrid} disabled={offGrid && k === 'none'} onClick={() => (setBackup(k), setOffGrid(false))}>
                <strong>{t}</strong>
                <span>{s}</span>
              </button>
            ))}
          </div>
          <label className="ke-sd-check">
            <input type="checkbox" checked={offGrid} onChange={(e) => (setOffGrid(e.target.checked), backup === 'none' && setBackup('night'))} /> No JPS connection here (off-grid) — we’ll size for the cloudy season and recommend a backup generator
          </label>
          <p style={{ ...muted, fontSize: 12.5, margin: '10px 0 0' }}>
            Most Jamaican homes choose a hybrid: outages are common, and solar you store and use yourself is worth more than solar sold back under net billing. <Link href="/guides/going-solar#types" style={{ color: 'var(--ke-green-400)' }}>Compare system types</Link>
          </p>
        </section>

        <section style={card} aria-labelledby="sd-3">
          <Step n={3} id="sd-3" title="Panels and sunshine" />
          <div className="ke-sd-row">
            <div>
              <label htmlFor="sd-mod" style={label}>
                Panel size
              </label>
              <select id="sd-mod" style={input} value={moduleW} onChange={(e) => setModuleW(Number(e.target.value))}>
                {[450, 500, 550, 600].map((w) => (
                  <option key={w} value={w}>
                    {w} W
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sd-psh" style={label}>
                Peak sun hours <strong style={{ color: 'var(--ke-green-400)' }}>{psh}</strong>
              </label>
              <input id="sd-psh" type="range" min={4} max={6.5} step={0.5} value={psh} onChange={(e) => setPsh(Number(e.target.value))} className="ke-sd-range" />
            </div>
          </div>
          <p style={{ ...muted, fontSize: 12.5, margin: '8px 0 0' }}>
            Jamaica gets about 5–7 kWh per installed kW a day; we design on 5 to be safe. <Link href="/solar" style={{ color: 'var(--ke-green-400)' }}><MapPin size={12} aria-hidden style={{ display: 'inline', verticalAlign: '-1px' }} /> Check your roof fits</Link>
            {d ? ` — you’ll need room for ${d.array.modules} panels (about ${fmt(d.array.modules * 2.6, 0)} m² of clear roof).` : ''}
          </p>
        </section>

        {d && design?.ok && (
          <section style={card} aria-labelledby="sd-work">
            <button type="button" className="ke-sd-work" onClick={() => setShowWorking((v) => !v)} aria-expanded={showWorking} id="sd-work">
              <span style={h2}>How we sized it</span>
              <ChevronDown size={18} aria-hidden style={{ transform: showWorking ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} />
            </button>
            {showWorking && (
              <div style={{ display: 'grid', gap: 14, marginTop: 12 }}>
                <LossChain storedShare={d.storedShare} derate={d.derate} />
                <ol className="ke-sd-calc">
                  <li>
                    <b>Array</b> = {fmt(dailyWh, 0)} Wh a day ÷ ({psh} sun hours × {d.derate.toFixed(3)} losses){type === 'off_grid' ? ' × 1.2 cloudy-season margin' : ''} = <b>{fmt(d.array.minimumW, 0)} W</b> → {d.array.modules} × {d.array.moduleWatts} W panels = {fmt(d.array.kwp, 2)} kW.
                  </li>
                  {d.inverter.requiredW != null && (
                    <li>
                      <b>Inverter</b> ≥ {type === 'grid_tied' ? `array ${fmt(d.array.kwp * 1000, 0)} W ÷ 1.2` : `peak ${fmt(peakW, 0)} W × 1.25`} = {fmt(d.inverter.requiredW, 0)} W → nearest common size <b>{d.inverter.sizeKw} kW</b>
                      {d.inverter.surgeOk != null && `; motor starts up to ${fmt(surgeW ?? 0, 0)} W ${d.inverter.surgeOk ? 'are within' : 'exceed'} its surge rating`}.
                    </li>
                  )}
                  {d.battery && (
                    <li>
                      <b>Battery</b> = {fmt(d.battery.energyNeededWh, 0)} Wh needed ÷ ({DESIGN_DEFAULTS.depthOfDischarge * 100}% usable × {DESIGN_DEFAULTS.batteryEfficiency * 100}% efficient) = <b>{fmt(d.battery.nameplateWh / 1000, 1)} kWh</b> ({fmt(d.battery.ampHours, 0)} Ah at {d.battery.voltage} V).
                      {d.battery.dcCurrentA && ` The battery bank must supply ${fmt(d.battery.dcCurrentA, 0)} A to run the inverter flat out.`}
                    </li>
                  )}
                  {d.billCheck && (
                    <li>
                      <b>Check against your bill</b>: your equipment adds up to {fmt(d.billCheck.loadMonthlyKwh, 0)} kWh a month vs {fmt(d.billCheck.billMonthlyKwh, 0)} on the bill ({d.billCheck.differencePct > 0 ? '+' : ''}
                      {fmt(d.billCheck.differencePct, 0)}%) — {d.billCheck.withinTolerance ? 'close enough.' : 'more than 15% apart, so something needs a second look.'}
                    </li>
                  )}
                </ol>
                {design.warnings.length > 0 && (
                  <ul className="ke-sd-warn">
                    {design.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                )}
                <details>
                  <summary style={{ ...muted, cursor: 'pointer' }}>Assumptions ({design.assumptions.length})</summary>
                  <ul style={{ ...muted, fontSize: 13, margin: '6px 0 0', paddingLeft: 18 }}>
                    {design.assumptions.map((a) => (
                      <li key={a.id}>
                        {a.description}
                        {a.value != null ? `: ${a.value}${a.unit ? ` ${a.unit}` : ''}` : ''}
                      </li>
                    ))}
                  </ul>
                </details>
                <p style={{ ...muted, fontSize: 12, margin: 0 }}>
                  A first design, not a quote: the site survey checks your roof, wiring and main panel, and the chosen equipment’s datasheets set the final string plan and protection. Calculator version {CALC_ENGINE_VERSION}.
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

function Step({ n, id, title }: { n: number; id: string; title: string }) {
  return (
    <h2 id={id} style={{ ...h2, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
      <span className="ke-sd-n">{n}</span>
      {title}
    </h2>
  )
}

function Stat({ Icon, big, unit, sub }: { Icon: typeof Sun; big: string; unit: string; sub: string }) {
  return (
    <div className="ke-sd-stat">
      <Icon size={16} aria-hidden />
      <div>
        <strong>{big}</strong> <span>{unit}</span>
      </div>
      <small>{sub}</small>
    </div>
  )
}

/** “Where the sunlight goes”: each loss in the chain as a step down from 100%. */
function LossChain({ storedShare, derate }: { storedShare: number; derate: number }) {
  const steps = [...LOSS_CHAIN.map((l) => ({ label: l.label, factor: l.factor })), ...(storedShare > 0 ? [{ label: `Battery round trip on the ${Math.round(storedShare * 100)}% used at night`, factor: 1 - storedShare * (1 - BATTERY_PATH_FACTOR) }] : [])]
  let level = 1
  return (
    <div>
      <div style={{ ...muted, color: '#fff', fontWeight: 600, marginBottom: 6 }}>Where the sunlight goes</div>
      <div className="ke-sd-loss" role="list">
        {steps.map((s) => {
          const before = level
          level *= s.factor
          return (
            <div key={s.label} className="ke-sd-loss-row" role="listitem">
              <span>{s.label}</span>
              <span className="ke-sd-loss-bar" aria-hidden>
                <i style={{ width: `${level * 100}%` }} />
                <em style={{ left: `${level * 100}%`, width: `${(before - level) * 100}%` }} />
              </span>
              <b>−{fmt((1 - s.factor) * 100, 1)}%</b>
            </div>
          )
        })}
      </div>
      <p style={{ ...muted, fontSize: 12.5, margin: '6px 0 0' }}>
        About <strong style={{ color: '#fff' }}>{Math.round(derate * 100)}%</strong> of what the panels are rated for reaches your sockets. That’s why a 5 kW system makes about 19 kWh on a 5-hour sun day, not 25 — and why we size for it.
      </p>
    </div>
  )
}

const CSS = `
.ke-sd{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:24px;align-items:start}
@media (max-width:960px){.ke-sd{grid-template-columns:1fr}}
.ke-sd-stage{position:sticky;top:84px;display:grid;gap:14px;padding:18px;border-radius:24px;background:var(--ke-dark-card);border:1px solid var(--ke-dark-hairline)}
@media (max-width:960px){.ke-sd-stage{position:static}}
.ke-sd-visual{border-radius:18px;overflow:hidden}
.ke-sd-type{font-family:var(--font-mono);font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--ke-green-400);text-align:center}
.ke-sd-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.ke-sd-stat{display:grid;gap:2px;padding:12px 14px;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);color:var(--ke-dark-text-muted);font-size:12.5px}
.ke-sd-stat svg{color:var(--ke-green-400)}
.ke-sd-stat strong{font-family:var(--font-display);font-size:28px;color:#fff;letter-spacing:-.02em}
.ke-sd-stat span{color:#fff;font-weight:600;font-size:13.5px}
.ke-sd-out{display:flex;gap:8px;align-items:flex-start;margin:0;padding:12px 14px;border-radius:14px;background:rgba(62,207,142,.08);border:1px solid rgba(62,207,142,.25);color:var(--ke-dark-text);font-size:14px;line-height:1.5}
.ke-sd-out svg{color:var(--ke-green-400);flex-shrink:0;margin-top:3px}
.ke-sd-money{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;padding:14px;border-radius:16px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07)}
.ke-sd-money div{display:grid;gap:2px}
.ke-sd-money strong{color:#fff;font-family:var(--font-display);font-size:17px}
.ke-sd-k{font-size:12px;color:var(--ke-dark-text-muted)}
.ke-sd-ctas{display:flex;gap:8px;flex-wrap:wrap}
.ke-sd .ke-sd-primary{border:0;cursor:pointer;flex:1 1 200px;display:inline-flex;justify-content:center;align-items:center;gap:8px;height:48px;border-radius:999px;background:var(--ke-green-500);color:#0d1714;font-weight:700;font-size:15px;text-decoration:none}
.ke-sd a.ke-sd-ghost,.ke-sd button.ke-sd-ghost{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:48px;padding:0 18px;border-radius:999px;border:1px solid rgba(255,255,255,.22);background:transparent;color:#fff;font-weight:600;font-size:14px;text-decoration:none;cursor:pointer}
.ke-sd-steps{display:grid;gap:16px}
.ke-sd-n{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:999px;background:rgba(62,207,142,.14);color:var(--ke-green-400);font-size:14px;font-family:var(--font-mono)}
.ke-sd-seg{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}
.ke-sd-seg button{display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 14px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:transparent;color:var(--ke-dark-text);font-weight:600;font-size:13.5px;cursor:pointer}
.ke-sd-seg button[aria-checked=true]{border-color:var(--ke-green-400);background:rgba(62,207,142,.12);color:#fff}
.ke-sd-items{display:grid;gap:6px;margin-top:6px}
.ke-sd-item{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.03);color:var(--ke-dark-text);font-size:13.5px}
.ke-sd-item small{color:var(--ke-dark-text-muted)}
.ke-sd-step{display:inline-flex;align-items:center;gap:8px}
.ke-sd-step button{display:grid;place-items:center;width:28px;height:28px;border-radius:999px;border:1px solid rgba(255,255,255,.2);background:transparent;color:#fff;cursor:pointer}
.ke-sd-step b{min-width:14px;text-align:center;color:#fff}
.ke-sd-range{width:100%;accent-color:var(--ke-green-500)}
.ke-sd-cards{display:grid;gap:8px;margin-top:12px}
.ke-sd-cards button{display:grid;gap:2px;text-align:left;padding:12px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:transparent;color:var(--ke-dark-text-muted);font-size:13px;cursor:pointer}
.ke-sd-cards button strong{color:#fff;font-size:14.5px}
.ke-sd-cards button[aria-checked=true]{border-color:var(--ke-green-400);background:rgba(62,207,142,.1)}
.ke-sd-cards button:disabled{opacity:.4;cursor:not-allowed}
.ke-sd-check{display:flex;gap:8px;align-items:flex-start;margin-top:12px;color:var(--ke-dark-text);font-size:13.5px;line-height:1.45}
.ke-sd-check input{margin-top:3px;accent-color:var(--ke-green-500)}
.ke-sd-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}
@media (max-width:520px){.ke-sd-row{grid-template-columns:1fr}}
.ke-sd-work{display:flex;justify-content:space-between;align-items:center;width:100%;background:none;border:0;padding:0;color:#fff;cursor:pointer}
.ke-sd-calc{margin:0;padding-left:18px;display:grid;gap:8px;color:var(--ke-dark-text);font-size:13.5px;line-height:1.55}
.ke-sd-calc b{color:#fff}
.ke-sd-warn{margin:0;padding:10px 12px 10px 28px;border-radius:12px;background:rgba(253,184,19,.08);border:1px solid rgba(253,184,19,.3);color:#f6d48a;font-size:13px;display:grid;gap:4px}
.ke-sd-loss{display:grid;gap:5px}
.ke-sd-loss-row{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr) 48px;gap:10px;align-items:center;font-size:12.5px;color:var(--ke-dark-text-muted)}
.ke-sd-loss-bar{position:relative;height:8px;border-radius:999px;background:rgba(255,255,255,.06);overflow:hidden}
.ke-sd-loss-bar i{position:absolute;inset:0 auto 0 0;background:var(--ke-green-500);border-radius:999px}
.ke-sd-loss-bar em{position:absolute;top:0;bottom:0;background:#e88585}
.ke-sd-loss-row b{color:#f0b4b4;font-weight:600;text-align:right}
@media (max-width:520px){.ke-sd-loss-row{grid-template-columns:1fr 60px;}.ke-sd-loss-bar{display:none}}
`
