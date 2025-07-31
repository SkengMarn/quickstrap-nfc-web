import { useState } from 'react'
import { Menu, User, LogOut, ChevronDown } from 'lucide-react'
import { supabase } from '../../services/supabase'
import { useNavigate } from 'react-router-dom'
import NotificationCenter from '../NotificationCenter'
type HeaderProps = {
  user: any
}
const Header = ({ user }: HeaderProps) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        <div className="flex items-center md:hidden">
          <button
            type="button"
            className="text-gray-500 hover:text-gray-600"
            aria-label="Open sidebar"
          >
            <Menu size={24} />
          </button>
        </div>
        <div className="flex-1" />
        <div className="flex items-center space-x-4">
          <div className="relative">
            <NotificationCenter />
          </div>
          <div className="relative">
            <button
              type="button"
              className="flex items-center text-sm rounded-full focus:outline-none"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            >
              <div className="flex items-center px-2 py-1 rounded-full hover:bg-gray-100">
                <div className="bg-blue-100 text-blue-800 flex items-center justify-center w-8 h-8 rounded-full">
                  <User size={16} />
                </div>
                <span className="ml-2 text-gray-700 hidden sm:block">
                  {user?.email}
                </span>
                <ChevronDown size={16} className="ml-1 text-gray-500" />
              </div>
            </button>
            {isProfileMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200"
                onBlur={() => setIsProfileMenuOpen(false)}
              >
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <LogOut size={16} className="mr-2" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
export default Header
