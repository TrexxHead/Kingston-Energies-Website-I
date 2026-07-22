import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { jordynSystem, fallbackAnswer } from '@/lib/camille'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import type { CustomerNeed } from '@/lib/crm'

// Haiku 4.5 — fast and cost-appropriate for a high-traffic public support widget.
// (Swap to claude-opus-4-8 here if you want maximum answer quality over cost.)
const JORDYN_MODEL = 'claude-haiku-4-5'

const MAX_MESSAGE_CHARS = 1500
const MAX_HISTORY = 12

// Per-IP throttle: 15 messages/minute is generous for a real user, cheap insurance against abuse.
const RATE_MAX = 15
const RATE_WINDOW_MS = 60_000

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(MAX_MESSAGE_CHARS),
      })
    )
    .min(1)
    .max(MAX_HISTORY),
})

export async function POST(request: Request) {
  const rl = rateLimit(`chat:${clientIp(request)}`, RATE_MAX, RATE_WINDOW_MS)
  if (!rl.ok) {
    return new Response(
      "You're sending messages a little fast — give me a few seconds and try again.",
      { status: 429, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid message.' }, { status: 400 })
  }

  const { messages } = parsed.data
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''

  const apiKey = process.env.ANTHROPIC_API_KEY

  // No key configured → serve the built-in navigation fallback (plain text stream).
  if (!apiKey) {
    return textStream(fallbackAnswer(lastUser))
  }

  // IDIC "Customize": if a signed-in customer has a stated need, tailor Jordyn's
  // recommendations to it. Best-effort — never block the chat on this lookup.
  let need: CustomerNeed | null = null
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { primaryNeed: true },
      })
      need = (user?.primaryNeed as CustomerNeed | null) ?? null
    }
  } catch {
    // ignore — fall back to the generic assistant
  }

  try {
    const client = new Anthropic({ apiKey })
    const stream = client.messages.stream({
      model: JORDYN_MODEL,
      max_tokens: 1024,
      system: jordynSystem(need),
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          stream.on('text', (delta) => controller.enqueue(encoder.encode(delta)))
          await stream.finalMessage()
          controller.close()
        } catch (err) {
          console.error('[jordyn] stream error', err)
          // Surface a graceful message rather than a broken stream.
          controller.enqueue(encoder.encode(fallbackAnswer(lastUser)))
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    console.error('[jordyn] setup error', err)
    return textStream(fallbackAnswer(lastUser))
  }
}

function textStream(text: string): Response {
  const encoder = new TextEncoder()
  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text))
      controller.close()
    },
  })
  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
