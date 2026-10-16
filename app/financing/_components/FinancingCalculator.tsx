'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Trash2, Download, ChevronDown, Info, Scale } from 'lucide-react'
import { card, label, input, muted, h2, fmt } from '@/app/my-energy/_components/ui'
import { loanDetail, type LoanFee, type LoanDetailResult } from '@/lib/energy/engine/finance'
import type { PublicRecord } from '@/lib/refdata/types'

/**
 * Financing calculator (roadmap W2, detailed rebuild). Three questions give
 * the monthly payment straight away; everything else — fees, insurance,
 * extra payments, rate rises, budget, schedule, comparison — opens on
 * demand. Lender terms are ADVERTISED figures staff copy from each lender's
 * page (reference data), shown with source and date — never an offer.
 */

const KEY = 'ke-financing-v2'
const COMPARE_KEY = 'ke-financing-compare-v1'
const num = (v: string) => (v.trim() === '' ? undefined : Number(v.replace(/,/g, '')))
const money = (v: number) => `J$${fmt(Math.round(v), 0)}`
const digits = (v: string) => v.replace(/[^\d.,]/g, '')

type FeeRow = { id: string; label: string; basis: 'flat' | 'percent'; value: string; when: LoanFee['when'] }
const newId = () => Math.random().toString(36).slice(2, 9)
const WHEN_LABEL: Record<LoanFee['when'], string> = { upfront: 'Paid at the start', financed: 'Added to the loan', monthly: 'Every month', yearly: 'Every year' }
// Common charges on Jamaican loans — amounts are left for the visitor to fill from their lender.
const QUICK_FEES: { label: string; basis: 'flat' | 'percent'; when: LoanFee['when'] }[] = [
  { label: 'Processing / commitment fee', basis: 'percent', when: 'upfront' },
  { label: 'Legal & stamp duty', basis: 'flat', when: 'upfront' },
  { label: 'Valuation / inspection', basis: 'flat', when: 'upfront' },
  { label: 'Monthly service fee', basis: 'flat', when: 'monthly' },
  { label: 'Equipment insurance', basis: 'flat', when: 'yearly' },
]

interface Form {
  price: string
  deposit: string
  depositMode: 'jmd' | 'pct'
  offerId: string
  rate: string
  years: string
  fees: FeeRow[]
  life: string
  extra: string
  io: string
  rise: string
  income: string
  saving: string
}
const EMPTY: Form = { price: '', deposit: '', depositMode: 'jmd', offerId: '', rate: '', years: '5', fees: [], life: '', extra: '', io: '', rise: '2', income: '', saving: '' }

interface Saved {
  name: string
  monthly: number
  trueRate: number | null
  costOfCredit: number
  totalPaid: number
  months: number
  rate: number
}

