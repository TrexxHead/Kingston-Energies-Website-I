import type { EvidenceRecord, EvidenceSourceType, ReviewState } from './evidence'

interface SpecEvidenceRow {
  id: string
  field: string
  valueNum: number | null
  valueText: string | null
  unit: string | null
  sourceType: string
  sourceUrl: string | null
  reviewState: string
  verifiedAt: Date | null
  expiresAt: Date | null
}

/** Map SpecEvidence rows to the pure evidence model. */
export function toEvidenceRecords(rows: SpecEvidenceRow[]): EvidenceRecord[] {
  return rows.map((e) => ({
    id: e.id,
    field: e.field,
    valueNum: e.valueNum,
    valueText: e.valueText,
    unit: e.unit,
    sourceType: e.sourceType as EvidenceSourceType,
    sourceUrl: e.sourceUrl,
    reviewState: e.reviewState as ReviewState,
    verifiedAt: e.verifiedAt?.toISOString() ?? null,
    expiresAt: e.expiresAt?.toISOString() ?? null,
  }))
}
