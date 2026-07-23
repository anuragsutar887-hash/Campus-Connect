'use client'
export const dynamic = 'force-dynamic'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { ClassWorkspace, AttendanceRecord } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { CalendarCheck, AlertCircle, Info } from 'lucide-react'
import { toast } from 'sonner'

// ── Skeleton loader ──────────────────────────────────────────────────────────
function AttendanceSkeleton() {
  return (
    <DashboardLayout title="Attendance">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="shimmer h-6 w-44 rounded-lg" />
            <div className="shimmer h-4 w-56 rounded-lg" />
          </div>
          <div className="shimmer h-10 w-48 rounded-lg" />
        </div>
        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-5 space-y-4">
            <div className="shimmer h-4 w-32 rounded-lg" />
            <div className="shimmer h-10 w-24 rounded-lg" />
            <div className="shimmer h-2 w-full rounded-full" />
          </div>
          <div className="glass-card p-5 md:col-span-2 grid grid-cols-2 gap-4">
            {[1,2].map(i => (
              <div key={i} className="p-4 rounded-xl bg-muted/30 space-y-2">
                <div className="shimmer h-3 w-12 mx-auto rounded-lg" />
                <div className="shimmer h-7 w-8 mx-auto rounded-lg" />
              </div>
            ))}
          </div>
        </div>
        {/* Log rows skeleton */}
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="glass-card p-4 flex items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="shimmer h-4 w-40 rounded-lg" />
                <div className="shimmer h-3 w-24 rounded-lg" />
              </div>
              <div className="shimmer h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}

function StudentAttendancePageContent() {
  const { userProfile } = useAuth()
  const searchParams = useSearchParams()
  const urlClassId = searchParams.get('classId')

  const [classes, setClasses]               = useState<ClassWorkspace[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [loading, setLoading]               = useState(true)
  const [loadingAttendance, setLoadingAttendance] = useState(false)
  const [logs, setLogs] = useState<{ date: string; subject: string; status: string; id: string }[]>([])
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0, excused: 0, pct: 0 })

  useEffect(() => {
    if (!userProfile?.uid) return
    supabase.from('classes').select('*').contains('students', [userProfile.uid]).then(({ data }) => {
      const list = (data ?? []).map(r => ({
        id: r.id, subject: r.subject, name: r.name, department: r.department,
        year: r.year, division: r.division, semester: r.semester, college: r.college,
        professorId: r.professor_id, professorName: r.professor_name,
        joinCode: r.join_code, students: r.students ?? [], createdAt: r.created_at,
      })) as ClassWorkspace[]
      setClasses(list)
      if (list.length > 0) {
        const def = urlClassId && list.some(c => c.id === urlClassId) ? urlClassId : list[0].id
        setSelectedClassId(def)
      }
      setLoading(false)
    })
  }, [userProfile, urlClassId])

  useEffect(() => {
    if (!selectedClassId || !userProfile) return
    setLoadingAttendance(true)
    supabase.from('attendance').select('*').eq('class_id', selectedClassId)
      .order('date', { ascending: false })
      .then(({ data }) => {
        const records = (data ?? []) as { id: string; date: string; subject: string; records: Record<string, string> }[]
        const studentLogs: { date: string; subject: string; status: string; id: string }[] = []
        let total = 0, present = 0, absent = 0, late = 0, excused = 0

        records.forEach(rec => {
          const status = rec.records?.[userProfile!.uid]
          if (status) {
            total++
            if (status === 'present') present++
            else if (status === 'absent') absent++
            else if (status === 'late') late++
            else if (status === 'excused') excused++
            studentLogs.push({ id: rec.id, date: rec.date, subject: rec.subject, status })
          }
        })

        const pct = total > 0 ? Math.round(((present + late) / total) * 100) : 0
        setLogs(studentLogs)
        setStats({ total, present, absent, late, excused, pct })
        setLoadingAttendance(false)
      })
  }, [selectedClassId, userProfile])

  if (loading) return <AttendanceSkeleton />

  const activeClass = classes.find(c => c.id === selectedClassId)
  const belowThreshold = stats.total > 0 && stats.pct < 75

  return (
    <DashboardLayout title="Attendance">
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Attendance Records</h1>
            <p className="text-sm text-muted-foreground mt-1">Monitor your attendance and session logs</p>
          </div>
          <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="input-field max-w-xs">
            {classes.length === 0
              ? <option value="">No enrolled classes</option>
              : classes.map(c => <option key={c.id} value={c.id}>{c.subject} (Prof. {c.professorName.split(' ').slice(-1)[0]})</option>)}
          </select>
        </div>

        {classes.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <CalendarCheck className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-4" />
            <p className="text-foreground font-medium">Not enrolled in any classes</p>
          </div>
        ) : loadingAttendance ? (
          <div className="space-y-4">
            <div className="glass-card h-40 shimmer rounded-xl" />
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="glass-card h-16 shimmer rounded-xl" />)}</div>
          </div>
        ) : (
          <>
            {belowThreshold && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-red-300">Attendance Warning ({stats.pct}%)</h4>
                  <p className="text-xs text-red-200 mt-1">
                    Your attendance for {activeClass?.subject} is below the 75% threshold.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-card p-5 flex flex-col justify-between space-y-4 md:col-span-1">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground">Overall Attendance</h3>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className={`text-4xl font-extrabold ${stats.pct >= 75 ? 'text-emerald-400' : 'text-red-400'}`}>{stats.pct}%</span>
                    <span className="text-xs text-muted-foreground">({stats.total} sessions)</span>
                  </div>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div className={`h-full ${stats.pct >= 75 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${stats.pct}%` }} />
                </div>
              </div>
              <div className="glass-card p-5 md:col-span-2 grid grid-cols-2 gap-4">
                {[
                  { label: 'Present', value: stats.present, color: 'text-emerald-400' },
                  { label: 'Absent',  value: stats.absent,  color: 'text-red-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="p-4 rounded-xl bg-muted/40 border border-border/30 flex flex-col justify-center text-center">
                    <span className="text-xs font-medium text-muted-foreground">{label}</span>
                    <span className={`text-2xl font-bold mt-1.5 ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="section-title">Session Logs</h2>
              {logs.length === 0 ? (
                <div className="glass-card p-10 text-center text-muted-foreground text-sm">
                  <Info className="w-8 h-8 mx-auto opacity-30 mb-2" />
                  <p>No attendance sessions logged for you yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map(log => {
                    const colors: Record<string, string> = {
                      present: 'badge-green', absent: 'badge-red', late: 'badge-yellow', excused: 'badge-blue'
                    }
                    return (
                      <div key={log.id} className="glass-card p-4 flex items-center justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-foreground text-sm">{log.subject}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(log.date)}</p>
                        </div>
                        <span className={`badge ${colors[log.status]} text-xs capitalize font-semibold`}>{log.status}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function StudentAttendancePage() {
  return (
    <Suspense fallback={<AttendanceSkeleton />}>
      <StudentAttendancePageContent />
    </Suspense>
  )
}
