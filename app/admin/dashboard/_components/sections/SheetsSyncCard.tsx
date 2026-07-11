'use client'

import { useEffect, useState } from 'react'
import { Sheet, ExternalLink } from 'lucide-react'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { cardStyle, h3Style } from '../ui/card'

interface SyncResult {
  ok: boolean
  syncedAt: string
  sheetUrl?: string
  counts?: Record<string, number>
  error?: string
}

export default function SheetsSyncCard() {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<SyncResult | null>(null)

  useEffect(() => {
    fetch('/api/admin/sheets-sync')
      .then((r) => r.json())
      .then((d) => setConfigured(Boolean(d.configured)))
      .catch(() => setConfigured(false))
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    const res = await fetch('/api/admin/sheets-sync', { method: 'POST' })
    const body: SyncResult = await res.json()
    setLastResult(body)
    setSyncing(false)
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sheet size={16} color="var(--ke-green-600)" />
          <h3 style={{ ...h3Style, margin: 0 }}>Live spreadsheet</h3>
        </div>
        {configured === false && <Badge tone="orange">Not configured</Badge>}
        {configured === true && <Badge tone="green">Connected</Badge>}
      </div>

      {configured === false && (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          Business data can sync automatically to a Google Sheet. Add the service account credentials
          to enable it — see DEPLOY.md for setup steps.
        </p>
      )}

      {configured === true && (
        <>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 12 }}>
            Sales, customers, inventory, suppliers and support data sync to Google Sheets automatically
            every 15 minutes, or on demand below.
          </p>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Button size="sm" onClick={handleSync}>
              {syncing ? 'Syncing…' : 'Sync now'}
            </Button>
            {lastResult?.ok && lastResult.sheetUrl && (
              <a
                href={lastResult.sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: 'var(--ke-green-600)' }}
              >
                Open sheet <ExternalLink size={12} />
              </a>
            )}
          </div>

          {lastResult && (
            <div style={{ marginTop: 10, fontSize: 12, color: lastResult.ok ? 'var(--color-text-muted)' : 'var(--color-danger, #d33)' }}>
              {lastResult.ok
                ? `Synced ${new Date(lastResult.syncedAt).toLocaleTimeString()} — ${lastResult.counts?.orders ?? 0} orders, ${lastResult.counts?.customers ?? 0} customers`
                : `Sync failed: ${lastResult.error}`}
            </div>
          )}
        </>
      )}
    </div>
  )
}
