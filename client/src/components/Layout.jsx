import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  Home, 
  Heart,
  Menu, 
  X,
  Search,
  Cast,
  Settings,
  LogOut
} from 'lucide-react'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/favorites', icon: Heart, label: 'Favorites' },
  ]

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-[#101928]">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#101928]/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 h-16">
          {/* Left: Menu + Logo */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              <Menu size={22} />
            </button>
            <Link to="/" className="flex items-center">
              <span 
                className="text-5xl font-normal text-white hover:opacity-80 transition-opacity leading-none"
                style={{ fontFamily: 'Soundstage' }}
              >
                S
              </span>
            </Link>
          </div>

          {/* Center: Navigation Pills */}
          <nav className="hidden md:flex items-center gap-1 bg-[#1c2a3f] rounded-full p-1">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all
                  ${isActive(item.path) 
                    ? 'bg-[#2a3a52] text-white' 
                    : 'text-white/70 hover:text-white hover:bg-white/5'}
                `}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Right: Icons + Profile */}
          <div className="flex items-center gap-2">
            <button className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all hidden sm:block">
              <Cast size={20} />
            </button>
            <button 
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              <Search size={20} />
            </button>
            
            {/* Profile Avatar */}
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center ml-2 hover:ring-2 hover:ring-white/30 transition-all"
              >
                {user?.avatarPath ? (
                  <img 
                    src={user.avatarPath} 
                    alt={user.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-sm font-semibold">
                    {user?.displayName?.[0]?.toUpperCase()}
                  </span>
                )}
              </button>
              
              {/* Profile Dropdown */}
              {profileMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setProfileMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-12 w-48 bg-[#1c2a3f] rounded-xl shadow-xl border border-white/10 overflow-hidden z-50 animate-fade-in">
                    <div className="p-3 border-b border-white/10">
                      <p className="text-white font-medium text-sm">{user?.displayName}</p>
                      <p className="text-white/50 text-xs">{user?.isAdmin ? 'Administrator' : 'User'}</p>
                    </div>
                    <Link
                      to="/settings"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 transition-all"
                    >
                      <Settings size={16} />
                      <span className="text-sm">Settings</span>
                    </Link>
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false)
                        logout()
                      }}
                      className="flex items-center gap-3 px-4 py-3 w-full text-white/70 hover:text-white hover:bg-white/5 transition-all"
                    >
                      <LogOut size={16} />
                      <span className="text-sm">Switch Profile</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar (expandable) */}
        {searchOpen && (
          <div className="px-4 pb-4 animate-fade-in">
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
              <input
                type="text"
                placeholder="Search your library..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full pl-12 pr-4 py-3 bg-[#1c2a3f] rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#00a4dc]/50 transition-all"
              />
            </div>
          </div>
        )}
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 z-40 lg:hidden animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed top-0 left-0 bottom-0 w-72 bg-[#131f31] z-50 animate-slide-in-left">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <span 
                className="text-3xl font-normal text-white"
                style={{ fontFamily: 'Soundstage' }}
              >
                S
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="p-4 space-y-1">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                    ${isActive(item.path) 
                      ? 'bg-[#00a4dc] text-white' 
                      : 'text-white/70 hover:text-white hover:bg-white/5'}
                  `}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="pt-16 min-h-screen">
        <div className="p-6 lg:p-8 max-w-[1800px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
