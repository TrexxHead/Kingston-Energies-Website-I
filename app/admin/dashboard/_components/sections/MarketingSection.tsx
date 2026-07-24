'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, Check } from 'lucide-react'
import Button from '../ui/Button'
import Switch from '../ui/Switch'
import { cardStyle, h3Style } from '../ui/card'
import AnnouncementCard from './AnnouncementCard'
import DiscountCodesCard from './DiscountCodesCard'
import CampaignsCard from './CampaignsCard'

interface Banner { text: string; active: boolean }
interface FlashSale { enabled: boolean; headline: string; subtext: string; href: string }
interface MarketingConfig { banners: Banner[]; flash: FlashSale }

export default function MarketingSection() {
  const [cfg, setCfg] = useState<MarketingConfig | null>(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/marketing')
    if (res.ok) setCfg((await res.json()).marketing)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    if (!cfg) return
    setBusy(true)
    setSaved(false)
    const res = await fetch('/api/admin/marketing', {
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

  const setBanner = (i: number, patch: Partial<Banner>) =>
    setCfg((c) => (c ? { ...c, banners: c.banners.map((b, j) => (j === i ? { ...b, ...patch } : b)) } : c))
  const addBanner = () => setCfg((c) => (c ? { ...c, banners: [...c.banners, { text: '', active: true }] } : c))
  const removeBanner = (i: number) => setCfg((c) => (c ? { ...c, banners: c.banners.filter((_, j) => j !== i) } : c))
  const setFlash = (patch: Partial<FlashSale>) => setCfg((c) => (c ? { ...c, flash: { ...c.flash, ...patch } } : c))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <AnnouncementCard />

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, alignItems: 'start' }}>
        {/* Homepage banners — editable */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <h3 style={{ ...h3Style, margin: 0 }}>Homepage banners</h3>
            <Button size="sm" variant="outline" onClick={addBanner} iconRight={<Plus size={13} />}>Add</Button>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '0 0 12px' }}>
            Short promo pills shown on the homepage. Toggle each on/off; only active ones appear.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cfg?.banners.map((b, i) => (
              <div key={i} style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  value={b.text}
                  onChange={(e) => setBanner(i, { text: e.target.value })}
                  placeholder="e.g. Free delivery over J$10,000"
                  style={{ flex: 1, minWidth: 0, height: 34, padding: '0 10px', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none' }}
                />
                <Switch checked={b.active} onChange={(v) => setBanner(i, { active: v })} />
                <button type="button" onClick={() => removeBanner(i)} aria-label="Remove banner" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {cfg && cfg.banners.length === 0 && <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0 }}>No banners — add one above.</p>}
          </div>
        </div>

        {/* Flash sale — editable */}
        <div style={{ background: 'var(--gradient-deep)', borderRadius: 16, padding: 20, color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ ...h3Style, margin: 0, color: '#fff' }}>Flash sale</h3>
            <Switch checked={cfg?.flash.enabled ?? false} onChange={(v) => setFlash({ enabled: v })} />
          </div>
          {cfg && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <DarkField label="Headline" value={cfg.flash.headline} onChange={(v) => setFlash({ headline: v })} placeholder="20% off power banks" />
              <DarkField label="Subtext" value={cfg.flash.subtext} onChange={(v) => setFlash({ subtext: v })} placeholder="This weekend only" />
              <DarkField label="Link" value={cfg.flash.href} onChange={(v) => setFlash({ href: v })} placeholder="/shop" />
              <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,.6)', margin: 0 }}>
                {cfg.flash.enabled ? 'Live on the homepage when saved.' : 'Paused — turn on and save to show it.'}
              </p>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button size="sm" variant="primary" onClick={save}>{busy ? 'Saving…' : 'Save homepage promos'}</Button>
        {saved && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--ke-green-700)' }}>
            <Check size={14} /> Saved — live on the homepage
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        <DiscountCodesCard />
        <CampaignsCard />
      </div>
    </div>
  )
}

function DarkField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,.7)', marginBottom: 4 }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', height: 36, padding: '0 12px', border: '1px solid rgba(255,255,255,.2)', borderRadius: 9, background: 'rgba(255,255,255,.1)', color: '#fff', fontSize: 13.5, outline: 'none', fontFamily: 'var(--font-body)' }}
      />
    </label>
  )
}
