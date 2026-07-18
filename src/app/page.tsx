'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { BookOpen } from 'lucide-react'

export default function HomePage() {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()
  const [timedOut, setTimedOut] = useState(false)

  // Safety net: if loading takes more than 5s, send to login
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 5000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    // Wait for auth to resolve
    if (loading) return

    // Not logged in
    if (!user) {
      router.replace('/login')
      return
    }

    // Logged in and profile loaded — redirect to correct dashboard
    if (userProfile) {
      switch (userProfile.role) {
        case 'professor': router.replace('/dashboard/professor'); break
        case 'admin':     router.replace('/dashboard/admin');     break
        default:          router.replace('/dashboard/student');   break
      }
      return
    }

    // Logged in but no profile found (never registered properly)
    // or timed out — send to login with a clean state
    if (timedOut) {
      router.replace('/login')
    }
  }, [user, userProfile, loading, router, timedOut])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-5 animate-fade-in">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
          style={{ background: 'linear-gradient(135deg, hsl(239 84% 60%), hsl(239 84% 45%))' }}
        >
          <BookOpen className="w-7 h-7 text-white" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading Campus Connect…</p>
        </div>
      </div>
    </div>
  )
}