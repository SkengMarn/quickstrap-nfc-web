import { Link, useLocation } from 'react-router-dom'
import {
  Home,
  Calendar,
  Users,
  CheckSquare,
  Settings,
  BarChart3,
  Shield,
  AlertTriangle,
  FileText,
  Zap,
  Building,
  Webhook,
  MapPin
} from 'lucide-react'

const Sidebar = () => {
  const location = useLocation()

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
    <div className="layout-sidebar">
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">NFC</span>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Portal</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        {navigationSections.map((section) => (
          <div key={section.title} className="nav-section">
            <div className="nav-section-title">{section.title}</div>
            {section.items.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <item.icon className="nav-item-icon" />
                  {item.name}
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