export default function FinancingCalculator() {
  const [offers, setOffers] = useState<PublicRecord<'lender_offer'>[] | null>(null)
  const [f, setF] = useState<Form>(EMPTY)
  const [loaded, setLoaded] = useState(false)
  const [compare, setCompare] = useState<Saved[]>([])
  const [open, setOpen] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch('/api/refdata?kind=lender_offer&all=1')
      .then((r) => (r.ok ? r.json() : { records: [] }))
      .then((d) => setOffers(d.records ?? []))
      .catch(() => setOffers([]))
    let next = EMPTY
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null')
      if (saved) next = { ...EMPTY, ...saved }
      setCompare(JSON.parse(localStorage.getItem(COMPARE_KEY) ?? '[]'))
    } catch {
      /* storage unavailable */
    }
    // Pre-fill from a link, e.g. /financing?saving=18000 from the solar estimator.
    const q = new URLSearchParams(window.location.search)
    if (q.get('price')) next = { ...next, price: digits(q.get('price') ?? '') }
    if (q.get('saving')) next = { ...next, saving: digits(q.get('saving') ?? '') }
    setF(next)
    setLoaded(true)
  }, [])
  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(KEY, JSON.stringify(f))
    } catch {
      /* ignore */
    }
  }, [f, loaded])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }))
  const offer = offers?.find((o) => o.id === f.offerId)

  // Choosing a lender fills in its published rate, term limit and charges.
  function chooseOffer(id: string) {
    const o = offers?.find((x) => x.id === id)
    if (!o) return set('offerId', '')
    const d = o.data
    const fees: FeeRow[] = f.fees.filter((x) => !x.id.startsWith('lender-'))
    if (d.processingFeePct != null) fees.push({ id: 'lender-proc', label: `${d.lender} processing fee`, basis: 'percent', value: String(d.processingFeePct), when: 'upfront' })
    if (d.otherUpfrontFees != null) fees.push({ id: 'lender-other', label: `${d.lender} other upfront fees`, basis: 'flat', value: String(d.otherUpfrontFees), when: 'upfront' })
    if (d.monthlyFee != null) fees.push({ id: 'lender-monthly', label: `${d.lender} monthly fee`, basis: 'flat', value: String(d.monthlyFee), when: 'monthly' })
    const yrs = num(f.years) ?? 5
    setF((x) => ({
      ...x,
      offerId: id,
      rate: String(d.annualRatePct),
      years: d.maxTermMonths && yrs * 12 > d.maxTermMonths ? String(Math.max(1, Math.floor(d.maxTermMonths / 12))) : x.years,
      fees,
      life: d.lifeInsurancePctPerYear != null ? String(d.lifeInsurancePctPerYear) : x.life,
    }))
  }

  const price = num(f.price) ?? 0
  const depositJmd = f.depositMode === 'pct' ? (price * (num(f.deposit) ?? 0)) / 100 : num(f.deposit) ?? 0
  const termMonths = Math.round((num(f.years) ?? 0) * 12)
  const result = useMemo(
    () =>
      loanDetail({
        price,
        deposit: depositJmd,
        annualRatePct: num(f.rate) ?? Number.NaN,
        termMonths,
        fees: f.fees.map((x) => ({ label: x.label, basis: x.basis, value: num(x.value) ?? 0, when: x.when })),
        lifeInsurancePctPerYear: num(f.life),
        interestOnlyMonths: num(f.io),
        extraMonthly: num(f.extra),
        rateRisePct: num(f.rise),
        monthlySaving: num(f.saving),
        monthlyIncome: num(f.income),
      }),
    [price, depositJmd, f, termMonths],
  )
  const v = result.ok ? result.value : null

  // Lender limits worth flagging (as advertised).
  const flags: string[] = []
  if (offer && v) {
    if (offer.data.minDepositPct != null && depositJmd < (offer.data.minDepositPct / 100) * price) flags.push(`${offer.data.lender} advertises a minimum deposit of ${offer.data.minDepositPct}% (${money((offer.data.minDepositPct / 100) * price)} here).`)
    if (offer.data.maxTermMonths && termMonths > offer.data.maxTermMonths) flags.push(`${offer.data.lender} advertises terms up to ${Math.round(offer.data.maxTermMonths / 12)} years.`)
    if (offer.data.maxLoan != null && v.borrowed > offer.data.maxLoan) flags.push(`${offer.data.lender} advertises loans up to ${money(offer.data.maxLoan)}.`)
  }

  function saveOption() {
    if (!v) return
    const name = offer ? `${offer.data.lender} — ${f.years} yrs` : `${f.rate}% over ${f.years} yrs`
    const next = [...compare.filter((c) => c.name !== name), { name, monthly: v.monthlyOutgoing, trueRate: v.trueAnnualRatePct, costOfCredit: v.costOfCredit, totalPaid: v.totalPaid, months: v.months, rate: num(f.rate) ?? 0 }].slice(-3)
    setCompare(next)
    setOpen((o) => ({ ...o, compare: true }))
    try {
      localStorage.setItem(COMPARE_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }
  function removeOption(name: string) {
    const next = compare.filter((c) => c.name !== name)
    setCompare(next)
    try {
      localStorage.setItem(COMPARE_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }
  function downloadCsv() {
    if (!v) return
    const rows = [['Month', 'Payment (J$)', 'Interest (J$)', 'Principal (J$)', 'Fees (J$)', 'Insurance (J$)', 'Balance after (J$)'], ...v.schedule.map((r) => [r.month, r.payment, r.interest, r.principal, r.fees, r.insurance, r.balance].map((x, i) => (i === 0 ? String(x) : (x as number).toFixed(2))))]
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'loan-schedule.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const field = (id: string, text: string, value: string, onChange: (s: string) => void, hint?: string, help?: string) => (
    <div>
      <label htmlFor={id} style={label}>{text}</label>
      <input id={id} style={input} inputMode="decimal" placeholder={hint} value={value} onChange={(e) => onChange(digits(e.target.value))} />
      {help && <small style={{ ...muted, fontSize: 12, display: 'block', marginTop: 4 }}>{help}</small>}
    </div>
  )
  const section = (id: string, title: string, summary: string | null, body: React.ReactNode) => (
    <section className="ke-fx-acc" style={card}>
      <button type="button" className="ke-fx-acc__head" aria-expanded={!!open[id]} aria-controls={`fx-${id}`} onClick={() => setOpen((o) => ({ ...o, [id]: !o[id] }))}>
        <span>
          <strong>{title}</strong>
          {summary && <small>{summary}</small>}
        </span>
        <ChevronDown size={18} aria-hidden style={{ transform: open[id] ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} />
      </button>
      {open[id] && (
        <div id={`fx-${id}`} className="ke-fx-acc__body">
          {body}
        </div>
      )}
    </section>
  )

  const endDate = v ? new Date(new Date().getFullYear(), new Date().getMonth() + v.months, 1).toLocaleDateString('en-JM', { month: 'long', year: 'numeric' }) : ''
  const feeCount = f.fees.filter((x) => num(x.value)).length + (num(f.life) ? 1 : 0)
  const years = v ? Array.from({ length: Math.ceil(v.months / 12) }, (_, y) => v.schedule.slice(y * 12, y * 12 + 12)) : []

  return (
    <div className="ke-fx" style={{ display: 'grid', gap: 18 }}>
      <style>{CSS}</style>

      <div className="ke-fx-top">
        {/* 1–3: the only questions you must answer */}
        <section style={{ ...card, display: 'grid', gap: 16, alignContent: 'start' }} aria-labelledby="fx-basics">
          <h2 id="fx-basics" style={h2}>Your loan in three steps</h2>
          <div className="ke-fx-step">
            <span className="ke-fx-num">1</span>
            {field('fx-price', 'What does it cost? (J$)', f.price, (s) => set('price', s), 'The total on your quote')}
          </div>
          <div className="ke-fx-step">
            <span className="ke-fx-num">2</span>
            <div>
              <label htmlFor="fx-dep" style={label}>How much will you put down?</label>
              <div className="ke-fx-inline">
                <input id="fx-dep" style={input} inputMode="decimal" placeholder={f.depositMode === 'pct' ? 'e.g. 10' : '0 if nothing'} value={f.deposit} onChange={(e) => set('deposit', digits(e.target.value))} />
                <div className="ke-fx-seg" role="group" aria-label="Deposit in">
                  <button type="button" aria-pressed={f.depositMode === 'jmd'} onClick={() => set('depositMode', 'jmd')}>J$</button>
                  <button type="button" aria-pressed={f.depositMode === 'pct'} onClick={() => set('depositMode', 'pct')}>%</button>
                </div>
              </div>
              {f.depositMode === 'pct' && price > 0 && <small style={{ ...muted, fontSize: 12 }}>= {money(depositJmd)}</small>}
            </div>
          </div>
          <div className="ke-fx-step">
            <span className="ke-fx-num">3</span>
            <div style={{ display: 'grid', gap: 10 }}>
              {offers && offers.length > 0 && (
                <div>
                  <label htmlFor="fx-offer" style={label}>Choose a lender (advertised rates)</label>
                  <select id="fx-offer" style={input} value={f.offerId} onChange={(e) => chooseOffer(e.target.value)}>
                    <option value="">I’ll type my own rate</option>
                    {offers.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.data.lender} — {o.data.product}: {o.data.rateIsFrom ? 'from ' : ''}{o.data.annualRatePct}% {o.data.rateType}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="ke-fx-two">
                {field('fx-rate', 'Interest rate (% a year)', f.rate, (s) => set('rate', s), 'From the lender')}
                <div>
                  <label htmlFor="fx-years" style={label}>Years to repay</label>
                  <input id="fx-years" style={input} inputMode="decimal" value={f.years} onChange={(e) => set('years', digits(e.target.value))} />
                  <input aria-label="Years to repay (slider)" type="range" min={1} max={offer?.data.maxTermMonths ? Math.max(1, Math.floor(offer.data.maxTermMonths / 12)) : 15} step={1} value={Math.min(15, num(f.years) ?? 5)} onChange={(e) => set('years', e.target.value)} className="ke-fx-range" />
                </div>
              </div>
              {offer && (
                <small style={{ ...muted, fontSize: 12 }}>
                  As advertised on {offer.source.url ? <a href={offer.source.url} target="_blank" rel="noopener noreferrer" className="ke-fx-link">{offer.source.title}</a> : offer.source.title}, read {offer.source.retrievedAt}. {offer.data.rateIsFrom && '“From” is the lowest advertised rate — yours may be higher. '}
                  {offer.data.rateType === 'variable' && 'Variable rate — it can change during the loan. '}
                  {offer.data.notes}
                </small>
              )}
            </div>
          </div>
        </section>

        {/* The answer */}
        <section className="ke-fx-result" aria-labelledby="fx-res" aria-live="polite">
          <h2 id="fx-res" className="ke-fx-result__title">Each month</h2>
          {!v ? (
            <p style={{ ...muted, margin: 0 }}>{result.ok ? null : result.message}</p>
          ) : (
            <>
              <div className="ke-fx-big">{money(v.monthlyOutgoing)}</div>
              <p className="ke-fx-sub">
                {(() => {
                  const extra = num(f.extra) ?? 0
                  const charges = v.monthlyOutgoing - v.instalment - extra
                  const parts = [`loan payment ${money(v.instalment)}`, extra > 0 ? `extra ${money(extra)}` : null, charges > 1 ? `fees & insurance ${money(charges)}` : null].filter(Boolean)
                  return parts.join(' + ')
                })()}{' '}
                · for {v.months} months, until {endDate}
              </p>
              {v.interestOnlyPayment != null && <p className="ke-fx-sub">First {num(f.io)} months: {money(v.interestOnlyPayment)} (interest only)</p>}
              <dl className="ke-fx-facts">
                <div><dt>You borrow</dt><dd>{money(v.borrowed)}</dd></div>
                <div><dt>Interest</dt><dd>{money(v.totalInterest)}</dd></div>
                <div><dt>Fees &amp; insurance</dt><dd>{money(v.totalFees + v.totalInsurance)}</dd></div>
                <div>
                  <dt>
                    True yearly cost{' '}
                    <span className="ke-fx-tip" title="Every fee and insurance charge folded into one yearly rate — like the APR on a loan agreement. Use it to compare loans.">
                      <Info size={12} aria-label="What is this?" />
                    </span>
                  </dt>
                  <dd>{v.trueAnnualRatePct != null ? `${fmt(v.trueAnnualRatePct, 2)}%` : '—'}</dd>
                </div>
              </dl>
              <MoneyBar v={v} deposit={depositJmd} />
              {v.upfrontCash > 0 && <p className="ke-fx-sub">Cash needed at the start: {money(depositJmd + v.upfrontCash)} (deposit {money(depositJmd)} + fees {money(v.upfrontCash)})</p>}
              {flags.map((x) => (
                <p key={x} className="ke-fx-note">{x}</p>
              ))}
              <button type="button" className="ke-fx-save" onClick={saveOption}>
                <Scale size={15} aria-hidden /> Save to compare
              </button>
            </>
          )}
        </section>
      </div>

      {section(
        'fees',
        'Fees and insurance',
        feeCount ? `${feeCount} added${v ? ` · ${money(v.totalFees + v.totalInsurance)} over the loan` : ''}` : 'Add the charges on your loan offer for the true cost',
        <div style={{ display: 'grid', gap: 12 }}>
          <p style={{ ...muted, margin: 0 }}>Ask the lender for every charge in writing. Add each one the way they state it — a J$ amount or a % of the loan — and when you pay it.</p>
          <div className="ke-fx-chips">
            {QUICK_FEES.map((q) => (
              <button key={q.label} type="button" onClick={() => set('fees', [...f.fees, { id: newId(), label: q.label, basis: q.basis, value: '', when: q.when }])}>
                <Plus size={13} aria-hidden /> {q.label}
              </button>
            ))}
            <button type="button" onClick={() => set('fees', [...f.fees, { id: newId(), label: 'Other fee', basis: 'flat', value: '', when: 'upfront' }])}>
              <Plus size={13} aria-hidden /> Other
            </button>
          </div>
          {f.fees.length > 0 && (
            <div className="ke-fx-fees" role="table" aria-label="Fees">
              {f.fees.map((x) => (
                <div key={x.id} className="ke-fx-fee" role="row">
                  <input aria-label="Fee name" style={input} value={x.label} onChange={(e) => set('fees', f.fees.map((y) => (y.id === x.id ? { ...y, label: e.target.value.slice(0, 60) } : y)))} />
                  <div className="ke-fx-inline">
                    <input aria-label={`${x.label} amount`} style={input} inputMode="decimal" placeholder={x.basis === 'percent' ? '%' : 'J$'} value={x.value} onChange={(e) => set('fees', f.fees.map((y) => (y.id === x.id ? { ...y, value: digits(e.target.value) } : y)))} />
                    <div className="ke-fx-seg" role="group" aria-label={`${x.label} in`}>
                      <button type="button" aria-pressed={x.basis === 'flat'} onClick={() => set('fees', f.fees.map((y) => (y.id === x.id ? { ...y, basis: 'flat' } : y)))}>J$</button>
                      <button type="button" aria-pressed={x.basis === 'percent'} onClick={() => set('fees', f.fees.map((y) => (y.id === x.id ? { ...y, basis: 'percent' } : y)))}>%</button>
                    </div>
                  </div>
                  <select aria-label={`When is ${x.label} paid`} style={input} value={x.when} onChange={(e) => set('fees', f.fees.map((y) => (y.id === x.id ? { ...y, when: e.target.value as LoanFee['when'] } : y)))}>
                    {(Object.keys(WHEN_LABEL) as LoanFee['when'][]).map((w) => (
                      <option key={w} value={w}>{WHEN_LABEL[w]}</option>
                    ))}
                  </select>
                  <button type="button" className="ke-fx-icon" aria-label={`Remove ${x.label}`} onClick={() => set('fees', f.fees.filter((y) => y.id !== x.id))}>
                    <Trash2 size={15} aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ maxWidth: 340 }}>
            {field('fx-life', 'Life insurance (% a year of what you owe)', f.life, (s) => set('life', s), 'e.g. from the offer letter', 'Many loans require creditor life cover. Charged monthly on the balance, so it falls as you repay.')}
          </div>
          <p style={{ ...muted, margin: 0, fontSize: 12.5 }}>
            “Paid at the start” comes out of your pocket on day one; “Added to the loan” is borrowed, so you pay interest on it. A percentage is of the amount you borrow.
          </p>
        </div>,
      )}

      {section(
        'faster',
        'Pay it off faster',
        v?.extra ? `${v.extra.monthsSaved} months sooner · ${money(v.extra.interestSaved)} less interest` : 'Extra payments and interest-only months',
        <div style={{ display: 'grid', gap: 12 }}>
          <div className="ke-fx-two">
            {field('fx-extra', 'Extra each month (J$)', f.extra, (s) => set('extra', s), 'e.g. 5,000', 'Check the lender allows early repayment without a penalty.')}
            {field('fx-io', 'Interest-only months at the start', f.io, (s) => set('io', s.replace(/\D/g, '')), '0', 'Some loans start with a grace period — payments are lower, but the loan costs more overall.')}
          </div>
          {v?.extra && (
            <p style={{ margin: 0, color: '#fff' }}>
              Paying {money(num(f.extra) ?? 0)} extra clears the loan <strong>{v.extra.monthsSaved} months sooner</strong> and saves <strong>{money(v.extra.interestSaved)}</strong> in interest.
            </p>
          )}
        </div>,
      )}

      {section(
        'rise',
        'If the interest rate goes up',
        v?.rateRise ? `+${f.rise} points → ${money(v.rateRise.instalment)} a month` : offer?.data.rateType === 'variable' ? 'This is a variable rate — check what a rise would cost' : 'For variable-rate loans',
        <div style={{ display: 'grid', gap: 10 }}>
          <label htmlFor="fx-rise" style={label}>Rate rise to test: {f.rise || 0} percentage points</label>
          <input id="fx-rise" type="range" min={0} max={6} step={0.5} value={num(f.rise) ?? 0} onChange={(e) => set('rise', e.target.value)} className="ke-fx-range" />
          {v?.rateRise && (
            <p style={{ margin: 0, color: '#fff' }}>
              At {fmt(v.rateRise.ratePct, 2)}%, the loan payment would be <strong>{money(v.rateRise.instalment)}</strong> — {money(v.rateRise.difference)} more each month.
            </p>
          )}
          <p style={{ ...muted, margin: 0, fontSize: 12.5 }}>A fixed rate stays the same for the term stated in your agreement; a variable rate can move with the lender’s base rate.</p>
        </div>,
      )}

      {section(
        'budget',
        'Can I afford it?',
        v?.incomeSharePct != null ? `${fmt(v.incomeSharePct, 0)}% of your income` : v?.netMonthly != null ? (v.netMonthly > 0 ? `costs ${money(v.netMonthly)} more than it saves` : `saves ${money(-v.netMonthly)} more than it costs`) : 'Compare with your income and bill saving',
        <div style={{ display: 'grid', gap: 12 }}>
          <div className="ke-fx-two">
            {field('fx-income', 'Take-home income a month (J$)', f.income, (s) => set('income', s), 'Optional — stays in this browser')}
            {field('fx-save', 'Monthly bill saving (J$)', f.saving, (s) => set('saving', s), 'From the solar estimator')}
          </div>
          {v?.incomeSharePct != null && (
            <p style={{ margin: 0, color: '#fff' }}>
              The monthly cost is <strong>{fmt(v.incomeSharePct, 1)}%</strong> of your take-home pay. Lenders look at how much of your income goes on all debt repayments together — ask yours what limit they use.
            </p>
          )}
          {v?.netMonthly != null && (
            <p style={{ margin: 0, color: '#fff' }}>
              {v.netMonthly > 0 ? <>While you repay, it costs about <strong>{money(v.netMonthly)} a month more</strong> than it saves.</> : <>The bill saving covers it — about <strong>{money(-v.netMonthly)} a month to spare</strong>.</>}{' '}
              {v.breakEvenMonth != null ? <>Savings catch up with everything you’ve paid after about <strong>{fmt(v.breakEvenMonth / 12, 1)} years</strong>.</> : <>At this saving it doesn’t pay for itself within 25 years.</>}
            </p>
          )}
          <p style={{ ...muted, margin: 0, fontSize: 12.5 }}>
            Don’t know your saving? The <Link href="/solar" className="ke-fx-link">rooftop solar estimator</Link> works it out from your roof and bill.
          </p>
        </div>,
      )}

      {section(
        'schedule',
        'Year-by-year breakdown',
        v ? `${Math.ceil(v.months / 12)} years · download every month` : null,
        v ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <div className="ke-fx-tablewrap">
              <table className="ke-fx-table">
                <thead>
                  <tr>
                    <th scope="col">Year</th>
                    <th scope="col">You pay</th>
                    <th scope="col">Interest</th>
                    <th scope="col">Off the loan</th>
                    <th scope="col">Fees &amp; insurance</th>
                    <th scope="col">Still owed</th>
                  </tr>
                </thead>
                <tbody>
                  {years.map((rows, y) => {
                    const s = (k: 'payment' | 'interest' | 'principal' | 'fees' | 'insurance') => rows.reduce((a, r) => a + r[k], 0)
                    return (
                      <tr key={y}>
                        <th scope="row">{y + 1}</th>
                        <td>{money(s('payment') + s('fees') + s('insurance'))}</td>
                        <td>{money(s('interest'))}</td>
                        <td>{money(s('principal'))}</td>
                        <td>{money(s('fees') + s('insurance'))}</td>
                        <td>{money(rows[rows.length - 1].balance)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div>
              <button type="button" className="ke-fx-save" onClick={downloadCsv}>
                <Download size={15} aria-hidden /> Download the monthly schedule (CSV)
              </button>
            </div>
          </div>
        ) : (
          <p style={{ ...muted, margin: 0 }}>Fill in the three steps first.</p>
        ),
      )}

      {section(
        'compare',
        'Compare loans',
        compare.length ? `${compare.length} saved` : 'Save up to three loans and see them side by side',
        compare.length === 0 ? (
          <p style={{ ...muted, margin: 0 }}>Set up a loan, press “Save to compare”, then change the lender, rate or years and save again.</p>
        ) : (
          <div className="ke-fx-tablewrap">
            <table className="ke-fx-table">
              <thead>
                <tr>
                  <th scope="col">Loan</th>
                  <th scope="col">Each month</th>
                  <th scope="col">True yearly cost</th>
                  <th scope="col">Cost of borrowing</th>
                  <th scope="col">Total paid</th>
                  <th scope="col">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {compare.map((c) => {
                  const cheapest = c.costOfCredit === Math.min(...compare.map((x) => x.costOfCredit))
                  return (
                    <tr key={c.name}>
                      <th scope="row">
                        {c.name}
                        {cheapest && compare.length > 1 && <span className="ke-fx-badge">Lowest total cost</span>}
                      </th>
                      <td>{money(c.monthly)}</td>
                      <td>{c.trueRate != null ? `${fmt(c.trueRate, 2)}%` : '—'}</td>
                      <td>{money(c.costOfCredit)}</td>
                      <td>{money(c.totalPaid)}</td>
                      <td>
                        <button type="button" className="ke-fx-icon" aria-label={`Remove ${c.name}`} onClick={() => removeOption(c.name)}>
                          <Trash2 size={14} aria-hidden />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ),
      )}

      {result.ok && (
        <ul style={{ ...muted, fontSize: 12.5, margin: 0, paddingLeft: 18 }}>
          {result.assumptions.map((a) => (
            <li key={a.id}>{a.description}</li>
          ))}
          {result.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
          <li>Kingston Energies isn’t a lender and doesn’t arrange loans; lenders listed here are for comparison only. Your inputs stay in this browser.</li>
        </ul>
      )}
    </div>
  )
}

/** Where every dollar goes over the loan — one stacked bar, labelled in the legend (never colour alone). */
function MoneyBar({ v, deposit }: { v: LoanDetailResult; deposit: number }) {
  const parts = [
    { k: 'Deposit', val: deposit, c: '#9aa7a1' },
    { k: 'Repaying the loan', val: v.borrowed - v.financedFees, c: 'var(--ke-green-400)' },
    { k: 'Interest', val: v.totalInterest, c: 'var(--ke-sun-300)' },
    { k: 'Fees & insurance', val: v.totalFees + v.totalInsurance, c: '#e8836f' },
  ].filter((p) => p.val > 0.5)
  const total = parts.reduce((s, p) => s + p.val, 0)
  return (
    <figure className="ke-fx-bar" aria-label={`Over the loan you pay ${money(total)}: ${parts.map((p) => `${p.k} ${money(p.val)}`).join(', ')}`}>
      <figcaption>Over the whole loan you pay {money(total)}</figcaption>
      <div className="ke-fx-bar__track" aria-hidden>
        {parts.map((p) => (
          <i key={p.k} style={{ width: `${(p.val / total) * 100}%`, background: p.c }} title={`${p.k}: ${money(p.val)}`} />
        ))}
      </div>
      <ul className="ke-fx-bar__legend">
        {parts.map((p) => (
          <li key={p.k}>
            <i style={{ background: p.c }} aria-hidden /> {p.k} <b>{money(p.val)}</b>
          </li>
        ))}
      </ul>
    </figure>
  )
}

const CSS = `
.ke-fx-top{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:18px;align-items:start}
@media (max-width:880px){.ke-fx-top{grid-template-columns:minmax(0,1fr)}}
.ke-fx>*,.ke-fx-top>*{min-width:0}
.ke-fx-step{display:grid;grid-template-columns:30px 1fr;gap:12px;align-items:start}
.ke-fx-num{display:grid;place-items:center;width:30px;height:30px;margin-top:24px;border-radius:50%;background:rgba(110,200,90,.14);color:var(--ke-green-400);font-weight:800;font-size:14px}
.ke-fx-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media (max-width:520px){.ke-fx-two{grid-template-columns:1fr}}
.ke-fx-inline{display:flex;gap:6px;align-items:center}
.ke-fx-inline input{flex:1;min-width:0}
.ke-fx-seg{display:flex;flex:none;padding:3px;border-radius:10px;border:1px solid rgba(255,255,255,.14)}
.ke-fx-seg button{height:34px;min-width:38px;padding:0 10px;border:0;border-radius:8px;background:transparent;color:var(--ke-dark-text);font-weight:700;font-size:13px;cursor:pointer}
.ke-fx-seg button[aria-pressed=true]{background:var(--ke-green-400);color:#0d1714}
.ke-fx-range{width:100%;margin-top:8px;accent-color:var(--ke-green-400)}
.ke-fx-link{color:var(--ke-green-400);font-weight:600;text-decoration:none}
.ke-fx-result{position:sticky;top:84px;display:grid;gap:12px;padding:24px;border-radius:22px;background:linear-gradient(160deg,rgba(63,157,42,.16),rgba(63,157,42,.04));border:1px solid rgba(110,200,90,.28)}
@media (max-width:880px){.ke-fx-result{position:static}}
.ke-fx-result__title{margin:0;font-family:var(--font-mono);font-size:12px;letter-spacing:.24em;text-transform:uppercase;color:var(--ke-green-400);font-weight:600}
.ke-fx-big{font-family:var(--font-display);font-weight:800;font-size:clamp(38px,6vw,54px);letter-spacing:-.03em;color:#fff;line-height:1;font-variant-numeric:tabular-nums}
.ke-fx-sub{margin:0;color:var(--ke-dark-text-muted);font-size:13.5px;line-height:1.5}
.ke-fx-facts{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:4px 0 0}
.ke-fx-facts div{padding:10px 12px;border-radius:12px;background:rgba(0,0,0,.18)}
.ke-fx-facts dt{font-size:12px;color:var(--ke-dark-text-muted);display:flex;gap:4px;align-items:center}
.ke-fx-facts dd{margin:2px 0 0;color:#fff;font-weight:700;font-size:17px;font-variant-numeric:tabular-nums}
.ke-fx-tip{display:inline-flex;cursor:help;color:var(--ke-dark-text-muted)}
.ke-fx-note{margin:0;padding:9px 12px;border-radius:10px;background:rgba(255,200,87,.08);border:1px solid rgba(255,200,87,.28);font-size:13px;color:var(--ke-dark-text)}
.ke-fx-save{display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 14px;border-radius:11px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.04);color:#fff;font-weight:600;font-size:13.5px;cursor:pointer;justify-self:start}
.ke-fx-save:hover{background:rgba(255,255,255,.08)}
.ke-fx-bar{margin:4px 0 0;display:grid;gap:8px}
.ke-fx-bar figcaption{font-size:12.5px;color:var(--ke-dark-text-muted)}
.ke-fx-bar__track{display:flex;gap:2px;height:14px;border-radius:7px;overflow:hidden}
.ke-fx-bar__track i{display:block;height:100%;min-width:3px}
.ke-fx-bar__legend{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:12.5px;color:var(--ke-dark-text)}
.ke-fx-bar__legend li{display:flex;align-items:center;gap:6px}
.ke-fx-bar__legend i{width:10px;height:10px;border-radius:3px;flex:none}
.ke-fx-bar__legend b{margin-left:auto;font-variant-numeric:tabular-nums;color:#fff}
.ke-fx-acc{padding:0!important;overflow:hidden}
.ke-fx-acc__head{display:flex;justify-content:space-between;align-items:center;gap:12px;width:100%;padding:18px 22px;background:none;border:0;color:#fff;text-align:left;cursor:pointer;font:inherit}
.ke-fx-acc__head strong{display:block;font-family:var(--font-display);font-size:17px}
.ke-fx-acc__head small{display:block;margin-top:2px;color:var(--ke-dark-text-muted);font-size:13px}
.ke-fx-acc__body{padding:0 22px 22px}
.ke-fx-chips{display:flex;flex-wrap:wrap;gap:6px}
.ke-fx-chips button{display:inline-flex;align-items:center;gap:5px;height:32px;padding:0 12px;border-radius:999px;border:1px dashed rgba(255,255,255,.25);background:transparent;color:var(--ke-dark-text);font-size:13px;font-weight:600;cursor:pointer}
.ke-fx-chips button:hover{border-style:solid;background:rgba(255,255,255,.05)}
.ke-fx-fees{display:grid;gap:8px}
.ke-fx-fee{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr) 36px;gap:8px;align-items:center}
@media (max-width:720px){.ke-fx-fee{grid-template-columns:1fr 36px}.ke-fx-fee>*:nth-child(2),.ke-fx-fee>*:nth-child(3){grid-column:1}}
.ke-fx-icon{display:grid;place-items:center;width:34px;height:38px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:none;color:var(--ke-dark-text-muted);cursor:pointer}
.ke-fx-icon:hover{color:#f6a5a5;border-color:rgba(246,165,165,.4)}
.ke-fx-tablewrap{overflow-x:auto}
.ke-fx-table{width:100%;border-collapse:collapse;font-size:13.5px;font-variant-numeric:tabular-nums}
.ke-fx-table th,.ke-fx-table td{padding:9px 10px;text-align:right;border-bottom:1px solid rgba(255,255,255,.07);white-space:nowrap;color:var(--ke-dark-text)}
.ke-fx-table thead th{font-size:12px;color:var(--ke-dark-text-muted);font-weight:600}
.ke-fx-table th:first-child,.ke-fx-table td:first-child{text-align:left}
.ke-fx-table tbody th{color:#fff;font-weight:600}
.ke-fx-badge{display:inline-block;margin-left:8px;padding:2px 8px;border-radius:999px;background:rgba(110,200,90,.16);color:var(--ke-green-400);font-size:11px;font-weight:700}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
`
