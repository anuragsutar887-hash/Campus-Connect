'use client'
export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { ClassWorkspace, Announcement } from '@/lib/types'
import { formatDate, timeAgo } from '@/lib/utils'
import { Megaphone, Pin, FileText, Info } from 'lucide-react'
import { toast } from 'sonner'

// ── Skeleton loader ───────────────────────────────────────────────────────────
function AnnouncementsSkeleton() {
  return (
    <DashboardLayout title="Announcements">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="shimmer h-6 w-36 rounded-lg" />
            <div className="shimmer h-4 w-64 rounded-lg" />
          </div>
          <div className="shimmer h-10 w-48 rounded-lg" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card p-5 border-l-4 border-l-brand-500/30 space-y-3">
              <div className="flex items-center gap-2">
                <div className="shimmer h-5 w-48 rounded-lg" />
                <div className="shimmer h-4 w-14 rounded-full" />
              </div>
              <div className="shimmer h-3 w-32 rounded-lg" />
              <div className="shimmer h-3 w-full rounded-lg" />
              <div className="shimmer h-3 w-4/5 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}

function StudentAnnouncementsPageContent() {
  const { userProfile } = useAuth()
  const searchParams = useSearchParams()
  const urlClassId = searchParams.get('classId')

  const [classes, setClasses]                   = useState<ClassWorkspace[]>([])
  const [selectedClassId, setSelectedClassId]   = useState<string>('')
  const [announcements, setAnnouncements]       = useState<Announcement[]>([])
  const [loading, setLoading]                   = useState(true)
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false)

  const uid = userProfile?.uid

  // ── Load enrolled classes from Supabase ───────────────────────────────────
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

  // ── Load announcements for selected class from Supabase ───────────────────
  useEffect(() => {
    if (!selectedClassId) return
    setLoadingAnnouncements(true)
    supabase.from('announcements').select('*')
      .eq('class_id', selectedClassId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error('Failed to load announcements')
        else setAnnouncements((data ?? []).map(r => ({
          id: r.id, title: r.title, body: r.body,
          attachmentUrl: r.attachment_url,
          pinned: r.pinned,
          createdBy: r.created_by,
          createdByName: r.created_by_name,
          createdAt: r.created_at,
        })) as Announcement[])
        setLoadingAnnouncements(false)
      })
  }, [selectedClassId])

  if (loading) return <AnnouncementsSkeleton />

  return (
    <DashboardLayout title="Announcements">
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Announcements</h1>
            <p className="text-sm text-muted-foreground mt-1">Read class updates and broadcasts from your professors</p>
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
            <Megaphone className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-4" />
            <p className="text-foreground font-medium">Not enrolled in any classes</p>
            <p className="text-muted-foreground text-sm mt-1">Join a class to read announcements and updates.</p>
          </div>
        ) : loadingAnnouncements ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card p-5 border-l-4 border-l-brand-500/30 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="shimmer h-5 w-48 rounded-lg" />
                  <div className="shimmer h-4 w-14 rounded-full" />
                </div>
                <div className="shimmer h-3 w-32 rounded-lg" />
                <div className="shimmer h-3 w-full rounded-lg" />
                <div className="shimmer h-3 w-4/5 rounded-lg" />
              </div>
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="glass-card p-10 text-center text-muted-foreground text-sm">
            <Info className="w-8 h-8 mx-auto opacity-30 mb-2" />
            <p>No announcements posted for this class yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map(ann => (
              <div
                key={ann.id}
                className={`announcement-card ${ann.pinned
                  ? 'border-l-4 border-l-yellow-500 bg-yellow-500/2'
                  : 'border-l-4 border-l-brand-500'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground text-sm">{ann.title}</h3>
                      {ann.pinned && (
                        <span className="badge badge-yellow text-xxs flex items-center gap-1">
                          <Pin className="w-3.5 h-3.5" /> Pinned
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{ann.createdByName} · {timeAgo(ann.createdAt)}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{ann.body}</p>
                {ann.attachmentUrl && (
                  <div className="mt-3">
                    <a href={ann.attachmentUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 font-semibold">
                      <FileText className="w-4 h-4" /> Download Attached Document
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function StudentAnnouncementsPage() {
  return (
    <Suspense fallback={<AnnouncementsSkeleton />}>
      <StudentAnnouncementsPageContent />
    </Suspense>
  )
}
