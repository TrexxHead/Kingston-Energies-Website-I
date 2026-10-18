'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { EMPTY_PROFILE, isEmptyProfile, type EnergyProfile } from './profileSchema'
import { loadLocalProfile, saveLocalProfile, clearLocalProfile } from './localProfile'

export type ProfileSync = 'local' | 'loading' | 'saving' | 'saved' | 'error'

/**
 * The shared energy profile (devices, properties, vehicles) for any page.
 * Anonymous visitors: this browser. Signed in: anything in the browser is
 * merged into the account once (never duplicated), then the account copy is
 * used and saved back (debounced).
 */
export function useEnergyProfile() {
  const { status } = useSession()
  const signedIn = status === 'authenticated'
  const [profile, setProfile] = useState<EnergyProfile>(EMPTY_PROFILE)
  const [ready, setReady] = useState(false)
  const [sync, setSync] = useState<ProfileSync>('local')
  const [notice, setNotice] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    let cancelled = false
    async function load() {
      const local = loadLocalProfile()
      if (status !== 'authenticated') {
        setProfile(local)
        setSync('local')
        setReady(true)
        return
      }
      setSync('loading')
      try {
        const hasLocal = !isEmptyProfile(local)
        const res = hasLocal
          ? await fetch('/api/energy/profile/merge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ local }) })
          : await fetch('/api/energy/profile', { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        if (cancelled) return
        if (hasLocal) {
          clearLocalProfile()
          const a = data.added ?? {}
          const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
          const details = [a.devices ? `${plural(a.devices, 'device')} added` : null, a.vehicles ? `${plural(a.vehicles, 'vehicle')} added` : null, data.skippedDuplicates ? `${plural(data.skippedDuplicates, 'duplicate')} skipped` : null].filter(Boolean)
          setNotice(`Saved this browser’s profile to your account${details.length ? ` (${details.join(', ')})` : ''}.`)
        }
        setProfile({ ...data.profile, vehicles: data.profile.vehicles ?? [] })
        setSync('saved')
      } catch {
        if (cancelled) return
        setProfile(local)
        setSync('error')
        setNotice('Could not reach your account — changes are kept in this browser for now.')
      }
      setReady(true)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [status])

  const persist = useCallback(
    (next: EnergyProfile) => {
      setProfile(next)
      if (!signedIn) {
        saveLocalProfile(next)
        return
      }
      setSync('saving')
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        try {
          const res = await fetch('/api/energy/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
          setSync(res.ok ? 'saved' : 'error')
        } catch {
          setSync('error')
        }
      }, 700)
    },
    [signedIn],
  )

  // setProfile: update what's shown without saving (e.g. after a server-side delete).
  return { profile, setProfile, persist, ready, sync, signedIn, notice, setNotice }
}

/** Read-only: the profile as stored, for tools that only need to read (no merge, no saving). */
export function useProfileSnapshot(): { profile: EnergyProfile | null; signedIn: boolean } {
  const { status } = useSession()
  const [profile, setProfile] = useState<EnergyProfile | null>(null)
  useEffect(() => {
    if (status === 'loading') return
    let cancelled = false
    ;(async () => {
      const local = loadLocalProfile()
      if (status !== 'authenticated') return setProfile(local)
      try {
        const res = await fetch('/api/energy/profile', { cache: 'no-store' })
        const data = await res.json()
        if (!cancelled) setProfile(res.ok ? { ...data.profile, vehicles: [...(data.profile.vehicles ?? []), ...(isEmptyProfile(local) ? [] : (local.vehicles ?? []).filter((v) => !(data.profile.vehicles ?? []).some((x: { clientId: string }) => x.clientId === v.clientId)))] } : local)
      } catch {
        if (!cancelled) setProfile(local)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [status])
  return { profile, signedIn: status === 'authenticated' }
}
