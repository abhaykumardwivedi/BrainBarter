import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  RiHome4Line, RiCompassLine, RiUploadCloud2Line,
  RiTrophyLine, RiFlashlightLine, RiMenuLine, RiCloseLine,
  RiMoonLine, RiSunLine, RiWalletLine, RiDashboardLine,
  RiLogoutBoxLine, RiUserLine, RiShieldLine,
} from 'react-icons/ri'
import { Avatar, TokenChip } from '../common'
import useAuthStore from '../../store/authStore'
import useThemeStore from '../../store/themeStore'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const navLinks = [
  { to: '/',            label: 'Home',      icon: RiHome4Line },
  { to: '/browse',      label: 'Browse',    icon: RiCompassLine },
  { to: '/exam-mode',   label: 'Exam Mode', icon: RiFlashlightLine },
  { to: '/leaderboard', label: 'Leaders',   icon: RiTrophyLine },
]

export default function Navbar() {
  const { user, profile, logout } = useAuthStore()
  const { dark, toggle } = useThemeStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (to) => location.pathname === to

  const handleLogout = async () => {
    await supabase.auth.signOut()
    logout()
    setUserMenuOpen(false)
    setMobileOpen(false)
    toast.success('Logged out successfully')
    navigate('/')
  }

  return (
    <nav className="sticky top-0 z-40 bg-white/80 dark:bg-[#0f0a1e]/80 backdrop-blur-md border-b border-gray-200/60 dark:border-gray-800/60">
      <div className="container-app">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src="/logo-mark.svg" alt="BrainBarter"
              className="w-9 h-9 drop-shadow-[0_0_10px_rgba(157,78,221,0.5)] group-hover:drop-shadow-[0_0_16px_rgba(157,78,221,0.7)] transition-all" />
            <span className="font-display font-bold text-lg text-gray-900 dark:text-white">
              Brain<span className="text-brand-500">Barter</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to} to={to}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200
                  ${isActive(to)
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
                  }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="btn-ghost btn-icon hidden sm:flex">
              {dark ? <RiSunLine size={18} /> : <RiMoonLine size={18} />}
            </button>

            {user ? (
              <>
                <TokenChip amount={profile?.token_balance ?? 0} className="hidden sm:inline-flex" />
                <Link to="/wallet" className="btn-ghost btn-icon hidden sm:flex" title="Wallet">
                  <RiWalletLine size={18} />
                </Link>
                <Link to="/upload" className="btn-primary btn-sm hidden md:inline-flex">
                  <RiUploadCloud2Line size={14} />
                  Upload
                </Link>

                {/* User menu */}
                <div className="relative">
                  <button onClick={() => setUserMenuOpen(o => !o)}>
                    <Avatar name={profile?.username} src={profile?.avatar_url} size="sm" />
                  </button>
                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 top-12 z-20 w-48 card p-2 animate-slide-down shadow-neu-lg dark:shadow-neu-dark">
                        <div className="px-3 py-2 mb-1 border-b border-gray-100 dark:border-gray-800">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{profile?.username}</p>
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>
                        <Link to="/profile" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-brand-50 dark:hover:bg-brand-950 transition-colors">
                          <RiUserLine size={15} /> Profile
                        </Link>
                        <Link to="/dashboard" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-brand-50 dark:hover:bg-brand-950 transition-colors">
                          <RiDashboardLine size={15} /> Dashboard
                        </Link>
                        <Link to="/wallet" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-brand-50 dark:hover:bg-brand-950 transition-colors">
                          <RiWalletLine size={15} /> Wallet
                        </Link>
                        {profile?.role === 'admin' && (
                          <Link to="/admin" onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950 transition-colors">
                            <RiShieldLine size={15} /> Admin Panel
                          </Link>
                        )}
                        <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-1">
                          <button onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                            <RiLogoutBoxLine size={15} /> Logout
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-secondary btn-sm">Login</Link>
                <Link to="/register" className="btn-primary btn-sm">Sign Up</Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button className="btn-ghost btn-icon md:hidden" onClick={() => setMobileOpen(o => !o)}>
              {mobileOpen ? <RiCloseLine size={20} /> : <RiMenuLine size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f0a1e] animate-slide-down">
          <div className="container-app py-3 space-y-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${isActive(to) ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300' : 'text-gray-600 dark:text-gray-400'}`}>
                <Icon size={16} /> {label}
              </Link>
            ))}
            {user && (
              <>
                <Link to="/upload" onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-brand-600 dark:text-brand-400">
                  <RiUploadCloud2Line size={16} /> Upload Content
                </Link>
                <Link to="/dashboard" onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400">
                  <RiDashboardLine size={16} /> Dashboard
                </Link>
                <Link to="/wallet" onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400">
                  <RiWalletLine size={16} /> Wallet
                </Link>
                {profile?.role === 'admin' && (
                  <Link to="/admin" onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-brand-600 dark:text-brand-400">
                    <RiShieldLine size={16} /> Admin Panel
                  </Link>
                )}
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500">
                  <RiLogoutBoxLine size={16} /> Logout
                </button>
              </>
            )}
            <div className="flex items-center justify-between px-3 py-2">
              {user && <TokenChip amount={profile?.token_balance ?? 0} />}
              <button onClick={toggle} className="btn-ghost btn-sm flex items-center gap-1.5">
                {dark ? <RiSunLine size={14} /> : <RiMoonLine size={14} />}
                {dark ? 'Light' : 'Dark'} mode
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
