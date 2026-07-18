'use client'
export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { ClassWorkspace, Meeting } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Video, Plus, Trash2, Calendar, Clock, Link as LinkIcon,
  X, Loader2, CheckCircle2, Ban
} from 'lucide-react'

// ── Helper: has meeting already passed? ───────────────────────────────────────
function isMeetingCompleted(date: string, time: string): boolean {
  return new Date(`${date}T${time}`) < new Date()
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function MeetingsSkeleton() {
  return (
    <DashboardLayout title="Meetings">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="shimmer h-6 w-36 rounded-lg" />
            <div className="shimmer h-4 w-56 rounded-lg" />
          </div>
          <div className="flex gap-3">
            <div className="shimmer h-10 w-44 rounded-lg" />
            <div className="shimmer h-10 w-40 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card h-40 shimmer rounded-xl" />
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}

function ProfessorMeetingsPageContent() {
  const { userProfile } = useAuth()
  const searchParams = useSearchParams()
  const urlClassId = searchParams.get('classId')

  const [classes, setClasses]               = useState<ClassWorkspace[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [meetings, setMeetings]             = useState<Meeting[]>([])
  const [loading, setLoading]               = useState(true)
  const [loadingMeetings, setLoadingMeetings] = useState(false)
  const [showCreate, setShowCreate]         = useState(false)
  const [creating, setCreating]             = useState(false)
  const [completedClickId, setCompletedClickId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', date: '', time: '', meetingLink: '', agenda: '' })

  useEffect(() => {
    if (!userProfile?.uid) return
    supabase.from('classes').select('*').eq('professor_id', userProfile.uid)
      .then(({ data }) => {
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
    if (!selectedClassId) return
    setLoadingMeetings(true)
    supabase.from('meetings').select('*').eq('class_id', selectedClassId)
      .order('date', { ascending: false }).order('time', { ascending: false })
      .then(({ data }) => {
        setMeetings((data ?? []).map(r => ({
          id: r.id, title: r.title, date: r.date, time: r.time,
          meetingLink: r.meeting_link, agenda: r.agenda,
          createdBy: r.created_by, createdByName: r.created_by_name,
          createdAt: r.created_at, classId: r.class_id,
        })) as Meeting[])
        setLoadingMeetings(false)
      })
  }, [selectedClassId])

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClassId || !userProfile) return
    setCreating(true)
    const { data, error } = await supabase.from('meetings').insert([{
      class_id:        selectedClassId,
      title:           form.title,
      date:            form.date,
      time:            form.time,
      meeting_link:    form.meetingLink,
      agenda:          form.agenda || '',
      created_by:      userProfile.uid,
      created_by_name: userProfile.name,
    }]).select().single()

    if (error) {
      toast.error('Failed to schedule meeting')
    } else {
      const newMtg = {
        id: data.id, title: data.title, date: data.date, time: data.time,
        meetingLink: data.meeting_link, agenda: data.agenda,
        createdBy: data.created_by, createdByName: data.created_by_name,
        createdAt: data.created_at, classId: data.class_id,
      } as Meeting
      setMeetings(prev => [newMtg, ...prev])
      toast.success('Meeting scheduled!')
      setShowCreate(false)
      setForm({ title: '', date: '', time: '', meetingLink: '', agenda: '' })
    }
    setCreating(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Cancel this meeting?')) return
    const { error } = await supabase.from('meetings').delete().eq('id', id)
    if (error) { toast.error('Failed to cancel'); return }
    setMeetings(prev => prev.filter(m => m.id !== id))
    toast.success('Meeting cancelled')
  }

  if (loading) return <MeetingsSkeleton />

  // Split into upcoming and completed
  const now = new Date()
  const upcoming  = meetings.filter(m => new Date(`${m.date}T${m.time}`) > now)
  const completed = meetings.filter(m => new Date(`${m.date}T${m.time}`) <= now)

  return (
    <DashboardLayout title="Meetings">
      <div className="space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Class Meetings</h1>
            <p className="text-sm text-muted-foreground mt-1">Schedule lectures, viva sessions or doubt resolving meets</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="input-field max-w-xs">
              {classes.map(c => <option key={c.id} value={c.id}>{c.subject} ({c.division})</option>)}
            </select>
            <button onClick={() => setShowCreate(true)} disabled={!selectedClassId} className="btn-primary">
              <Plus className="w-4 h-4" /> Schedule Meeting
            </button>
          </div>
        </div>

        {loadingMeetings ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="glass-card h-28 shimmer rounded-xl" />)}</div>
        ) : meetings.length === 0 ? (
          <div className="glass-card p-16 text-center text-muted-foreground">
            <Video className="w-12 h-12 mx-auto opacity-30 mb-4" />
            <p className="font-semibold text-foreground">No meetings scheduled</p>
            <p className="text-sm mt-1">Schedule live online classes or interactive sessions.</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
              <Plus className="w-4 h-4" /> Schedule Meeting
            </button>
          </div>
        ) : (
          <div className="space-y-8">

            {/* ── Upcoming ────────────────────────────────────────────── */}
            {upcoming.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse inline-block" />
                  Upcoming ({upcoming.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcoming.map(m => (
                    <div key={m.id} className="glass-card p-5 flex flex-col justify-between gap-4 border-brand-500/10">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold text-foreground text-sm truncate pr-2">{m.title}</h3>
                          <button onClick={() => handleDelete(m.id)} className="text-muted-foreground hover:text-red-400 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {m.agenda && <p className="text-xs text-muted-foreground line-clamp-2">{m.agenda}</p>}
                        <div className="flex items-center gap-4 text-xxs text-muted-foreground pt-1">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDate(m.date)}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {m.time}</span>
                        </div>
                      </div>
                      <a href={m.meetingLink} target="_blank" rel="noopener noreferrer"
                        className="btn-primary justify-center text-xs py-2">
                        <LinkIcon className="w-3.5 h-3.5" /> Join Live Class
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Completed ───────────────────────────────────────────── */}
            {completed.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Completed ({completed.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completed.map(m => (
                    <div key={m.id}
                      className="glass-card p-5 flex flex-col justify-between gap-4 opacity-75 border-border/40"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2 min-w-0">
                            <h3 className="font-semibold text-foreground text-sm truncate">{m.title}</h3>
                            <span className="badge badge-green text-[10px] py-0.5 px-2 flex-shrink-0 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Completed
                            </span>
                          </div>
                          <button onClick={() => handleDelete(m.id)} className="text-muted-foreground hover:text-red-400 p-1 flex-shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {m.agenda && <p className="text-xs text-muted-foreground line-clamp-2">{m.agenda}</p>}
                        <div className="flex items-center gap-4 text-xxs text-muted-foreground pt-1">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDate(m.date)}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {m.time}</span>
                        </div>
                      </div>

                      {/* Disabled join button with tooltip */}
                      <div className="relative">
                        <button
                          disabled
                          onClick={() => setCompletedClickId(m.id)}
                          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold
                            bg-muted/50 text-muted-foreground border border-border cursor-not-allowed opacity-60"
                        >
                          <Ban className="w-3.5 h-3.5" /> Meeting Ended
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Completed-meeting click toast modal ───────────────────────────── */}
      {completedClickId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setCompletedClickId(null)}>
          <div className="glass-card w-full max-w-sm p-6 text-center space-y-4 animate-fade-in" onClick={e => e.stopPropagation()}>
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

      {/* ── Schedule meeting modal ────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Schedule Live Session</h2>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleScheduleMeeting} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Session Title *</label>
                <input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))}
                  placeholder="e.g. Unit 3 Revision & Doubt Solving" required className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Date *</label>
                  <input type="date" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} required className="input-field" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Time *</label>
                  <input type="time" value={form.time} onChange={e => setForm(p => ({...p, time: e.target.value}))} required className="input-field" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Meeting URL (Zoom/GMeet/Teams) *</label>
                <input type="url" value={form.meetingLink} onChange={e => setForm(p => ({...p, meetingLink: e.target.value}))}
                  placeholder="https://meet.google.com/abc-defg-hij" required className="input-field" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Agenda / Notes</label>
                <textarea value={form.agenda} onChange={e => setForm(p => ({...p, agenda: e.target.value}))}
                  placeholder="Write topics to cover..." rows={3} className="input-field" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={creating} className="btn-primary flex-1">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default function ProfessorMeetingsPage() {
  return (
    <Suspense fallback={<MeetingsSkeleton />}>
      <ProfessorMeetingsPageContent />
    </Suspense>
  )
}
