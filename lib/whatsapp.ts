/**
 * WhatsApp channel (roadmap W6).
 *
 * 1. Click-to-chat: a wa.me link to the business number. Needs only
 *    NEXT_PUBLIC_WHATSAPP_NUMBER (the owner's WhatsApp Business number);
 *    the button stays hidden until it's set.
 * 2. Outbound messages through the WhatsApp Business Cloud API (Meta):
 *    WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID and an APPROVED template name
 *    per message type (e.g. WHATSAPP_TEMPLATE_BOOKING). WhatsApp only allows
 *    business-initiated messages as pre-approved templates, and only to
 *    people who opted in — callers must pass that consent. Unconfigured →
 *    nothing is sent and the skip is logged.
 */

const GRAPH = 'https://graph.facebook.com/v21.0'

/** Digits-only international number for Jamaica (+1 876 / 658), or null if it can't be read. */
export function toJamaicaE164(input: string | null | undefined): string | null {
  const d = (input ?? '').replace(/\D/g, '')
  if (d.length === 7) return `1876${d}`
  if (d.length === 10 && /^(876|658)/.test(d)) return `1${d}`
  if (d.length === 11 && /^1(876|658)/.test(d)) return d
  return null
}

export function whatsappChatUrl(text?: string): string | null {
  const n = toJamaicaE164(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER) ?? (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '').replace(/\D/g, '')
  if (!n || n.length < 10) return null
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

export function whatsappApiConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
}

export interface TemplateMessage {
  to: string
  /** Approved template name, e.g. from WHATSAPP_TEMPLATE_BOOKING. */
  template: string | undefined
  language?: string
  bodyParams: string[]
  /** The recipient agreed to WhatsApp messages from us. Required — no consent, no message. */
  consent: boolean
}

/** Build the Cloud API request body for a template message (exported for tests). */
export function templateBody(to: string, template: string, language: string, params: string[]) {
  return {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: { name: template, language: { code: language }, components: params.length ? [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }] : [] },
  }
}

export async function sendWhatsAppTemplate(m: TemplateMessage): Promise<{ sent: boolean; reason?: string }> {
  if (!m.consent) return { sent: false, reason: 'no consent' }
  if (!whatsappApiConfigured() || !m.template) {
    console.info('[whatsapp] skipped template message (not configured)')
    return { sent: false, reason: 'not configured' }
  }
  const to = toJamaicaE164(m.to)
  if (!to) return { sent: false, reason: 'unreadable number' }
  try {
    const res = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(templateBody(to, m.template, m.language ?? 'en', m.bodyParams)),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      console.error('[whatsapp] send failed:', res.status, (await res.text()).slice(0, 300))
      return { sent: false, reason: `api ${res.status}` }
    }
    return { sent: true }
  } catch (e) {
    console.error('[whatsapp] send failed:', (e as Error).message)
    return { sent: false, reason: 'network' }
  }
}
