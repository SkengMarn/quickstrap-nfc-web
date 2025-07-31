import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  QrCode,
  ClipboardList,
  Users,
  Settings,
} from 'lucide-react'
const Sidebar = () => {
  const navItems = [
    {
      to: '/',
      label: 'Dashboard',
      icon: <LayoutDashboard size={20} />,
    },
    {
      to: '/events',
      label: 'Events',
      icon: <CalendarDays size={20} />,
    },
    {
      to: '/wristbands',
      label: 'Wristbands',
      icon: <QrCode size={20} />,
    },
    {
      to: '/checkins',
      label: 'Check-ins',
      icon: <ClipboardList size={20} />,
    },
    {
      to: '/access',
      label: 'User Access',
      icon: <Users size={20} />,
    },
  ]
  return (
    <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r border-gray-200">
      <div className="flex items-center justify-center h-16 border-b border-gray-200">
        <h1 className="text-xl font-bold text-blue-600">Event Admin</h1>
      </div>
      <div className="flex flex-col flex-1 overflow-y-auto">
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`
              }
            >
              <span className="mr-3">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="p-4 border-t border-gray-200">
        <NavLink
          to="/settings"
          className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Settings size={20} className="mr-3" />
          Settings
        </NavLink>
      </div>
    </aside>
  )
}
export default Sidebar
