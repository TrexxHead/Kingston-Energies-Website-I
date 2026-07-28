'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Play, Trash2, Info } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import Switch from '../ui/Switch'
import TextInput from '../ui/TextInput'
import { CHROME } from '../charts/palette'

interface Rule {
  id: string
  name: string
  contains: string
  direction: 'ANY' | 'IN' | 'OUT'
  priority: number
  enabled: boolean
  autoPost: boolean
  matchCount: number
  lastMatchAt: string | null
  accountCode: string
  accountName: string
  accountId: string
}

interface RulesData {
  rules: Rule[]
  accounts: { id: string; code: string; name: string; type: string }[]
  unreviewedLines: number
}

const DIRECTIONS: Record<string, 'ANY' | 'IN' | 'OUT'> = {
  'Either direction': 'ANY',
  'Money in only': 'IN',
  'Money out only': 'OUT',
}

const DIRECTION_LABEL: Record<string, string> = { ANY: 'either way', IN: 'money in', OUT: 'money out' }

/**
 * Rules that categorise bank lines automatically.
 *
 * A rule is a saved decision, and by default it only suggests. Auto-posting is
 * opt-in per rule and stated plainly, because a rule that quietly books to the
 * wrong account produces books that look clean and are wrong.
 */
export default function BankRulesTab() {
  const [data, setData] = useState<RulesData | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', contains: '', direction: 'Either direction', account: '', priority: '100', autoPost: false })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ posted: number; suggested: number; unmatched: number } | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/finance/banking/rules')
    if (res.ok) setData(await res.json())
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const nonBankAccounts = (data?.accounts ?? []).filter((a) => a.type === 'EXPENSE' || a.type === 'REVENUE' || a.type === 'LIABILITY')
  const label = (a: { code: string; name: string }) => `${a.code} · ${a.name}`

  const create = async () => {
    setError('')
    if (!form.name.trim()) return setError('Give the rule a name.')
    if (form.contains.trim().length < 2) return setError('Enter at least two characters to match on.')
    const account = nonBankAccounts.find((a) => label(a) === form.account) ?? nonBankAccounts[0]
    if (!account) return setError('There is no category to post to.')

    setBusy(true)
    const res = await fetch('/api/admin/finance/banking/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        contains: form.contains,
        direction: DIRECTIONS[form.direction] ?? 'ANY',
        accountId: account.id,
        priority: Number(form.priority) || 100,
        autoPost: form.autoPost,
      }),
    })
    setBusy(false)
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || 'Could not save this rule.')
    setOpen(false)
    setForm({ name: '', contains: '', direction: 'Either direction', account: '', priority: '100', autoPost: false })
    load()
  }

  const update = async (id: string, changes: Record<string, unknown>) => {
    await fetch('/api/admin/finance/banking/rules', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...changes }),
    })
    load()
  }

  const remove = async (rule: Rule) => {
    if (!confirm(`Delete the rule "${rule.name}"? Entries it already posted stay on the books.`)) return
    await fetch(`/api/admin/finance/banking/rules?id=${rule.id}`, { method: 'DELETE' })
    load()
  }

  const run = async () => {
    setBusy(true)
    setResult(null)
    const res = await fetch('/api/admin/finance/banking/rules', { method: 'PUT' })
    setBusy(false)
    if (res.ok) {
      setResult(await res.json())
      load()
    }
  }

  if (!data) return <div style={cardStyle}><p style={{ fontSize: 13, color: CHROME.textMuted, margin: 0 }}>Loading rules…</p></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ ...cardStyle, borderRadius: 14, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Info size={16} style={{ color: CHROME.textMuted, flexShrink: 0, marginTop: 2 }} aria-hidden />
        <div style={{ fontSize: 13, lineHeight: 1.55, color: CHROME.textMuted }}>
          A rule matches text in a statement line and assigns it a category. New rules only <strong>suggest</strong>.
          Turn on auto-post for a rule once you have watched it get the answer right — a rule that books to the wrong
          account produces books that look tidy and are wrong.
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
          <h3 style={{ ...h3Style, margin: 0 }}>Rules</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {data.rules.length > 0 && (
              <Button size="sm" variant="outline" onClick={run} disabled={busy} iconRight={<Play size={13} />}>
                {busy ? 'Running…' : `Run over ${data.unreviewedLines} unreviewed`}
              </Button>
            )}
            <Button size="sm" onClick={() => setOpen(true)} iconRight={<Plus size={14} />}>
              New rule
            </Button>
          </div>
        </div>

        {result && (
          <div style={{ fontSize: 13, color: CHROME.textMuted, marginBottom: 12, lineHeight: 1.55 }}>
            {result.posted} line{result.posted === 1 ? '' : 's'} posted automatically, {result.suggested} matched a
            suggest-only rule and are waiting for you, {result.unmatched} matched nothing.
          </div>
        )}

        {data.rules.length === 0 ? (
          <div style={{ padding: 28, textAlign: 'center', color: CHROME.textMuted, fontSize: 13.5, lineHeight: 1.6 }}>
            No rules yet. Once you have categorised the same payee a few times, a rule saves doing it again.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.rules.map((r) => (
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '12px 14px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 14,
                  flexWrap: 'wrap',
                  opacity: r.enabled ? 1 : 0.6,
                }}
              >
                <div style={{ minWidth: 220, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5 }}>{r.name}</span>
                    {r.autoPost ? <Badge tone="orange">Posts automatically</Badge> : <Badge tone="neutral">Suggests only</Badge>}
                    {/* A rule that has never fired is dead weight — say so. */}
                    {r.matchCount === 0 && <Badge tone="grey">Never matched</Badge>}
                  </div>
                  <div style={{ fontSize: 12, color: CHROME.textMuted, marginTop: 3, lineHeight: 1.5 }}>
                    Description contains <strong>&ldquo;{r.contains}&rdquo;</strong> ({DIRECTION_LABEL[r.direction]}) →{' '}
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{r.accountCode}</span> {r.accountName}
                  </div>
                  <div style={{ fontSize: 11.5, color: CHROME.textSubtle, marginTop: 2 }}>
                    Priority {r.priority} · matched {r.matchCount} time{r.matchCount === 1 ? '' : 's'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: CHROME.textMuted }}>
                    <Switch checked={r.enabled} onChange={(v) => update(r.id, { enabled: v })} />
                    Enabled
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: CHROME.textMuted }}>
                    <Switch checked={r.autoPost} onChange={(v) => update(r.id, { autoPost: v })} />
                    Auto-post
                  </label>
                  <Button size="sm" variant="outline" onClick={() => remove(r)} iconRight={<Trash2 size={13} />}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {open && (
        <Modal onClose={() => setOpen(false)} title="New rule" width={480}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <TextInput label="Rule name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Flow — internet" />
            <TextInput
              label="Description contains"
              value={form.contains}
              onChange={(v) => setForm({ ...form, contains: v })}
              placeholder="FLOW"
            />
            <TextInput label="Applies to" value={form.direction} options={Object.keys(DIRECTIONS)} onChange={(v) => setForm({ ...form, direction: v })} />
            <TextInput
              label="Category"
              value={form.account || (nonBankAccounts[0] ? label(nonBankAccounts[0]) : '')}
              options={nonBankAccounts.map(label)}
              onChange={(v) => setForm({ ...form, account: v })}
            />
            <TextInput label="Priority (lower wins)" value={form.priority} onChange={(v) => setForm({ ...form, priority: v })} type="number" />
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13, lineHeight: 1.5 }}>
              <Switch checked={form.autoPost} onChange={(v) => setForm({ ...form, autoPost: v })} />
              <span>
                Post matching lines automatically
                <span style={{ display: 'block', fontSize: 12, color: CHROME.textMuted }}>
                  Leave this off until you have seen the rule get it right a few times.
                </span>
              </span>
            </label>
            {error && <div style={{ color: 'var(--color-danger,#dc2626)', fontSize: 13 }}>{error}</div>}
            <Button onClick={create} disabled={busy}>
              {busy ? 'Saving…' : 'Save rule'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
