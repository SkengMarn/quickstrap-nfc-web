import { useState } from 'react'
import { supabase } from '../../services/supabase'
import { User, LogOut, Settings, Bell, Search } from 'lucide-react'

interface HeaderProps {
  user: any
}

const Header = ({ user }: HeaderProps) => {
  const [showDropdown, setShowDropdown] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <header className="layout-header">
      <div className="flex items-center flex-1">
        {/* Search */}
        <div className="max-w-lg w-full">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="form-input pl-10 pr-4 py-2 w-full text-sm"
              placeholder="Search events, wristbands, or check-ins..."
            />
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        {/* Notifications */}
        <button className="btn-ghost btn-sm p-2">
          <Bell className="h-4 w-4" />
        </button>
        
        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center space-x-2 p-2 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-medium hidden sm:block">
              {user?.email?.split('@')[0] || 'User'}
            </span>
          </button>
          
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="py-1">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <a
                  href="/settings"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </a>
                <button
                  onClick={handleSignOut}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
