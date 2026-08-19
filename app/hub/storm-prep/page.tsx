'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CloudLightning, Check, ExternalLink, ShoppingBag } from 'lucide-react'
import Topbar from '../_components/Topbar'
import { wizardCard } from '../energy-checkup/_components/shared'
import { CATALOG, fmt, type Product } from '@/lib/catalog'
import { useCart } from '@/components/cart/CartContext'
import { useToast } from '@/components/cart/ToastContext'
import { Button, Badge } from '@/components/shop/ui'

const STORAGE_KEY = 'ke-storm-checklist'

interface ChecklistItem {
  id: string
  text: string
}

const CHECKLIST: ChecklistItem[] = [
  { id: 'powerbanks', text: 'Charge every power bank to 100%' },
  { id: 'station', text: 'Charge your power station (if you have one) to 100%' },
  { id: 'devices', text: 'Charge phones, laptops and any medical devices to 100%' },
  { id: 'light', text: 'Have a flashlight or lantern ready — don’t rely on a phone screen for hours of light' },
  { id: 'cables', text: 'Keep charging cables and adapters together in one bag, not scattered around the house' },
  { id: 'fridge', text: 'Set the fridge/freezer as cold as it goes now — it holds temperature far longer once the power cuts' },
  { id: 'unplug', text: 'Know what you’ll unplug first to stretch a power station’s runtime (AC and water heating first)' },
  { id: 'records', text: 'Save your order numbers and warranty info somewhere you can reach offline' },
]

// The catalog's own picks for a storm kit — real products, real prices, no
// invented "kit" SKU. Kept to a short, deliberately chosen list rather than
// every power bank/station in the catalog.
const KIT_PRODUCT_IDS = ['pb10', 'st300', 'chcab']

export default function StormPrepPage() {
  const { addItem } = useCart()
  const { pushToast } = useToast()
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setChecked(new Set(JSON.parse(raw)))
    } catch { /* ignore */ }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...checked]))
    } catch { /* ignore */ }
  }, [checked, loaded])

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const done = checked.size
  const pct = Math.round((done / CHECKLIST.length) * 100)

  const kitItems = KIT_PRODUCT_IDS.map((id) => CATALOG.find((p) => p.id === id)).filter((p): p is Product => Boolean(p))

  return (
    <>
      <Topbar title="Storm prep" subtitle="Get ready before an outage, not during one" />
      <div className="ke-screen" style={{ padding: 32 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ background: 'var(--gradient-deep)', borderRadius: 24, padding: 32, color: '#fff', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CloudLightning size={20} color="var(--ke-green-400)" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.24em', color: 'var(--ke-green-400)', textTransform: 'uppercase' }}>
                Storm &amp; outage prep
              </span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, lineHeight: 1.1, margin: '10px 0 8px' }}>
              A checklist, not a scramble
            </h1>
            <p style={{ fontSize: 14.5, color: 'rgba(234,242,236,.75)', maxWidth: 560, lineHeight: 1.6, margin: 0 }}>
              Jamaica&apos;s Atlantic hurricane season runs June 1 through November 30. Most of what actually helps
              during an outage takes five minutes and needs to happen before the power goes, not after.
            </p>
            <p style={{ fontSize: 12.5, color: 'rgba(234,242,236,.55)', marginTop: 14 }}>
              For active watches and warnings, follow{' '}
              <a href="https://www.odpem.org.jm/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ke-green-400)' }}>
                ODPEM <ExternalLink size={11} style={{ display: 'inline', verticalAlign: '-1px' }} />
              </a>{' '}
              — this page is prep guidance, not a live weather alert.
            </p>
          </div>

          <div style={{ ...wizardCard, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, margin: 0 }}>Before the power goes</h3>
              <Badge tone={pct === 100 ? 'green' : 'neutral'}>{done} of {CHECKLIST.length} done</Badge>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: 'var(--ke-gray-100)', overflow: 'hidden', margin: '12px 0 18px' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--ke-green-500)', transition: 'width .4s var(--ease-out)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {CHECKLIST.map((item) => {
                const isChecked = checked.has(item.id)
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggle(item.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                      padding: '10px 8px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      background: 'transparent',
                    }}
                  >
                    <span
                      style={{
                        width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                        border: isChecked ? 'none' : '1.5px solid var(--color-border-strong)',
                        background: isChecked ? 'var(--ke-green-500)' : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {isChecked && <Check size={13} color="#fff" />}
                    </span>
                    <span style={{ fontSize: 13.5, lineHeight: 1.5, color: isChecked ? 'var(--color-text-muted)' : 'var(--color-text)', textDecoration: isChecked ? 'line-through' : 'none' }}>
                      {item.text}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div style={wizardCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <ShoppingBag size={16} color="var(--ke-green-600)" />
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, margin: 0 }}>Not ready yet?</h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '6px 0 16px', maxWidth: 560 }}>
              The core of a storm kit — one to charge phones on the go, one to keep bigger essentials running, one to
              keep everything connected.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {kitItems.map((p) => (
                <div key={p.id} style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{fmt(p.price)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                    <Link href={`/product/${p.id}`} style={{ flex: 1, textDecoration: 'none' }}>
                      <Button size="sm" variant="outline" block>View</Button>
                    </Link>
                    <Button
                      size="sm"
                      onClick={() => {
                        addItem({ name: p.name, price: p.price, spec: p.spec })
                        pushToast('check', 'Added to cart', p.name)
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
