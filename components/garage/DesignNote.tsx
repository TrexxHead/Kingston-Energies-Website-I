import { designFor } from '@/lib/vehicles/designs'
import { BODY_LABEL, type BodyStyle } from '@/lib/vehicles/vehicle'

/** Says what the 3D model is drawn from: this model's published dimensions and design, or a typical body shape. */
export default function DesignNote({ make, model, year, bodyStyle }: { make?: string; model?: string; year?: number; bodyStyle: BodyStyle }) {
  const d = designFor(make, model, year)
  const style = { color: 'var(--ke-dark-text-muted)', fontSize: 12, lineHeight: 1.5, margin: 0, textAlign: 'center' as const }
  if (!d)
    return (
      <p style={style} data-testid="design-note">
        3D view: a typical {BODY_LABEL[bodyStyle].toLowerCase()}
        {make && model && year ? ` — we haven’t drawn the ${year} ${make} ${model} yet` : make && model ? ' — add the year to see your model' : ''}.
      </p>
    )
  return (
    <details style={style} data-testid="design-note">
      <summary style={{ cursor: 'pointer', listStylePosition: 'inside' }}>
        3D view: {d.make} {d.model} ({d.yearFrom}–{d.yearTo ?? 'now'}) at its published size
      </summary>
      <p style={{ ...style, marginTop: 4 }}>
        {d.note} {d.lengthMm.toLocaleString('en-JM')} × {d.widthMm.toLocaleString('en-JM')} × {d.heightMm.toLocaleString('en-JM')} mm, {d.wheelbaseMm.toLocaleString('en-JM')} mm wheelbase{d.tyre ? `, ${d.tyre} tyres` : ''}. An illustration, not a scan.{' '}
        Sources:{' '}
        {d.sources.map((u, i) => (
          <span key={u}>
            {i > 0 && ', '}
            <a href={u} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ke-green-400)' }}>
              {new URL(u).hostname.replace(/^www\./, '')}
            </a>
          </span>
        ))}
      </p>
    </details>
  )
}
