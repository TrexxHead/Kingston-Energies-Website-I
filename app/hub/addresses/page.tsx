import Topbar from '../_components/Topbar'
import { hubScreen } from '../_components/ui'
import AddressesClient from './AddressesClient'

export const dynamic = 'force-dynamic'

export default function HubAddressesPage() {
  return (
    <>
      <Topbar title="Saved addresses" subtitle="Manage your delivery addresses for faster checkout" />
      <div className="ke-screen" style={hubScreen}>
        <AddressesClient />
      </div>
    </>
  )
}
