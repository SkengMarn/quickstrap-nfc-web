import { Bell, LogOut, Search, Settings, User, Maximize, Minimize } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../../services/supabase'

interface HeaderProps {
  user: any
}

const Header = ({ user }: HeaderProps) => {
  const [showDropdown, setShowDropdown] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const location = useLocation()

  // Hide search bar on event creation page
  const isEventCreationPage = location.pathname === '/events/new'
  const shouldShowSearch = !isEventCreationPage

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  // Fullscreen toggle function
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen()
        setIsFullscreen(true)
      } catch (err) {
        console.error('Error attempting to enable fullscreen:', err)
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    }
  }

  // Listen for fullscreen changes and ESC key
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && document.fullscreenElement) {
        // ESC will automatically exit fullscreen, we just update state
        setIsFullscreen(false)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('keydown', handleEscKey)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('keydown', handleEscKey)
    }
  }, [])

  return (
    <header className="layout-header z-dropdown">
      <div className="flex items-center flex-1">
        {/* Search - Hidden on event creation page */}
        {shouldShowSearch && (
          <div className="max-w-lg w-full">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                className="form-input pl-10 pr-4 py-2 w-full text-sm touch-safe"
                placeholder="Search events, wristbands, or check-ins..."
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-3">
        {/* Notifications */}
        <button className="btn-ghost btn-sm p-2 touch-safe">
          <Bell className="h-4 w-4" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="btn-ghost btn-sm p-2 touch-safe"
          title={isFullscreen ? 'Exit Fullscreen (ESC)' : 'Enter Fullscreen'}
        >
          {isFullscreen ? (
            <Minimize className="h-4 w-4" />
          ) : (
            <Maximize className="h-4 w-4" />
          )}
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center space-x-2 p-2 text-gray-700 rounded-lg hover:bg-gray-50 touch-safe"
          >
            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-medium hidden sm:block">
              {user?.email?.split('@')[0] || 'User'}
            </span>
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-dropdown">
              <div className="py-1">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <a
                  href="/settings"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 touch-safe"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </a>
                <button
                  onClick={handleSignOut}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 touch-safe"
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
