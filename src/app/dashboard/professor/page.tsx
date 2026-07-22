'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { ClassWorkspace, Query as QueryType, Meeting } from '@/lib/types'
import {
  BookOpen, ClipboardList, CalendarCheck, HelpCircle,
  Plus, Clock, ChevronRight, Video, ArrowRight, Sparkles
} from 'lucide-react'
import { getInitials, timeAgo, formatDate } from '@/lib/utils'
import { StatCardSkeleton, RowSkeleton } from '@/components/ui/Skeleton'

// ── Skeleton for the professor dashboard ─────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Greeting */}
      <div className="space-y-2">
        <div className="shimmer h-8 w-72 rounded-lg" />
        <div className="shimmer h-4 w-48 rounded-lg" />
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <StatCardSkeleton key={i} />)}
      </div>
      {/* Two-column */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="shimmer h-6 w-28 rounded-lg" />
          <RowSkeleton rows={3} height="h-16" />
        </div>
        <div className="space-y-3">
          <div className="shimmer h-6 w-32 rounded-lg" />
          <RowSkeleton rows={2} height="h-20" />
        </div>
      </div>
    </div>
  )
}

export default function ProfessorDashboardPage() {
  const { userProfile } = useAuth()

  const [classes, setClasses]       = useState<ClassWorkspace[]>([])
  const [queries, setQueries]       = useState<QueryType[]>([])
  const [meetings, setMeetings]     = useState<Meeting[]>([])
  const [totalStudents, setTotalStudents]         = useState(0)
  const [pendingSubmissions, setPendingSubmissions] = useState(0)
  const [avgAttendancePct, setAvgAttendancePct]   = useState<number | null>(null)

  // Granular loading — stats show instantly, feed data fills in after
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [loadingFeed, setLoadingFeed]       = useState(true)

  const uid = userProfile?.uid

  // ── Phase 1: Load professor's classes (fast single query) ─────────────────
  useEffect(() => {
    if (!uid) return
    setLoadingClasses(true)

    supabase.from('classes').select('*')
      .eq('professor_id', uid)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const list = (data ?? []).map(r => ({
          id: r.id, subject: r.subject, name: r.name, department: r.department,
          year: r.year, division: r.division, semester: r.semester, college: r.college,
          professorId: r.professor_id, professorName: r.professor_name,
          joinCode: r.join_code, students: r.students ?? [], createdAt: r.created_at,
        })) as ClassWorkspace[]
        setClasses(list)

        // Compute total enrolled students right away
        const total = list.reduce((sum, c) => sum + (c.students?.length ?? 0), 0)
        setTotalStudents(total)
        setLoadingClasses(false)
      })
  }, [uid])

  // ── Phase 2: Load feed data in parallel once classes are known ────────────
  useEffect(() => {
    if (!uid || classes.length === 0) {
      setLoadingFeed(false)
      return
    }

    async function loadFeed() {
      setLoadingFeed(true)
      const classIds = classes.map(c => c.id)
      const today = new Date().toISOString().split('T')[0]
      // Current time as "HH:MM" for same-day filtering
      const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

      try {
        // Fetch assignment IDs first
        const { data: assignmentsData } = await supabase
          .from('assignments')
          .select('id')
          .in('class_id', classIds)

        const assignmentIds = assignmentsData?.map(a => a.id) ?? []

        // Now fetch everything in parallel
        const [mtgRes, qRes, subRes, attRes] = await Promise.all([
          // Upcoming meetings (today onwards — we'll filter by time client-side)
          supabase.from('meetings').select('*')
            .in('class_id', classIds)
            .gte('date', today)
            .order('date').order('time')
            .limit(20),

          // Open/in-review student queries
          supabase.from('queries').select('*')
            .eq('professor_id', uid)
            .in('status', ['open', 'in-review'])
            .order('created_at', { ascending: false })
            .limit(5),

          // Pending submissions (submitted status)
          supabase.from('submissions').select('assignment_id, status')
            .in('assignment_id', assignmentIds.length ? assignmentIds : ['__none__'])
            .eq('status', 'submitted'),

          // Attendance records to compute average class attendance %
          supabase.from('attendance').select('records')
            .in('class_id', classIds)
            .limit(100),
        ])

        // Meetings — filter out any that have already passed (date+time)
        const now = new Date()
        const allMeetings = ((mtgRes as any).data ?? []).map((r: any) => ({
          id: r.id, title: r.title, date: r.date, time: r.time,
          meetingLink: r.meeting_link, agenda: r.agenda,
          createdBy: r.created_by, createdByName: r.created_by_name,
          createdAt: r.created_at, classId: r.class_id,
        })) as Meeting[]
        const upcomingMeetings = allMeetings.filter(m => {
          const meetingDateTime = new Date(`${m.date}T${m.time}`)
          return meetingDateTime > now
        })
        setMeetings(upcomingMeetings.slice(0, 4))

        // Open queries
        setQueries(((qRes as any).data ?? []).map((r: any) => ({
          id: r.id, type: r.type, subject: r.subject, classId: r.class_id,
          studentId: r.student_id, studentName: r.student_name,
          professorId: r.professor_id, professorName: r.professor_name,
          message: r.message, status: r.status,
          reply: r.reply, repliedAt: r.replied_at, createdAt: r.created_at,
        })) as QueryType[])

        // Pending submission count
        setPendingSubmissions(((subRes as any).data ?? []).length)

        // Average attendance %
        const attData: any[] = (attRes as any).data ?? []
        let totalPresent = 0, totalSlots = 0
        attData.forEach(rec => {
          const records: Record<string, string> = rec.records ?? {}
          Object.values(records).forEach(status => {
            totalSlots++
            if (status === 'present' || status === 'late') totalPresent++
          })
        })
        setAvgAttendancePct(totalSlots > 0 ? Math.round((totalPresent / totalSlots) * 100) : null)
      } catch (err) {
        console.error('Error fetching professor feed data:', err)
      } finally {
        setLoadingFeed(false)
      }
    }

    loadFeed()
  }, [classes, uid])

  // ─────────────────────────────────────────────────────────────────────────
  if (loadingClasses) return <DashboardLayout title="Dashboard"><DashboardSkeleton /></DashboardLayout>

  const noData = classes.length === 0

  return (
    <DashboardLayout title="Dashboard">
      <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fade-in">

        {/* Greeting */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Welcome back,{' '}
              <span className="gradient-text">Prof. {userProfile?.name?.split(' ')[0]}</span> 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          {noData && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-500 dark:text-brand-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Create your first class to get started!</span>
            </div>
          )}
        </div>

        {/* ── Stats Grid ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatBlock
            icon={BookOpen} color="brand"
            label="My Classes" value={classes.length}
            href="/dashboard/professor/classes"
          />
          <StatBlock
            icon={ClipboardList} color="indigo"
            label="Pending Reviews"
            value={loadingFeed ? '—' : pendingSubmissions}
            href="/dashboard/professor/assignments"
          />
          <StatBlock
            icon={CalendarCheck} color="emerald"
            label="Avg. Attendance"
            value={loadingFeed ? '—' : (avgAttendancePct !== null ? `${avgAttendancePct}%` : 'N/A')}
            href="/dashboard/professor/attendance"
          />
          <StatBlock
            icon={HelpCircle} color="red"
            label="Open Queries"
            value={loadingFeed ? '—' : queries.length}
            href="/dashboard/professor/queries"
          />
        </div>

        {/* ── Quick Actions ──────────────────────────────────────────────── */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/professor/attendance" className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm">
              <CalendarCheck className="w-4 h-4" /> Mark Attendance
            </Link>
            <Link href="/dashboard/professor/assignments" className="btn-secondary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm">
              <Plus className="w-4 h-4" /> Create Assignment
            </Link>
            <Link href="/dashboard/professor/meetings" className="btn-ghost inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border border-border">
              <Video className="w-4 h-4" /> Schedule Meeting
            </Link>
          </div>
        </div>

        {/* ── Two-Column: Classes + Upcoming Meetings ───────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* My Classes */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-foreground tracking-tight">My Classes</h2>
              <Link href="/dashboard/professor/classes" className="text-xs font-semibold text-brand-500 hover:text-brand-600 dark:text-brand-400 flex items-center gap-1">
                See All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {noData ? (
              <div className="glass-card p-8 text-center space-y-3">
                <BookOpen className="w-10 h-10 mx-auto text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground">No classes yet. Create your first class!</p>
                <Link href="/dashboard/professor/classes" className="btn-primary inline-flex">
                  <Plus className="w-4 h-4" /> Create Class
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {classes.slice(0, 3).map(cls => (
                  <Link
                    key={cls.id}
                    href={`/dashboard/professor/classes/${cls.id}`}
                    className="glass-card p-4 flex items-center justify-between gap-4 hover:border-brand-500/20 transition-all group block"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors">
                          {cls.subject}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          Div {cls.division} · Year {cls.year} · Sem {cls.semester}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="badge badge-blue text-[10px] py-0.5 px-2 font-semibold">
                        {cls.students?.length ?? 0} Students
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Today's / Upcoming Meetings */}
          <div className="space-y-4">
            <h2 className="font-bold text-lg text-foreground tracking-tight">Upcoming Meetings</h2>

            {loadingFeed ? (
              <RowSkeleton rows={2} height="h-20" />
            ) : meetings.length === 0 ? (
              <div className="glass-card p-8 text-center space-y-2">
                <Video className="w-8 h-8 mx-auto text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground">No upcoming meetings scheduled</p>
                <Link href="/dashboard/professor/meetings" className="btn-ghost text-xs">
                  + Schedule one
                </Link>
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
                {meetings.slice(0, 4).map((m, idx) => (
                  <div key={m.id} className="relative group">
                    <div className={`absolute -left-[20px] top-4 w-3.5 h-3.5 rounded-full border-2 bg-background ${idx === 0 ? 'border-brand-500 scale-110 shadow-[0_0_8px_hsl(var(--primary)/0.5)]' : 'border-muted-foreground/40'}`}>
                      {idx === 0 && <div className="absolute inset-0.5 rounded-full bg-brand-500 animate-ping" />}
                    </div>
                    <div className="glass-card p-4 space-y-1.5 hover:bg-secondary/20 transition-all">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-brand-500 dark:text-brand-400 uppercase tracking-wider">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatDate(m.date)} · {m.time}</span>
                      </div>
                      <h3 className="font-semibold text-sm text-foreground">{m.title}</h3>
                      {m.agenda && <p className="text-xs text-muted-foreground line-clamp-1">{m.agenda}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Recent Open Queries ───────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg text-foreground tracking-tight flex items-center gap-2">
              Open Student Queries
              {queries.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold py-0.5 px-2 rounded-full">
                  {queries.length} Pending
                </span>
              )}
            </h2>
            <Link href="/dashboard/professor/queries" className="text-xs font-semibold text-brand-500 hover:text-brand-600 dark:text-brand-400 flex items-center gap-1">
              See All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loadingFeed ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1,2].map(i => <div key={i} className="glass-card p-4 h-24 shimmer rounded-xl" />)}
            </div>
          ) : queries.length === 0 ? (
            <div className="glass-card p-8 text-center text-muted-foreground text-sm">
              <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No open queries — all caught up! ✅
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {queries.slice(0, 4).map(q => (
                <Link
                  key={q.id}
                  href="/dashboard/professor/queries"
                  className="glass-card p-4 flex gap-4 hover:border-brand-500/20 hover:bg-secondary/20 transition-all block"
                >
                  <div className="avatar w-9 h-9 text-xs flex-shrink-0 ring-2 ring-brand-500/10">
                    <span>{getInitials(q.studentName)}</span>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold text-sm text-foreground truncate">{q.studentName}</h4>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(q.createdAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium truncate">{q.subject}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1 italic">&ldquo;{q.message}&rdquo;</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>



      </div>
    </DashboardLayout>
  )
}

// ── Stat block component ───────────────────────────────────────────────────────
function StatBlock({ icon: Icon, color, label, value, href }: {
  icon: any; color: string; label: string; value: any; href: string
}) {
  const colorMap: Record<string, string> = {
    brand:  'bg-brand-500/10 text-brand-500 dark:text-brand-400',
    indigo: 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400',
    emerald:'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400',
    red:    'bg-red-500/10 text-red-500 dark:text-red-400',
  }
  return (
    <Link href={href} className="glass-card p-5 flex flex-col justify-between min-h-[120px] hover:-translate-y-0.5 transition-all block">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="mt-4">
        <span className="text-2xl font-bold text-foreground block tracking-tight">{value}</span>
        <span className="text-xs text-muted-foreground font-medium mt-0.5 block">{label}</span>
      </div>
    </Link>
  )
}