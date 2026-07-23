'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useTheme } from '@/lib/theme-context'
import { db } from '@/lib/firebase'
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore'
import { Bell, Menu, Sun, Moon, LogOut, UserCog, ChevronDown } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { toast } from 'sonner'

interface HeaderProps {
  onMenuClick: () => void
  title?: string
}

export default function Header({ onMenuClick, title }: HeaderProps) {
  const { userProfile, logOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)
  const [profileOpen, setProfileOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!userProfile?.uid) return
    const q = query(
      collection(db, 'notifications', userProfile.uid, 'items'),
      where('read', '==', false),
      limit(50)
    )
    const unsub = onSnapshot(q, (snap) => setUnreadCount(snap.size))
    return unsub
  }, [userProfile?.uid])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    if (profileOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [profileOpen])

  const handleLogout = async () => {
    setProfileOpen(false)
    await logOut()
    toast.success('Signed out successfully')
    router.replace('/login')
  }

  const getEditProfileHref = () => {
    if (!userProfile) return '#'
    return `/dashboard/${userProfile.role}/profile`
  }

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-6 py-3.5 border-b border-border bg-card/95 backdrop-blur-md">
      {/* Mobile menu button */}
      <button
        id="mobile-menu-btn"
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Title */}
      {title && (
        <h1 className="text-base font-semibold text-foreground hidden md:block">{title}</h1>
      )}

      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-1.5">

        {/* Dark / Light Toggle */}
        <button
          id="theme-toggle-btn"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4.5 h-4.5 w-[18px] h-[18px]" />
          ) : (
            <Moon className="w-[18px] h-[18px]" />
          )}
        </button>

        {/* Notifications */}
        <Link
          href="/dashboard/notifications"
          id="notifications-btn"
          className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <Bell className="w-[18px] h-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] rounded-full bg-brand-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="profile-avatar-btn"
            onClick={() => setProfileOpen(prev => !prev)}
            className="flex items-center gap-1.5 rounded-xl px-1 py-1 hover:bg-secondary transition-all duration-200 group"
            aria-label="Profile menu"
          >
            <div className="avatar w-8 h-8 text-xs ring-2 ring-brand-500/20 group-hover:ring-brand-500/50 transition-all">
              {userProfile?.photoURL
                ? <img src={userProfile.photoURL} className="w-8 h-8 rounded-full object-cover" alt="" />
                : <span>{getInitials(userProfile?.name || 'U')}</span>
              }
            </div>
            <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown menu */}
          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card shadow-2xl shadow-black/20 animate-fade-in overflow-hidden z-50">
              {/* User info header */}
              <div className="px-4 py-3 border-b border-border bg-secondary/40">
                <p className="text-sm font-semibold text-foreground truncate">{userProfile?.name}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{userProfile?.email}</p>
              </div>

              {/* Actions */}
              <div className="p-1.5 space-y-0.5">
                <Link
                  href={getEditProfileHref()}
                  id="edit-profile-btn"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  <UserCog className="w-4 h-4 text-muted-foreground" />
                  <span>Edit Profile</span>
                </Link>

                <button
                  id="signout-btn"
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
