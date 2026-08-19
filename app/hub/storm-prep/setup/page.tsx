'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardCheck } from 'lucide-react'
import Topbar from '../../_components/Topbar'
import { wizardCard } from '../../energy-checkup/_components/shared'
import { Button, Radio } from '@/components/shop/ui'
import { Field, inputStyle } from '@/components/shop/ui'
import { loadProfile, saveProfile, type PropertyType, type StormProfile } from '../_lib/profile'

export default function StormProfileSetupPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<StormProfile>({ propertyType: null, householdSize: null, hasBackupPower: null, completedAt: null })

  useEffect(() => {
    setProfile(loadProfile())
  }, [])

  function finish() {
    saveProfile({ ...profile, completedAt: new Date().toISOString() })
    router.push('/hub/storm-prep')
  }

  const canFinish = profile.propertyType !== null

  return (
    <>
      <Topbar title="Storm prep" subtitle="Storm profile" />
      <div className="ke-screen" style={{ padding: 32 }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={wizardCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <ClipboardCheck size={16} color="var(--ke-green-600)" />
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, margin: 0 }}>A few quick questions</h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '6px 0 24px', maxWidth: 520 }}>
              Takes under a minute. This just tailors which parts of Storm prep get emphasized for you — it stays in
              this browser, not sent anywhere or stored against your account.
            </p>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Is this for a home or a business?</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Radio name="propertyType" label="Home / household" checked={profile.propertyType === 'home'} onChange={() => setProfile((p) => ({ ...p, propertyType: 'home' as PropertyType }))} />
                <Radio name="propertyType" label="Business" checked={profile.propertyType === 'business'} onChange={() => setProfile((p) => ({ ...p, propertyType: 'business' as PropertyType }))} />
              </div>
            </div>

            <div style={{ marginBottom: 24, maxWidth: 260 }}>
              <Field label="Household / staff size (optional)">
                <input
                  type="number"
                  min={1}
                  value={profile.householdSize ?? ''}
                  onChange={(e) => setProfile((p) => ({ ...p, householdSize: e.target.value ? Number(e.target.value) : null }))}
                  style={inputStyle}
                />
              </Field>
            </div>

            <div style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Do you already have backup power (power bank, station, generator)?</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Radio name="hasBackupPower" label="Yes" checked={profile.hasBackupPower === true} onChange={() => setProfile((p) => ({ ...p, hasBackupPower: true }))} />
                <Radio name="hasBackupPower" label="No" checked={profile.hasBackupPower === false} onChange={() => setProfile((p) => ({ ...p, hasBackupPower: false }))} />
              </div>
            </div>

            <Button onClick={finish} disabled={!canFinish}>Save and go to dashboard</Button>
          </div>
        </div>
      </div>
    </>
  )
}
