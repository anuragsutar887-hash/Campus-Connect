'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { getInitials } from '@/lib/utils'
import {
  BookOpen, LayoutDashboard, Users, FileText, ClipboardList,
  CalendarCheck, Megaphone, MessageCircle, HelpCircle, Video,
  Shield, GraduationCap, Briefcase, X
} from 'lucide-react'

const studentNav = [
  { label: 'Dashboard',        href: '/dashboard/student',               icon: LayoutDashboard },
  { label: 'My Classes',       href: '/dashboard/student/classes',        icon: BookOpen },
  { label: 'Assignments',      href: '/dashboard/student/assignments',    icon: ClipboardList },
  { label: 'Attendance',       href: '/dashboard/student/attendance',     icon: CalendarCheck },
  { label: 'Notes & Resources',href: '/dashboard/student/notes',         icon: FileText },
  { label: 'Announcements',    href: '/dashboard/student/announcements',  icon: Megaphone },
  { label: 'Class Chat',       href: '/dashboard/student/chat',           icon: MessageCircle },
  { label: 'My Queries',       href: '/dashboard/student/queries',        icon: HelpCircle },
  { label: 'Meetings',         href: '/dashboard/student/meetings',       icon: Video },
]

const professorNav = [
  { label: 'Dashboard',        href: '/dashboard/professor',              icon: LayoutDashboard },
  { label: 'My Classes',       href: '/dashboard/professor/classes',      icon: BookOpen },
  { label: 'Assignments',      href: '/dashboard/professor/assignments',  icon: ClipboardList },
  { label: 'Attendance',       href: '/dashboard/professor/attendance',   icon: CalendarCheck },
  { label: 'Notes & Resources',href: '/dashboard/professor/notes',        icon: FileText },
  { label: 'Announcements',    href: '/dashboard/professor/announcements',icon: Megaphone },
  { label: 'Student Queries',  href: '/dashboard/professor/queries',      icon: HelpCircle },
  { label: 'Meetings',         href: '/dashboard/professor/meetings',     icon: Video },
]

const adminNav = [
  { label: 'Dashboard', href: '/dashboard/admin',         icon: LayoutDashboard },
  { label: 'Users',     href: '/dashboard/admin/users',   icon: Users },
  { label: 'Classes',   href: '/dashboard/admin/classes', icon: BookOpen },
  { label: 'Reports',   href: '/dashboard/admin/reports', icon: FileText },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { userProfile } = useAuth()
  const pathname = usePathname()

  const nav =
    userProfile?.role === 'professor'
      ? professorNav
      : userProfile?.role === 'admin'
      ? adminNav
      : studentNav

  const roleIcon =
    userProfile?.role === 'professor' ? Briefcase :
    userProfile?.role === 'admin' ? Shield : GraduationCap

  const RoleIcon = roleIcon

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 z-50 flex flex-col
        bg-card border-r border-border
        lg:static lg:z-auto lg:translate-x-0
        transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <Link href="/" className="flex items-center gap-2.5">
            <img
              src="/logo.jpg"
              alt="Campus Connect"
              className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
            />
            <span className="font-bold text-foreground text-sm tracking-tight">Campus Connect</span>
          </Link>
          <button onClick={onClose} className="lg:hidden text-muted-foreground hover:text-foreground p-1 rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User profile chip */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/60">
            <div className="avatar w-9 h-9 text-xs flex-shrink-0">
              {userProfile?.photoURL
                ? <img src={userProfile.photoURL} className="w-9 h-9 rounded-full object-cover" alt="avatar" />
                : <span>{getInitials(userProfile?.name || 'U')}</span>
              }
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{userProfile?.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <RoleIcon className="w-3 h-3 text-brand-500" />
                <span className="text-xs text-brand-500 dark:text-brand-400 capitalize font-medium">{userProfile?.role}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {nav.map((item) => {
            const Icon = item.icon
            const isDashboardRoot = item.href === '/dashboard/professor' || item.href === '/dashboard/student' || item.href === '/dashboard/admin'
            const isActive = isDashboardRoot
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
