import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { guardIntegration } from '@/lib/integrationAuth'
import { jordynSystem, fallbackAnswer } from '@/lib/camille'
import { rateLimit } from '@/lib/rateLimit'

// Same model as the on-site widget — fast and cost-appropriate for chat volume.
const JORDYN_MODEL = 'claude-haiku-4-5'
const MAX_MESSAGE_CHARS = 1500
const MAX_HISTORY = 12

const bodySchema = z.object({
  message: z.string().min(1).max(MAX_MESSAGE_CHARS),
  channel: z.enum(['whatsapp', 'instagram']).optional(),
  // Stable id for the person (WA number / IG id) — used only to rate-limit and
  // to keep per-conversation throttling separate.
  from: z.string().max(120).optional(),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(MAX_MESSAGE_CHARS) }))
    .max(MAX_HISTORY)
    .optional(),
})

/**
 * Jordyn, over the wire, for n8n. Unlike the on-site widget this returns a single
 * JSON `{ reply }` (no streaming) so an n8n HTTP node can forward it straight
 * back to WhatsApp / Instagram.
 */
export async function POST(request: Request) {
  const denied = guardIntegration(request)
  if (denied) return denied

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid message.' }, { status: 400 })
  }
  const { message, from, history } = parsed.data

  // Throttle per sender (fall back to a shared bucket if no id supplied).
  const rl = rateLimit(`integration-chat:${from ?? 'shared'}`, 20, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { reply: "You're sending messages a little fast — give me a moment and try again." },
      { status: 200 },
    )
  }

  const messages = [...(history ?? []), { role: 'user' as const, content: message }]
  const apiKey = process.env.ANTHROPIC_API_KEY

  // No AI key → deterministic navigation fallback so the bot still responds.
  if (!apiKey) {
    return NextResponse.json({ reply: fallbackAnswer(message), source: 'fallback' })
  }

  try {
    const client = new Anthropic({ apiKey })
    const res = await client.messages.create({
      model: JORDYN_MODEL,
      max_tokens: 1024,
      system: jordynSystem(null),
      messages,
    })
    const reply = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()
    return NextResponse.json({ reply: reply || fallbackAnswer(message), source: 'jordyn' })
  } catch (err) {
    console.error('[integration-chat] error', err)
    return NextResponse.json({ reply: fallbackAnswer(message), source: 'fallback' })
  }
}
