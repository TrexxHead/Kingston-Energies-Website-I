'use client'

import { useState } from 'react'
import { keFontVariables } from '../../_design-system/fonts'
import Sidebar from './_components/Sidebar'
import Header from './_components/Header'
import ExecutiveSection from './_components/sections/ExecutiveSection'
import OrdersSection from './_components/sections/OrdersSection'
import InventorySection from './_components/sections/InventorySection'
import CustomersSection from './_components/sections/CustomersSection'
import MarketingSection from './_components/sections/MarketingSection'
import FinanceSection from './_components/sections/FinanceSection'
import AnalyticsSection from './_components/sections/AnalyticsSection'
import PlaybookSection from './_components/sections/PlaybookSection'
import {
  initialBanners,
  initialPromos,
  type SectionId,
} from './_components/mockData'
import '../../_design-system/tokens.css'

export default function AdminDashboard() {
  const [section, setSection] = useState<SectionId>('exec')
  const [banners, setBanners] = useState(initialBanners)
  const [flashOn, setFlashOn] = useState(true)
  const [promos, setPromos] = useState(initialPromos)
  const [newPromoCode, setNewPromoCode] = useState('')

  const toggleBanner = (index: number) => {
    setBanners((prev) => prev.map((b, i) => (i === index ? { ...b, active: !b.active } : b)))
  }

  const togglePromo = (index: number) => {
    setPromos((prev) => prev.map((p, i) => (i === index ? { ...p, active: !p.active } : p)))
  }

  const createPromo = () => {
    const code = newPromoCode.trim()
    if (!code) return
    setPromos((prev) => [...prev, { code, value: '10% off', active: true }])
    setNewPromoCode('')
  }

  const renderSection = () => {
    switch (section) {
      case 'exec':
        return <ExecutiveSection />
      case 'orders':
        return <OrdersSection />
      case 'inventory':
        return <InventorySection />
      case 'customers':
        return <CustomersSection />
      case 'marketing2':
        return (
          <MarketingSection
            banners={banners}
            onToggleBanner={toggleBanner}
            flashOn={flashOn}
            onToggleFlash={() => setFlashOn((v) => !v)}
            promos={promos}
            onTogglePromo={togglePromo}
            newPromoCode={newPromoCode}
            onChangeNewPromoCode={setNewPromoCode}
            onCreatePromo={createPromo}
          />
        )
      case 'finance':
        return <FinanceSection />
      case 'analytics':
        return <AnalyticsSection />
      case 'playbook':
        return <PlaybookSection />
      default:
        return null
    }
  }

  return (
    <div
      className={`${keFontVariables} ke-root`}
      style={{
        fontFamily: 'var(--font-body)',
        color: 'var(--color-text)',
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--color-bg-subtle)',
      }}
    >
      <Sidebar section={section} onSelect={setSection} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header section={section} onNavigate={setSection} />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div key={section} className="ke-screen" style={{ padding: 28 }}>
            {renderSection()}
          </div>
        </div>
      </div>
    </div>
  )
}
