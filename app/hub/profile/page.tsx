import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'
import Topbar from '../_components/Topbar'
import ProfileForm from './_components/ProfileForm'
import SignOutButton from './_components/SignOutButton'

const cardStyle = {
  background: '#fff',
  border: '1px solid var(--color-border)',
  borderRadius: 16,
  padding: 24,
  marginBottom: 16,
}

const h3Style = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: 15,
  margin: '0 0 14px',
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) {
    redirect('/login')
  }

  return (
    <>
      <Topbar title="Profile" subtitle="Personal info, addresses and preferences" />
      <div className="ke-screen" style={{ padding: 32 }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ ...h3Style, margin: 0 }}>Personal info</h3>
            <SignOutButton />
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginTop: -8, marginBottom: 18 }}>
            {user.role === 'ADMIN' ? 'Administrator' : 'Customer'} · Member since{' '}
            {new Date(user.createdAt).getFullYear()}
          </p>
          <ProfileForm initialName={user.name ?? ''} initialUsername={user.username ?? ''} initialEmail={user.email} initialNeed={user.primaryNeed} />
        </div>

        <div style={cardStyle}>
          <h3 style={h3Style}>Delivery addresses</h3>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
            No saved addresses yet. Add one at checkout and it&apos;ll appear here for faster reordering.
          </p>
        </div>

        <div style={{ ...cardStyle, marginBottom: 0 }}>
          <h3 style={h3Style}>Payment methods</h3>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
            No saved payment methods yet. You choose how to pay at checkout — card, Google Pay, PayPal or cash on delivery.
          </p>
        </div>
      </div>
    </>
  )
}
