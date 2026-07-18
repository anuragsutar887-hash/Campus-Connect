'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import Sidebar from './Sidebar'
import Header from './Header'
import { ShieldAlert, BookOpen } from 'lucide-react'

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/login'); return }
  }, [user, loading, router])

  // ── Full-page loader while auth is resolving ──────────────────────────────
  if (loading || (user && !userProfile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, hsl(239 84% 60%), hsl(239 84% 45%))' }}
          >
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-xs">Loading your workspace…</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  // ── Role-based route guard ────────────────────────────────────────────────
  if (userProfile) {
    const role = userProfile.role
    const onProfRoute  = pathname?.startsWith('/dashboard/professor')
    const onStudRoute  = pathname?.startsWith('/dashboard/student')
    const onAdminRoute = pathname?.startsWith('/dashboard/admin')

    const blocked =
      (onProfRoute  && role !== 'professor' && role !== 'admin') ||
      (onStudRoute  && role !== 'student'   && role !== 'admin') ||
      (onAdminRoute && role !== 'admin')

    if (blocked) {
      const correctDash =
        (role as string) === 'professor' ? '/dashboard/professor' :
        (role as string) === 'admin'     ? '/dashboard/admin' :
                                           '/dashboard/student'

      const roleName = role.charAt(0).toUpperCase() + role.slice(1)

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="glass-card p-10 max-w-md w-full text-center space-y-5 animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-red-500/15 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7 text-red-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                This area requires a different role. Your account is registered as a{' '}
                <strong className="text-foreground">{roleName}</strong>.
              </p>
            </div>
            <button onClick={() => router.replace(correctDash)} className="btn-primary w-full">
              Go to my Dashboard
            </button>
          </div>
        </div>
      )
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} title={title} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
