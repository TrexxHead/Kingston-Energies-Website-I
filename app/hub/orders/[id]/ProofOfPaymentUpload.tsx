'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UploadCloud, CheckCircle2 } from 'lucide-react'

export default function ProofOfPaymentUpload({ orderId, initiallyUploaded }: { orderId: string; initiallyUploaded: boolean }) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploaded, setUploaded] = useState(initiallyUploaded)

  const submit = async () => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`/api/orders/${orderId}/proof`, { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Could not upload that file.')
        setBusy(false)
        return
      }
      setUploaded(true)
      setFile(null)
      router.refresh()
    } catch {
      setError('Network error — please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 16, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <UploadCloud size={18} color="var(--ke-green-600)" />
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14.5, margin: 0 }}>Proof of payment</h3>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '0 0 14px' }}>
        Paid by bank transfer, Lynk, or PayPal? Upload a screenshot or photo of the confirmation so we can mark your order
        as paid faster. JPEG, PNG, WEBP, GIF or PDF — up to 5 MB (larger photos are compressed automatically).
      </p>

      {uploaded && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ke-green-700)', marginBottom: 12 }}>
          <CheckCircle2 size={16} />
          Received — we'll confirm once it's checked.
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          style={{ fontSize: 12.5, flex: '1 1 200px' }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!file || busy}
          style={{
            height: 38,
            padding: '0 18px',
            borderRadius: 999,
            border: 'none',
            background: 'var(--color-primary)',
            color: '#fff',
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 13,
            cursor: !file || busy ? 'default' : 'pointer',
            opacity: !file || busy ? 0.6 : 1,
          }}
        >
          {busy ? 'Uploading…' : uploaded ? 'Upload another' : 'Upload'}
        </button>
      </div>

      {error && <p style={{ fontSize: 12.5, color: 'var(--ke-red-600, #dc2626)', marginTop: 10 }}>{error}</p>}

      <p style={{ fontSize: 11.5, color: 'var(--color-text-subtle)', marginTop: 14 }}>
        No account? Email your proof of payment to{' '}
        <a href="mailto:kingstonenergygroup@outlook.com" style={{ color: 'var(--ke-green-700)' }}>kingstonenergygroup@outlook.com</a>{' '}
        with your order number in the subject.
      </p>
    </div>
  )
}
