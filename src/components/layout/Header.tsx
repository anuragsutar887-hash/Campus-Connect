'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { useTheme } from '@/lib/theme-context'
import { db } from '@/lib/firebase'
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore'
import { Bell, Menu, Sun, Moon } from 'lucide-react'
import { getInitials } from '@/lib/utils'

interface HeaderProps {
  onMenuClick: () => void
  title?: string
}

export default function Header({ onMenuClick, title }: HeaderProps) {
  const { userProfile } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [unreadCount, setUnreadCount] = useState(0)

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

        {/* Avatar */}
        <div className="avatar w-8 h-8 text-xs cursor-pointer ring-2 ring-brand-500/20 hover:ring-brand-500/50 transition-all">
          {userProfile?.photoURL
            ? <img src={userProfile.photoURL} className="w-8 h-8 rounded-full object-cover" alt="" />
            : <span>{getInitials(userProfile?.name || 'U')}</span>
          }
        </div>
      </div>
    </header>
  )
}
