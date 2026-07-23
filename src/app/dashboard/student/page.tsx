'use client'
import { useEffect, useState, useCallback } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import {
  ClassWorkspace, Assignment, Announcement, Meeting
} from '@/lib/types'
import { formatDate, timeAgo, daysUntilDeadline, isDeadlinePassed } from '@/lib/utils'
import {
  BookOpen, ClipboardList, CalendarCheck, Bell, Video,
  FileText, Megaphone, TrendingUp, Clock, ChevronRight, AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import {
  StatCardSkeleton, RowSkeleton, AnnouncementSkeleton, WelcomeSkeleton
} from '@/components/ui/Skeleton'

export default function StudentDashboardPage() {
  const { userProfile } = useAuth()

  const [classes, setClasses]         = useState<ClassWorkspace[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [meetings, setMeetings]       = useState<Meeting[]>([])
  const [attendancePct, setAttendancePct] = useState<number | null>(null)

  // Granular loading states — each section loads independently
  const [loadingClasses, setLoadingClasses]       = useState(true)
  const [loadingFeed, setLoadingFeed]             = useState(true)

  // ── Step 1: load enrolled classes (fast — single query) ──────────────────
  useEffect(() => {
    if (!userProfile?.uid) return
    setLoadingClasses(true)

    supabase.from('classes').select('*')
      .contains('students', [userProfile.uid])
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const classList = (data ?? []).map(r => ({
          id: r.id, subject: r.subject, name: r.name, department: r.department,
          year: r.year, division: r.division, semester: r.semester, college: r.college,
          professorId: r.professor_id, professorName: r.professor_name,
          joinCode: r.join_code, students: r.students ?? [], createdAt: r.created_at,
        })) as ClassWorkspace[]
        setClasses(classList)
        setLoadingClasses(false)
      })
  }, [userProfile?.uid])

  // ── Step 2: load feed data in parallel once classes are known ─────────────
  useEffect(() => {
    if (!userProfile?.uid || classes.length === 0) {
      setLoadingFeed(false)
      return
    }
    setLoadingFeed(true)
    const classIds = classes.map(c => c.id)

    Promise.all([
      // Assignments: pending & active
      supabase.from('assignments').select('*')
        .in('class_id', classIds)
        .eq('status', 'active')
        .order('due_date', { ascending: true })
        .limit(5),

      // Announcements: recent across all classes
      supabase.from('announcements').select('*')
        .in('class_id', classIds)
        .order('created_at', { ascending: false })
        .limit(4),

      // Meetings: upcoming
      supabase.from('meetings').select('*')
        .in('class_id', classIds)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(3),

      // Attendance: for percentage calculation
      supabase.from('attendance').select('records, class_id')
        .in('class_id', classIds),
    ]).then(([asgRes, annRes, mtgRes, attRes]) => {
      // Parse assignments
      setAssignments(((asgRes as any).data ?? []).map((r: any) => ({
        id: r.id, title: r.title, instructions: r.instructions,
        subject: r.subject, dueDate: r.due_date,
        attachmentUrl: r.attachment_url, createdBy: r.created_by,
        createdByName: r.created_by_name, createdAt: r.created_at,
        status: r.status, classId: r.class_id,
      })) as Assignment[])

      // Parse announcements
      setAnnouncements(((annRes as any).data ?? []).map((r: any) => ({
        id: r.id, title: r.title, body: r.body, classId: r.class_id,
        createdBy: r.created_by, createdByName: r.created_by_name,
        createdAt: r.created_at, pinned: r.pinned, attachmentUrl: r.attachment_url,
      })) as Announcement[])

      // Parse meetings
      setMeetings(((mtgRes as any).data ?? []).map((r: any) => ({
        id: r.id, title: r.title, date: r.date, time: r.time,
        meetingLink: r.meeting_link, agenda: r.agenda,
        createdBy: r.created_by, createdByName: r.created_by_name,
        createdAt: r.created_at, classId: r.class_id,
      })) as Meeting[])

      // Calculate personal attendance % from JSONB records column
      let present = 0, total = 0
      ;((attRes as any).data ?? []).forEach((rec: any) => {
        const status = rec.records?.[userProfile!.uid]
        if (status) {
          total++
          if (status === 'present' || status === 'late') present++
        }
      })
      setAttendancePct(total > 0 ? Math.round((present / total) * 100) : null)
      setLoadingFeed(false)
    })
  }, [classes, userProfile?.uid])

  const pendingCount = assignments.filter(a => !isDeadlinePassed(a.dueDate)).length
  const isLoading = loadingClasses || loadingFeed

  return (
    <DashboardLayout title="Student Dashboard">
      <div className="space-y-6 animate-fade-in">

        {/* Welcome Banner */}
        {loadingClasses ? <WelcomeSkeleton /> : (
          <div className="glass-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Good {getTimeOfDay()},{' '}
                  <span className="gradient-text">{userProfile?.name?.split(' ')[0]}</span> 👋
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  You&apos;re enrolled in <strong className="text-foreground">{classes.length}</strong> class{classes.length !== 1 ? 'es' : ''}.
                </p>
              </div>
              <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
                <span>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              </div>
            </div>
          </div>
        )}

        {/* Stat Cards Row */}
        {loadingClasses ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <StatCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={BookOpen}     color="brand"                                            label="Classes"             value={classes.length}   href="/dashboard/student/classes"    />
            <StatCard icon={ClipboardList} color="yellow"                                           label="Pending Assignments" value={pendingCount}     href="/dashboard/student/assignments" />
            <StatCard icon={CalendarCheck} color={attendancePct === null ? 'gray' : attendancePct >= 75 ? 'green' : 'red'} label="Attendance"  value={attendancePct === null ? 'N/A' : `${attendancePct}%`} href="/dashboard/student/attendance" />
            <StatCard icon={Video}         color="purple"                                           label="Meetings"            value={meetings.length}  href="/dashboard/student/meetings"   />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — Assignments + Announcements */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Pending Assignments</h2>
              <Link href="/dashboard/student/assignments" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {loadingFeed ? <RowSkeleton rows={3} height="h-16" /> : assignments.length === 0 ? (
              <div className="glass-card p-8 text-center text-muted-foreground text-sm">
                <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No pending assignments 🎉
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map(a => {
                  const days = daysUntilDeadline(a.dueDate)
                  const passed = isDeadlinePassed(a.dueDate)
                  return (
                    <Link key={a.id} href={`/dashboard/student/assignments?classId=${a.classId}`}
                      className="glass-card p-4 flex items-center gap-4 hover:border-brand-500/20 transition-all block cursor-pointer">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${passed ? 'bg-red-500/15' : days <= 2 ? 'bg-yellow-500/15' : 'bg-brand-500/15'}`}>
                        <ClipboardList className={`w-5 h-5 ${passed ? 'text-red-400' : days <= 2 ? 'text-yellow-400' : 'text-brand-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{a.title}</p>
                        <p className="text-xs text-muted-foreground">{a.subject}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`badge text-xs ${passed ? 'badge-red' : days <= 2 ? 'badge-yellow' : 'badge-blue'}`}>
                          {passed ? 'Overdue' : days === 0 ? 'Due today' : `${days}d left`}
                        </span>
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(a.dueDate)}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <h2 className="section-title">Recent Announcements</h2>
              <Link href="/dashboard/student/announcements" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {loadingFeed ? <AnnouncementSkeleton count={2} /> : announcements.length === 0 ? (
              <div className="glass-card p-8 text-center text-muted-foreground text-sm">
                <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No announcements yet
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map(ann => (
                  <Link key={ann.id} href={`/dashboard/student/announcements?classId=${ann.classId}`}
                    className="announcement-card block cursor-pointer hover:border-brand-500/20 transition-all">
                    {ann.pinned && <span className="badge badge-blue text-xs mb-1">📌 Pinned</span>}
                    <p className="text-sm font-semibold text-foreground">{ann.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{ann.body}</p>
                    <p className="text-xs text-muted-foreground">{ann.createdByName} · {timeAgo(ann.createdAt)}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Attendance Overview */}
            <div className="glass-card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-brand-400" /> Attendance Overview
              </h3>
              {loadingFeed ? (
                <div className="space-y-3 py-2">
                  <div className="shimmer h-10 w-20 rounded-lg mx-auto" />
                  <div className="shimmer h-2 w-full rounded-full" />
                </div>
              ) : attendancePct !== null ? (
                <>
                  <div className="text-center py-3">
                    <p className={`text-4xl font-bold ${attendancePct >= 75 ? 'text-emerald-400' : 'text-red-400'}`}>{attendancePct}%</p>
                    <p className="text-xs text-muted-foreground mt-1">Overall attendance</p>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${attendancePct}%`, background: attendancePct >= 75 ? 'hsl(162 73% 46%)' : 'hsl(0 72% 51%)' }} />
                  </div>
                  {attendancePct < 75 && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-300">Below 75% — exam eligibility at risk.</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No attendance records yet</p>
              )}
              <Link href="/dashboard/student/attendance" className="btn-ghost w-full justify-center text-xs">View Details</Link>
            </div>

            {/* Upcoming Meetings */}
            <div className="glass-card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Video className="w-4 h-4 text-brand-400" /> Upcoming Meetings
              </h3>
              {loadingFeed ? <RowSkeleton rows={2} height="h-14" /> : meetings.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No meetings scheduled</p>
              ) : (
                <div className="space-y-2">
                  {meetings.map(m => (
                    <div key={m.id} className="p-3 rounded-lg bg-muted/50 border border-border space-y-1">
                      <p className="text-sm font-medium text-foreground">{m.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDate(m.date)} at {m.time}
                      </p>
                      <a href={m.meetingLink} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-400 hover:text-brand-300">
                        Join Meeting →
                      </a>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/dashboard/student/meetings" className="btn-ghost w-full justify-center text-xs">View All</Link>
            </div>

            {/* Quick Links */}
            <div className="glass-card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Quick Actions</h3>
              <div className="space-y-2">
                {[
                  { label: 'Download Notes',  href: '/dashboard/student/notes',   icon: FileText },
                  { label: 'Class Chat',      href: '/dashboard/student/chat',    icon: Bell },
                  { label: 'Ask a Query',     href: '/dashboard/student/queries', icon: TrendingUp },
                ].map(a => (
                  <Link key={a.href} href={a.href} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors group">
                    <a.icon className="w-4 h-4 text-muted-foreground group-hover:text-brand-400 transition-colors" />
                    <span className="text-sm text-muted-foreground group-hover:text-foreground">{a.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

function StatCard({ icon: Icon, color, label, value, href }: {
  icon: any; color: string; label: string; value: any; href: string
}) {
  const colors: Record<string, string> = {
    brand:  'bg-brand-500/15 text-brand-400',
    yellow: 'bg-yellow-500/15 text-yellow-400',
    green:  'bg-emerald-500/15 text-emerald-400',
    red:    'bg-red-500/15 text-red-400',
    gray:   'bg-muted text-muted-foreground',
    purple: 'bg-purple-500/15 text-purple-400',
  }
  return (
    <Link href={href} className="stat-card block">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </Link>
  )
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
