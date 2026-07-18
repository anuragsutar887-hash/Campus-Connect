'use client'
export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { ClassWorkspace, Meeting } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { Video, Calendar, Clock, Link as LinkIcon, Info, CheckCircle2, Ban } from 'lucide-react'
import { toast } from 'sonner'

// ── Skeleton loader ──────────────────────────────────────────────────────────
function MeetingsSkeleton() {
  return (
    <DashboardLayout title="Meetings">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="shimmer h-6 w-36 rounded-lg" />
            <div className="shimmer h-4 w-64 rounded-lg" />
          </div>
          <div className="shimmer h-10 w-48 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card p-5 space-y-3">
              <div className="shimmer h-5 w-48 rounded-lg" />
              <div className="shimmer h-3 w-full rounded-lg" />
              <div className="flex gap-4">
                <div className="shimmer h-3 w-24 rounded-lg" />
                <div className="shimmer h-3 w-16 rounded-lg" />
              </div>
              <div className="shimmer h-9 w-full rounded-xl mt-2" />
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}

function StudentMeetingsPageContent() {
  const { userProfile } = useAuth()
  const searchParams = useSearchParams()
  const urlClassId = searchParams.get('classId')

  const [classes, setClasses]               = useState<ClassWorkspace[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [meetings, setMeetings]             = useState<Meeting[]>([])
  const [loading, setLoading]               = useState(true)
  const [loadingMeetings, setLoadingMeetings] = useState(false)
  const [completedClickId, setCompletedClickId] = useState<string | null>(null)

  const uid = userProfile?.uid

  // ── Load enrolled classes ────────────────────────────────────────────────
  useEffect(() => {
    if (!uid) return
    supabase.from('classes').select('*')
      .contains('students', [uid])
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { toast.error('Failed to load classes'); setLoading(false); return }
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
  }, [uid, urlClassId])

  // ── Load meetings for selected class ────────────────────────────────────
  useEffect(() => {
    if (!selectedClassId) return
    setLoadingMeetings(true)
    supabase.from('meetings').select('*')
      .eq('class_id', selectedClassId)
      .order('date', { ascending: false }).order('time', { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error('Failed to load meetings')
        else setMeetings((data ?? []).map(r => ({
          id: r.id, title: r.title, date: r.date, time: r.time,
          meetingLink: r.meeting_link, agenda: r.agenda,
          createdBy: r.created_by, createdByName: r.created_by_name,
          createdAt: r.created_at, classId: r.class_id,
        })) as Meeting[])
        setLoadingMeetings(false)
      })
  }, [selectedClassId])

  if (loading) return <MeetingsSkeleton />

  const now       = new Date()
  const upcoming  = meetings.filter(m => new Date(`${m.date}T${m.time}`) > now)
  const completed = meetings.filter(m => new Date(`${m.date}T${m.time}`) <= now)

  return (
    <DashboardLayout title="Meetings">
      <div className="space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Class Meetings</h1>
            <p className="text-sm text-muted-foreground mt-1">Join online lectures, interactive tutorials, or office hours</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground font-semibold">Select Class:</label>
            <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="input-field max-w-xs">
              {classes.length === 0
                ? <option value="">No enrolled classes</option>
                : classes.map(c => (
                  <option key={c.id} value={c.id}>{c.subject} (Prof. {c.professorName.split(' ').slice(-1)[0]})</option>
                ))}
            </select>
          </div>
        </div>

        {classes.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <Video className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-4" />
            <p className="text-foreground font-medium">Not enrolled in any classes</p>
            <p className="text-muted-foreground text-sm mt-1">Join a class to view scheduled meetings.</p>
          </div>
        ) : loadingMeetings ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card p-5 space-y-3">
                <div className="shimmer h-5 w-48 rounded-lg" />
                <div className="shimmer h-3 w-full rounded-lg" />
                <div className="flex gap-4">
                  <div className="shimmer h-3 w-24 rounded-lg" />
                  <div className="shimmer h-3 w-16 rounded-lg" />
                </div>
                <div className="shimmer h-9 w-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : meetings.length === 0 ? (
          <div className="glass-card p-10 text-center text-muted-foreground text-sm">
            <Info className="w-8 h-8 mx-auto opacity-30 mb-2" />
            <p>No meetings scheduled for this class yet.</p>
          </div>
        ) : (
          <div className="space-y-8">

            {/* ── Upcoming ──────────────────────────────────────────────── */}
            {upcoming.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse inline-block" />
                  Upcoming ({upcoming.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcoming.map(m => (
                    <div key={m.id}
                      className="glass-card p-5 flex flex-col justify-between gap-4 border hover:border-brand-500/20 transition-all">
                      <div className="space-y-2">
                        <h3 className="font-semibold text-foreground text-sm truncate">{m.title}</h3>
                        {m.agenda && <p className="text-xs text-muted-foreground line-clamp-2">{m.agenda}</p>}
                        <div className="flex items-center gap-4 text-xxs text-muted-foreground pt-1">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDate(m.date)}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {m.time}</span>
                        </div>
                        <p className="text-xxs text-muted-foreground">Scheduled by Prof. {m.createdByName}</p>
                      </div>
                      <a href={m.meetingLink} target="_blank" rel="noopener noreferrer"
                        className="btn-primary justify-center text-xs py-2">
                        <LinkIcon className="w-3.5 h-3.5" /> Join Meeting
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Completed ─────────────────────────────────────────────── */}
            {completed.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Completed ({completed.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completed.map(m => (
                    <div key={m.id}
                      className="glass-card p-5 flex flex-col justify-between gap-4 opacity-70 border-border/40">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <h3 className="font-semibold text-foreground text-sm truncate">{m.title}</h3>
                          <span className="badge badge-green text-[10px] py-0.5 px-2 flex-shrink-0 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Completed
                          </span>
                        </div>
                        {m.agenda && <p className="text-xs text-muted-foreground line-clamp-2">{m.agenda}</p>}
                        <div className="flex items-center gap-4 text-xxs text-muted-foreground pt-1">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDate(m.date)}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {m.time}</span>
                        </div>
                        <p className="text-xxs text-muted-foreground">Scheduled by Prof. {m.createdByName}</p>
                      </div>
                      {/* Disabled join button */}
                      <button
                        onClick={() => setCompletedClickId(m.id)}
                        className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold
                          bg-muted/50 text-muted-foreground border border-border cursor-not-allowed opacity-60"
                      >
                        <Ban className="w-3.5 h-3.5" /> Meeting Ended
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Completed meeting info modal ────────────────────────────────────── */}
      {completedClickId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setCompletedClickId(null)}>
          <div className="glass-card w-full max-w-sm p-6 text-center space-y-4 animate-fade-in"
            onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Meeting Completed</h3>
              <p className="text-sm text-muted-foreground mt-1">
                This meeting has already ended. The join link is no longer active.
              </p>
            </div>
            <button onClick={() => setCompletedClickId(null)} className="btn-ghost w-full">Close</button>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default function StudentMeetingsPage() {
  return (
    <Suspense fallback={<MeetingsSkeleton />}>
      <StudentMeetingsPageContent />
    </Suspense>
  )
}
