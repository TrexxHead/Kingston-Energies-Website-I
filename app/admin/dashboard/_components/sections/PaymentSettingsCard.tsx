'use client'

import { useCallback, useEffect, useState } from 'react'
import { Wallet, Check } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Button from '../ui/Button'
import TextInput from '../ui/TextInput'

interface PaymentConfig {
  bank: { enabled: boolean; bankName: string; accountName: string; accountNumber: string; accountType: string; branch: string; instructions: string }
  lynk: { enabled: boolean; handle: string; phone: string; instructions: string }
  paypal: { enabled: boolean; link: string; email: string; instructions: string }
  cod: { enabled: boolean; instructions: string }
  card: { enabled: boolean }
}

/**
 * Admin editor for the storefront's payment methods. Toggle each method on and
 * fill in your own details — the checkout shows exactly these to customers, who
 * pay directly and quote their order number. "Card" uses the WiPay gateway and
 * only appears at checkout once WiPay's keys are set in the environment.
 */
export default function PaymentSettingsCard() {
  const [cfg, setCfg] = useState<PaymentConfig | null>(null)
  const [wipayConfigured, setWipayConfigured] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/payment-settings')
    if (res.ok) {
      const data = await res.json()
      setCfg(data.config)
      setWipayConfigured(Boolean(data.wipayConfigured))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    if (!cfg) return
    setBusy(true)
    setSaved(false)
    const res = await fetch('/api/admin/payment-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    })
    setBusy(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  if (!cfg) {
    return (
      <div style={cardStyle}>
        <h3 style={h3Style}>Payment methods</h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading…</p>
      </div>
    )
  }

  // Typed helpers to update a nested method's field.
  const set = <K extends keyof PaymentConfig>(method: K, patch: Partial<PaymentConfig[K]>) =>
    setCfg((c) => (c ? { ...c, [method]: { ...c[method], ...patch } } : c))

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
        <Wallet size={17} color="var(--ke-green-600)" />
        <h3 style={{ ...h3Style, margin: 0 }}>Payment methods</h3>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '0 0 16px' }}>
        Switch on the methods you accept and fill in your details. Customers see these at checkout and pay directly,
        quoting their order number. Mark each order paid from the Orders tab when the money lands.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Bank transfer */}
        <MethodBlock title="Bank transfer" enabled={cfg.bank.enabled} onToggle={(v) => set('bank', { enabled: v })}>
          <Grid>
            <TextInput label="Bank name" value={cfg.bank.bankName} onChange={(v) => set('bank', { bankName: v })} placeholder="NCB, Scotiabank, JN…" />
            <TextInput label="Account name" value={cfg.bank.accountName} onChange={(v) => set('bank', { accountName: v })} placeholder="Kingston Energies Ltd" />
            <TextInput label="Account number" value={cfg.bank.accountNumber} onChange={(v) => set('bank', { accountNumber: v })} />
            <TextInput label="Account type" value={cfg.bank.accountType} onChange={(v) => set('bank', { accountType: v })} placeholder="Chequing / Savings" />
            <TextInput label="Branch" value={cfg.bank.branch} onChange={(v) => set('bank', { branch: v })} />
          </Grid>
          <TextInput label="Extra instructions (optional)" value={cfg.bank.instructions} onChange={(v) => set('bank', { instructions: v })} placeholder="e.g. email the receipt to…" />
        </MethodBlock>

        {/* Lynk */}
        <MethodBlock title="Lynk" enabled={cfg.lynk.enabled} onToggle={(v) => set('lynk', { enabled: v })}>
          <Grid>
            <TextInput label="Lynk handle" value={cfg.lynk.handle} onChange={(v) => set('lynk', { handle: v })} placeholder="@kingstonenergies" />
            <TextInput label="Lynk phone" value={cfg.lynk.phone} onChange={(v) => set('lynk', { phone: v })} placeholder="876…" />
          </Grid>
          <TextInput label="Extra instructions (optional)" value={cfg.lynk.instructions} onChange={(v) => set('lynk', { instructions: v })} />
        </MethodBlock>

        {/* PayPal */}
        <MethodBlock title="PayPal" enabled={cfg.paypal.enabled} onToggle={(v) => set('paypal', { enabled: v })}>
          <Grid>
            <TextInput label="PayPal.me link" value={cfg.paypal.link} onChange={(v) => set('paypal', { link: v })} placeholder="https://paypal.me/…" />
            <TextInput label="PayPal email" value={cfg.paypal.email} onChange={(v) => set('paypal', { email: v })} type="email" />
          </Grid>
          <TextInput label="Extra instructions (optional)" value={cfg.paypal.instructions} onChange={(v) => set('paypal', { instructions: v })} />
        </MethodBlock>

        {/* Cash on delivery */}
        <MethodBlock title="Cash on delivery" enabled={cfg.cod.enabled} onToggle={(v) => set('cod', { enabled: v })}>
          <TextInput label="Instructions" value={cfg.cod.instructions} onChange={(v) => set('cod', { instructions: v })} />
        </MethodBlock>

        {/* Card (WiPay) */}
        <MethodBlock title="Debit / credit card (WiPay)" enabled={cfg.card.enabled} onToggle={(v) => set('card', { enabled: v })}>
          {wipayConfigured ? (
            <p style={{ fontSize: 12.5, color: 'var(--ke-green-700)', margin: 0 }}>WiPay is connected — cards will appear at checkout when this is on.</p>
          ) : (
            <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0 }}>
              Card payments stay hidden until WiPay is connected (set WIPAY_ACCOUNT_NUMBER &amp; WIPAY_API_KEY — see DEPLOY.md).
              You can switch this on now; it activates automatically once WiPay is set up.
            </p>
          )}
        </MethodBlock>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18 }}>
        <Button size="sm" variant="primary" onClick={save}>{busy ? 'Saving…' : 'Save payment settings'}</Button>
        {saved && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--ke-green-700)' }}>
            <Check size={14} /> Saved
          </span>
        )}
      </div>
    </div>
  )
}

function MethodBlock({ title, enabled, onToggle, children }: { title: string; enabled: boolean; onToggle: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: 14, background: enabled ? '#fff' : 'var(--ke-gray-50, #f7f8f7)' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: enabled ? 12 : 0 }}>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onToggle(!enabled)}
          style={{
            width: 40, height: 22, borderRadius: 999, border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0,
            background: enabled ? 'var(--ke-green-600)' : 'var(--color-border-strong, #cbd2ce)', transition: 'background .15s',
          }}
        >
          <span style={{ position: 'absolute', top: 2, left: enabled ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
        </button>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{title}</span>
      </label>
      {enabled && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>}
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{children}</div>
}
