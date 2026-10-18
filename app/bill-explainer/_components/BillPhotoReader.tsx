'use client'

import { useRef, useState } from 'react'
import { Camera, FileText, Loader2 } from 'lucide-react'
import { muted } from '@/app/my-energy/_components/ui'
import type { BillReading } from '@/lib/bills/billReading'

/**
 * “Read my bill from a photo or PDF.” Photos are shrunk in the browser first
 * (long side 1800 px, JPEG) so they upload quickly and stay under the size
 * limit; PDFs from JPS go as they are. The result fills the form for the
 * customer to check — nothing is saved by us.
 */
export default function BillPhotoReader({ onRead }: { onRead: (r: BillReading, checks: string[]) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<'idle' | 'reading' | 'error'>('idle')
  const [msg, setMsg] = useState<string | null>(null)

  async function handle(file: File) {
    setState('reading')
    setMsg(null)
    try {
      const payload = file.type === 'application/pdf' ? { mediaType: 'application/pdf', data: await toBase64(file) } : { mediaType: 'image/jpeg', data: await shrink(file) }
      if (payload.data.length > 4_300_000) throw new Error('That file is too large — under 3 MB, please.')
      const res = await fetch('/api/bills/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error ?? 'The bill couldn’t be read.')
      onRead(j.reading, j.checks ?? [])
      setState('idle')
    } catch (e) {
      setState('error')
      setMsg((e as Error).message)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 8, padding: '14px 16px', borderRadius: 16, border: '1px dashed rgba(62,207,142,.4)', background: 'rgba(62,207,142,.05)' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={state === 'reading'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 999, border: 0, background: 'var(--ke-green-500)', color: '#0d1714', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
        >
          {state === 'reading' ? <Loader2 size={16} aria-hidden className="ke-spin" /> : <Camera size={16} aria-hidden />}
          {state === 'reading' ? 'Reading your bill…' : 'Read my bill from a photo or PDF'}
        </button>
        <span style={{ ...muted, fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <FileText size={13} aria-hidden /> A photo of the whole first page, or the PDF from JPS.
        </span>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
        capture="environment"
        hidden
        aria-label="Bill photo or PDF"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) handle(f)
        }}
      />
      <p style={{ ...muted, fontSize: 12, margin: 0 }}>The file is sent to our AI provider (Anthropic) to read the numbers and isn’t stored by us. You check every figure before anything is worked out.</p>
      {msg && (
        <p role="alert" style={{ ...muted, color: '#f6a5a5', margin: 0 }}>
          {msg}
        </p>
      )}
      <style>{'.ke-spin{animation:ke-spin 1s linear infinite}@keyframes ke-spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )
}

function toBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(new Error('That file couldn’t be opened.'))
    r.readAsDataURL(file)
  })
}

async function shrink(file: File): Promise<string> {
  let bmp: ImageBitmap
  try {
    bmp = await createImageBitmap(file)
  } catch {
    throw new Error('This browser can’t open that photo format — take a JPEG photo or use the PDF.')
  }
  const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale)
  c.height = Math.round(bmp.height * scale)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  bmp.close()
  const blob: Blob = await new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('Couldn’t prepare the photo.'))), 'image/jpeg', 0.86))
  return toBase64(blob)
}
