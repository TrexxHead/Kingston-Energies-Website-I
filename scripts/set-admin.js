/**
 * Set (or reset) an admin login, unambiguously.
 *
 * Usage (from the project root, with your production DB env exported):
 *   export DATABASE_URL="postgresql://...:6543/postgres?pgbouncer=true&connection_limit=1"
 *   export DIRECT_URL="postgresql://...:5432/postgres"
 *   export ADMIN_EMAIL='kingstonenergygroup@outlook.com'
 *   export ADMIN_PASSWORD='your-password'   # use SINGLE quotes — protects ! characters
 *   node scripts/set-admin.js
 *
 * It upserts the user as an ADMIN with a verified email, then re-reads the row
 * and bcrypt-compares to prove the stored password matches what you typed.
 */
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim()
  const password = process.env.ADMIN_PASSWORD || ''

  if (!email || !password) {
    console.error('✗ Set both ADMIN_EMAIL and ADMIN_PASSWORD before running.')
    process.exit(1)
  }

  console.log(`→ Target email : ${email}`)
  console.log(`→ Password read: ${password.length} characters`)

  const hash = await bcrypt.hash(password, 10)
  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hash, role: 'ADMIN', emailVerified: new Date() },
    create: { email, name: 'Admin', password: hash, role: 'ADMIN', emailVerified: new Date() },
  })

  // Round-trip proof: re-read and compare.
  const fresh = await prisma.user.findUnique({ where: { id: user.id } })
  const ok = await bcrypt.compare(password, fresh.password)

  console.log(`✔ ${email} is now role=${fresh.role}, emailVerified=${Boolean(fresh.emailVerified)}`)
  console.log(`✔ Stored-password check: ${ok ? 'PASS — you can log in with this password' : 'FAIL — something is off'}`)
}

main()
  .catch((e) => {
    console.error('✗ Error:', e.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
