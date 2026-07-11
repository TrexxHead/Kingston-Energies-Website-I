import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  if (!token || !email) {
    return NextResponse.redirect(`${siteUrl}/login?verify=invalid`)
  }

  const record = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier: email, token } },
  })

  if (!record || record.expires < new Date()) {
    if (record) {
      await prisma.verificationToken.delete({ where: { identifier_token: { identifier: email, token } } })
    }
    return NextResponse.redirect(`${siteUrl}/login?verify=expired`)
  }

  await prisma.user.update({ where: { email }, data: { emailVerified: new Date() } })
  await prisma.verificationToken.delete({ where: { identifier_token: { identifier: email, token } } })

  return NextResponse.redirect(`${siteUrl}/login?verify=success`)
}
