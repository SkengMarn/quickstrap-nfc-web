import { useState } from 'react'
import {
    AlertTriangle,
    BarChart3,
    Building,
    Calendar,
    CheckSquare,
    ChevronLeft,
    ChevronRight,
    FileText,
    Home,
    Settings,
    Shield,
    Users,
    Webhook,
    Zap
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

const Sidebar = () => {
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const navigationSections = [
    {
      title: 'Overview',
      items: [
        { name: 'Dashboard', href: '/', icon: Home },
      ]
    },
    {
      title: 'Event Management',
      items: [
        { name: 'Events', href: '/events', icon: Calendar },
        { name: 'Check-ins', href: '/checkins', icon: CheckSquare },
      ]
    },
    {
      title: 'Operations',
      items: [
        { name: 'Access Control', href: '/access', icon: Users },
        { name: 'Analytics', href: '/analytics', icon: BarChart3 },
        { name: 'Reports', href: '/reports', icon: FileText },
      ]
    },
    {
      title: 'Security & Monitoring',
      items: [
        { name: 'Fraud Detection', href: '/fraud', icon: Shield },
        { name: 'Emergency Center', href: '/emergency', icon: AlertTriangle },
        { name: 'Autonomous Ops', href: '/autonomous-operations', icon: Zap },
      ]
    },
    {
      title: 'Administration',
      items: [
        { name: 'Organization', href: '/organization', icon: Building },
        { name: 'Webhooks', href: '/webhooks', icon: Webhook },
        { name: 'Settings', href: '/settings', icon: Settings },
      ]
    }
  ]

  return (
    <div className={`layout-sidebar z-dropdown transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-gray-200 justify-between">
        <div className={`flex items-center space-x-2 ${isCollapsed ? 'hidden' : ''}`}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">NFC</span>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Portal</h1>
        </div>
        {isCollapsed && (
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-sm">NFC</span>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`p-1.5 hover:bg-gray-100 rounded-lg transition-colors ${isCollapsed ? 'absolute right-2' : ''}`}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navigationSections.map((section) => (
          <div key={section.title} className="nav-section">
            {!isCollapsed && <div className="nav-section-title">{section.title}</div>}
            {section.items.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`nav-item touch-safe ${isActive ? 'active' : ''} ${isCollapsed ? 'justify-center px-2' : ''}`}
                  title={isCollapsed ? item.name : ''}
                >
                  <item.icon className="nav-item-icon" />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
    </div>
  )
}

export default Sidebar
