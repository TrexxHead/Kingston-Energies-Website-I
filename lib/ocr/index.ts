/**
 * Receipt extraction.
 *
 * No OCR provider is configured. That is a deliberate statement of fact rather
 * than a gap waiting to be papered over: reading amounts off photographs is the
 * kind of thing that is 95% right, and the 5% lands silently in your accounts.
 *
 * So the pipeline is built the other way round. Storing the document against
 * the expense — the part that actually matters for audit — works with no
 * provider at all. Extraction is an optional pre-fill on top, and whether it
 * ran or not, a person confirms the fields before an expense is raised.
 *
 * Adding a provider later means writing an adapter that satisfies this
 * interface. Nothing downstream changes, because the manual path already
 * produces the same shape.
 */

export interface ExtractedField<T> {
  value: T
  /** 0–1. Anything the UI should query rather than trust sits below LOW_CONFIDENCE. */
  confidence: number
}

export interface Extraction {
  vendor?: ExtractedField<string>
  documentDate?: ExtractedField<Date>
  total?: ExtractedField<number>
  taxAmount?: ExtractedField<number>
  currency?: ExtractedField<string>
  /** Raw provider response, kept so a bad read can be investigated. */
  raw: unknown
}

export interface OcrProvider {
  key: string
  label: string
  isConfigured(): boolean
  extract(file: { bytes: Buffer; contentType: string; filename: string }): Promise<Extraction>
}

/** Below this, a field is shown as a question rather than an answer. */
export const LOW_CONFIDENCE = 0.75

const PROVIDERS = new Map<string, OcrProvider>()

export function registerProvider(provider: OcrProvider): void {
  PROVIDERS.set(provider.key, provider)
}

/** The first provider that is actually usable, or null. */
export function activeProvider(): OcrProvider | null {
  for (const p of PROVIDERS.values()) if (p.isConfigured()) return p
  return null
}

/**
 * Run extraction if a provider is available.
 *
 * Returns null when there is none — the caller then keeps the document and asks
 * for the fields. A failed extraction is also null rather than an error: losing
 * the receipt because the OCR service was down would be the worse outcome.
 */
export async function tryExtract(file: { bytes: Buffer; contentType: string; filename: string }): Promise<{ provider: string; extraction: Extraction } | null> {
  const provider = activeProvider()
  if (!provider) return null
  try {
    return { provider: provider.key, extraction: await provider.extract(file) }
  } catch (err) {
    console.error('[ocr] extraction failed:', err)
    return null
  }
}

/** What the UI should say about extraction, derived from the registry. */
export function ocrStatus(): { available: boolean; provider: string | null; message: string } {
  const provider = activeProvider()
  if (provider) {
    return {
      available: true,
      provider: provider.label,
      message: `${provider.label} pre-fills the fields from the document. Check them before confirming — an extraction is a suggestion, not a reading you can rely on.`,
    }
  }
  return {
    available: false,
    provider: null,
    message:
      'No document scanning service is connected, so the fields are entered by hand. The receipt itself is still stored against the expense, which is the part that matters if the books are ever questioned.',
  }
}
