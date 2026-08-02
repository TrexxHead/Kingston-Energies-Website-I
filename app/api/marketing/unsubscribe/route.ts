import { NextResponse } from 'next/server'
import { verifyUnsubscribeToken } from '@/lib/unsubscribeToken'
import { suppress } from '@/lib/suppression'

function page(message: string): NextResponse {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Kingston Energies</title></head>
    <body style="font-family:Arial,Helvetica,sans-serif;background:#0d1714;color:#eaf2ec;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center">
      <div>
        <div style="font-weight:800;font-size:18px;margin-bottom:12px">Kingston Energies</div>
        <p style="color:rgba(234,242,236,.8);max-width:360px;line-height:1.5">${message}</p>
      </div>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

/** One-click unsubscribe link target from every campaign email. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  const token = searchParams.get('t')

  if (!email || !verifyUnsubscribeToken(email, token)) {
    return page("That unsubscribe link isn't valid. If you'd like to stop receiving emails, contact us and we'll take care of it.")
  }

  await suppress(email, 'UNSUBSCRIBED')
  return page(`${email} has been unsubscribed from Kingston Energies marketing emails. You'll still receive order and account emails.`)
}
