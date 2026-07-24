import Topbar from '../_components/Topbar'
import { hubScreen } from '../_components/ui'
import NotificationsClient from './NotificationsClient'

export const dynamic = 'force-dynamic'

export default function HubNotificationsPage() {
  return (
    <>
      <Topbar title="Notifications" subtitle="Order updates, shipping, restocks, discounts and announcements" />
      <div className="ke-screen" style={hubScreen}>
        <NotificationsClient />
      </div>
    </>
  )
}
