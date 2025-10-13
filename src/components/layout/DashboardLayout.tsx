import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

type DashboardLayoutProps = {
  user: any
}

const DashboardLayout = ({ user }: DashboardLayoutProps) => {
  return (
    <div className="layout-container">
      <Sidebar />
      <div className="layout-main">
        <Header user={user} />
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
