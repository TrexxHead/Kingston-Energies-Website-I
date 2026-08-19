'use client'

import { useEffect, useState } from 'react'
import { WifiOff, Wifi, DownloadCloud, Check } from 'lucide-react'
import { wizardCard } from '../../energy-checkup/_components/shared'
import { Button, Badge } from '@/components/shop/ui'

const OFFLINE_PACK_URLS = [
  '/hub/storm-prep',
  '/hub/storm-prep/checklist',
  '/hub/storm-prep/resources',
  '/hub/storm-prep/family-plan',
]

type DownloadState = 'idle' | 'downloading' | 'done' | 'error'

/**
 * Connectivity indicator + a one-tap "download" that visits every Storm
 * prep page so the service worker caches it — best-effort offline access,
 * not a guarantee. The checklist and family plan already work fully
 * offline once cached (they're localStorage-only); the dashboard and
 * resources pages degrade gracefully when their API calls fail offline
 * (already handled — they fall back to "not done"/"none found" rather
 * than crashing), they just won't show live account data until back online.
 */
export default function OfflineCard() {
  const [online, setOnline] = useState(true)
  const [swReady, setSwReady] = useState(false)
  const [downloadState, setDownloadState] = useState<DownloadState>('idle')

  useEffect(() => {
    setOnline(navigator.onLine)
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.ready.then(() => setSwReady(true)).catch(() => {})
  }, [])

  async function downloadPack() {
    setDownloadState('downloading')
    try {
      await Promise.all(OFFLINE_PACK_URLS.map((url) => fetch(url, { cache: 'reload' })))
      setDownloadState('done')
    } catch {
      setDownloadState('error')
    }
  }

  return (
    <div style={{ ...wizardCard, marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {online ? <Wifi size={16} color="var(--ke-green-600)" /> : <WifiOff size={16} color="#c0821c" />}
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, margin: 0 }}>Offline access</h3>
        </div>
        <Badge tone={online ? 'green' : 'orange'} dot>{online ? 'Online' : 'Offline'}</Badge>
      </div>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '6px 0 16px', maxWidth: 620 }}>
        Once downloaded, the checklist and family plan work with no connection at all — they only ever read and write
        this browser&apos;s local storage. The dashboard and resources pages will still open, but any live account
        data (checkup status, registered devices) won&apos;t refresh until you&apos;re back online.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Button
          size="sm"
          variant="outline"
          onClick={downloadPack}
          disabled={!online || downloadState === 'downloading'}
          iconLeft={downloadState === 'done' ? <Check size={14} /> : <DownloadCloud size={14} />}
        >
          {downloadState === 'downloading' ? 'Downloading…' : downloadState === 'done' ? 'Downloaded for offline' : 'Download for offline'}
        </Button>
        {!swReady && <span style={{ fontSize: 11.5, color: 'var(--color-text-subtle)' }}>Setting up offline support…</span>}
        {downloadState === 'error' && <span style={{ fontSize: 11.5, color: '#c0821c' }}>Couldn&apos;t download everything — try again.</span>}
        {!online && <span style={{ fontSize: 11.5, color: 'var(--color-text-subtle)' }}>Reconnect to download or refresh the pack.</span>}
      </div>
    </div>
  )
}
