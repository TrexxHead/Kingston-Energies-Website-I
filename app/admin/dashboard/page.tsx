'use client'

import { useEffect, useState } from 'react'
import { keFontVariables } from '../../_design-system/fonts'
import Sidebar from './_components/Sidebar'
import Header from './_components/Header'
import SettingsSection from './_components/sections/SettingsSection'
import ExecutiveSection from './_components/sections/ExecutiveSection'
import OrdersSection from './_components/sections/OrdersSection'
import InventorySection from './_components/sections/InventorySection'
import CustomersSection from './_components/sections/CustomersSection'
import MarketingSection from './_components/sections/MarketingSection'
import FinanceSection from './_components/sections/FinanceSection'
import AnalyticsSection from './_components/sections/AnalyticsSection'
import PlaybookSection from './_components/sections/PlaybookSection'
import { type SectionId } from './_components/mockData'
import '../../_design-system/tokens.css'

export default function AdminDashboard() {
  const [section, setSection] = useState<SectionId>('exec')

  // Heartbeat so the Settings tab can show which admins are currently active.
  useEffect(() => {
    const ping = () => { void fetch('/api/admin/heartbeat', { method: 'POST' }) }
    ping()
    const id = setInterval(ping, 60_000)
    return () => clearInterval(id)
  }, [])
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
        return <MarketingSection />
      case 'finance':
        return <FinanceSection />
      case 'analytics':
        return <AnalyticsSection />
      case 'playbook':
        return <PlaybookSection />
      case 'settings':
        return <SettingsSection onNavigate={setSection} />
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
