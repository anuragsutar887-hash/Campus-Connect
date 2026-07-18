'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, limit } from 'firebase/firestore'
import { UserProfile, ClassWorkspace, Query } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { Shield, Users, BookOpen, HelpCircle, FileText, ChevronRight, Settings } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function AdminDashboardPage() {
  const { userProfile } = useAuth()
  const [stats, setStats] = useState({
    users: 0,
    classes: 0,
    queries: 0,
    reports: 0
  })
  const [loading, setLoading] = useState(true)
  const [recentUsers, setRecentUsers] = useState<UserProfile[]>([])
  const [recentClasses, setRecentClasses] = useState<ClassWorkspace[]>([])

  useEffect(() => {
    if (!userProfile || userProfile.role !== 'admin') return

    async function loadStats() {
      try {
        const [usersSnap, classesSnap, queriesSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'classes')),
          getDocs(collection(db, 'queries'))
        ])

        const users = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() })) as UserProfile[]
        const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as ClassWorkspace[]
        const queries = queriesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Query[]

        // Find reported messages count by scanning class chats
        let totalReports = 0
        for (const c of classes) {
          const chatSnap = await getDocs(collection(db, 'classes', c.id, 'messages'))
          chatSnap.docs.forEach(d => {
            if (d.data().reported) totalReports++
          })
        }

        setStats({
          users: users.length,
          classes: classes.length,
          queries: queries.length,
          reports: totalReports
        })

        // Sort and slice
        const sortedUsers = [...users].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        const sortedClasses = [...classes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        setRecentUsers(sortedUsers.slice(0, 5))
        setRecentClasses(sortedClasses.slice(0, 5))
      } catch (err) {
        console.error(err)
        toast.error('Failed to load system stats')
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [userProfile])

  if (loading) return (
    <DashboardLayout title="Admin Panel">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout title="Admin Controls">
      <div className="space-y-6 animate-fade-in">
        {/* Welcome */}
        <div className="glass-card p-6 border-l-4 border-l-purple-500">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-400" /> Admin Console
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            System status: <strong className="text-emerald-400">All systems operational</strong> · You have full control over users, classes and compliance.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} color="brand" label="Total Registered Users" value={stats.users} href="/dashboard/admin/users" />
          <StatCard icon={BookOpen} color="green" label="Active Classes" value={stats.classes} href="/dashboard/admin/classes" />
          <StatCard icon={HelpCircle} color="yellow" label="Academic Tickets" value={stats.queries} href="/dashboard/admin/reports" />
          <StatCard icon={FileText} color="red" label="Flagged Reports" value={stats.reports} href="/dashboard/admin/reports" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Registrations */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="section-title">Recent Registrations</h2>
              <Link href="/dashboard/admin/users" className="text-xs text-brand-400 hover:underline flex items-center gap-0.5">
                Manage all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="space-y-3">
              {recentUsers.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No users registered.</p>
              ) : (
                recentUsers.map(user => (
                  <div key={user.uid} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50 text-xs">
                    <div>
                      <p className="font-semibold text-foreground">{user.name}</p>
                      <p className="text-muted-foreground">{user.email}</p>
                    </div>
                    <span className={`badge capitalize font-semibold ${user.role === 'admin' ? 'badge-red' : user.role === 'professor' ? 'badge-purple bg-purple-500/10 text-purple-400' : 'badge-blue'}`}>
                      {user.role}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Classes */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="section-title">Recently Created Classes</h2>
              <Link href="/dashboard/admin/classes" className="text-xs text-brand-400 hover:underline flex items-center gap-0.5">
                Manage all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="space-y-3">
              {recentClasses.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No classes created.</p>
              ) : (
                recentClasses.map(cls => (
                  <div key={cls.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50 text-xs">
                    <div>
                      <p className="font-semibold text-foreground">{cls.subject}</p>
                      <p className="text-muted-foreground">Prof: {cls.professorName}</p>
                    </div>
                    <span className="text-muted-foreground">{cls.students?.length || 0} students</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

function StatCard({ icon: Icon, color, label, value, href }: any) {
  const colors: Record<string, string> = {
    brand: 'bg-brand-500/15 text-brand-400',
    yellow: 'bg-yellow-500/15 text-yellow-400',
    green: 'bg-emerald-500/15 text-emerald-400',
    red: 'bg-red-500/15 text-red-400',
  }
  return (
    <Link href={href} className="stat-card block">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="mt-2">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </Link>
  )
}
