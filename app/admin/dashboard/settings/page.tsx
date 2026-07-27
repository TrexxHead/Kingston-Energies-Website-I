'use client'

import { useRouter } from 'next/navigation'
import SettingsSection from '../_components/sections/SettingsSection'
import { hrefForSection } from '../_components/sectionHref'

export default function Page() {
  const router = useRouter()
  return <SettingsSection onNavigate={(section) => router.push(hrefForSection(section))} />
}
