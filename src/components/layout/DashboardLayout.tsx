import { Outlet } from 'react-router-dom'
import { LayoutSafetyProvider } from '../ui/LayoutSafety'
import Header from './Header'
import Sidebar from './Sidebar'

type DashboardLayoutProps = {
  user: any
}

const DashboardLayout = ({ user }: DashboardLayoutProps) => {
  return (
    <LayoutSafetyProvider enableMonitoring={true} enableAutoFix={true}>
      <div className="layout-container">
        <Sidebar />
        <div className="layout-main">
          <Header user={user} />
          <main className="layout-content content-safe">
            <Outlet />
          </main>
        </div>
      </div>
    </LayoutSafetyProvider>
  )
}

export default DashboardLayout
