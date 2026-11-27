import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { logServerError } from '@/lib/clientLog'
import { BILL_READING_PROMPT, billReadingSchema, checkReading } from '@/lib/bills/billReading'

/**
 * POST /api/bills/read — read a JPS bill from a photo (JPEG/PNG/WebP) or a
 * PDF with Claude, returning each field with a confidence and the text it
 * read. The file is sent to Anthropic to be read and is not stored or logged
 * here. Rate-limited per visitor, with a daily cap to bound cost.
 */

export const maxDuration = 60

const MODEL = 'claude-opus-5-5'
const MAX_BASE64 = 4_300_000 // ≈ 3 MB file; Vercel caps request bodies at 4.5 MB
const DAILY_CAP = Number(process.env.BILL_READ_DAILY_CAP) || 300

const body = z.object({
  mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  data: z.string().min(100).max(MAX_BASE64).regex(/^[A-Za-z0-9+/=]+$/),
})

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Reading bills from a photo isn’t switched on yet — type the numbers in instead.' }, { status: 503 })
  const ip = await rateLimit(`bill-read:${clientIp(request)}`, 6, 10 * 60_000)
  if (!ip.ok) return NextResponse.json({ error: 'You’ve read several bills in a row — please wait a few minutes.' }, { status: 429 })
  const day = await rateLimit('bill-read:global', DAILY_CAP, 86_400_000)
  if (!day.ok) return NextResponse.json({ error: 'Bill reading is busy today — type the numbers in instead, or try tomorrow.' }, { status: 429 })

  const parsed = body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Send a photo (JPEG, PNG or WebP) or a PDF under 3 MB.' }, { status: 400 })
  const { mediaType, data } = parsed.data

  const file =
    mediaType === 'application/pdf'
      ? ({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } } as const)
      : ({ type: 'image', source: { type: 'base64', media_type: mediaType, data } } as const)

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      // On a policy decline, re-run once on the fallback model inside the same call.
      betas: ['server-side-fallback-2026-06-01'],
      fallbacks: [{ model: 'claude-opus-4-8' }],
      output_config: { effort: 'medium', format: betaZodOutputFormat(billReadingSchema) },
      messages: [{ role: 'user', content: [file, { type: 'text', text: BILL_READING_PROMPT }] }],
    })
    if (response.stop_reason === 'refusal') return NextResponse.json({ error: 'That file couldn’t be read. Try a clearer photo of the bill, or type the numbers in.' }, { status: 422 })
    if (response.stop_reason === 'max_tokens' || !response.parsed_output) return NextResponse.json({ error: 'The bill couldn’t be read clearly. Try a sharper, well-lit photo of the whole page.' }, { status: 422 })
    const reading = response.parsed_output
    if (!reading.isUtilityBill) return NextResponse.json({ error: 'That doesn’t look like an electricity bill.' }, { status: 422 })
    const { reading: checked, checks } = checkReading(reading)
    return NextResponse.json({ reading: checked, checks }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return NextResponse.json({ error: 'Bill reading is busy right now — try again in a minute.' }, { status: 429 })
    if (err instanceof Anthropic.BadRequestError) return NextResponse.json({ error: 'That file couldn’t be read — try a JPEG photo or the PDF from JPS.' }, { status: 422 })
    // Log the failure, never the bill.
    logServerError(err instanceof Anthropic.APIError ? new Error(`Anthropic ${err.status}`) : err, { path: '/api/bills/read' })
    return NextResponse.json({ error: 'Bill reading isn’t available right now — type the numbers in instead.' }, { status: 502 })
  }
}
