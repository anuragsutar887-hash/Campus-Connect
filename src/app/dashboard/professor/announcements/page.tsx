'use client'
export const dynamic = 'force-dynamic'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { ClassWorkspace, Announcement } from '@/lib/types'
import { formatDate, timeAgo } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Megaphone, Plus, Trash2, Pin, X, Loader2, FileText
} from 'lucide-react'

function ProfessorAnnouncementsPageContent() {
  const { userProfile } = useAuth()
  const searchParams = useSearchParams()
  const urlClassId = searchParams.get('classId')

  const [classes, setClasses]                   = useState<ClassWorkspace[]>([])
  const [selectedClassId, setSelectedClassId]   = useState<string>('')
  const [announcements, setAnnouncements]       = useState<Announcement[]>([])
  const [loading, setLoading]                   = useState(true)
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false)
  const [showCreate, setShowCreate]             = useState(false)
  const [creating, setCreating]                 = useState(false)
  const [form, setForm] = useState({ title: '', body: '', pinned: false })
  const [selectedFile, setSelectedFile]         = useState<File | null>(null)
  const [uploadProgress, setUploadProgress]     = useState(0)

  // ── Load professor's classes ───────────────────────────────────────────────
  useEffect(() => {
    if (!userProfile?.uid) return
    supabase
      .from('classes')
      .select('*')
      .eq('professor_id', userProfile.uid)
      .then(({ data, error }) => {
        if (error) { toast.error('Failed to load classes'); return }
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

  // ── Load announcements for selected class ──────────────────────────────────
  useEffect(() => {
    if (!selectedClassId) return
    setLoadingAnnouncements(true)
    supabase
      .from('announcements')
      .select('*')
      .eq('class_id', selectedClassId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { toast.error('Failed to load announcements'); return }
        setAnnouncements((data ?? []).map(r => ({
          id: r.id, title: r.title, body: r.body,
          attachmentUrl: r.attachment_url, pinned: r.pinned,
          createdBy: r.created_by, createdByName: r.created_by_name,
          createdAt: r.created_at,
        })) as Announcement[])
        setLoadingAnnouncements(false)
      })
  }, [selectedClassId])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('File size exceeds 10MB limit'); return }
    setSelectedFile(file)
  }

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClassId || !userProfile) return
    setCreating(true)
    setUploadProgress(0)

    let attachmentUrl = ''

    // Upload file to Supabase Storage if selected
    if (selectedFile) {
      const filePath = `announcements/${selectedClassId}/${Date.now()}_${selectedFile.name}`
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('campus-files')
        .upload(filePath, selectedFile, { upsert: false })
      if (uploadErr) {
        toast.error('File upload failed: ' + uploadErr.message)
        setCreating(false)
        return
      }
      const { data: urlData } = supabase.storage.from('campus-files').getPublicUrl(filePath)
      attachmentUrl = urlData.publicUrl
    }

    const { data, error } = await supabase
      .from('announcements')
      .insert([{
        class_id:        selectedClassId,
        title:           form.title,
        body:            form.body,
        attachment_url:  attachmentUrl,
        pinned:          form.pinned,
        created_by:      userProfile.uid,
        created_by_name: userProfile.name,
      }])
      .select()
      .single()

    if (error) {
      toast.error('Failed to post announcement')
    } else {
      const newAnn = {
        id: data.id, title: data.title, body: data.body,
        attachmentUrl: data.attachment_url, pinned: data.pinned,
        createdBy: data.created_by, createdByName: data.created_by_name,
        createdAt: data.created_at,
      } as Announcement
      setAnnouncements(prev => {
        const list = [newAnn, ...prev]
        list.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1
          if (!a.pinned && b.pinned) return 1
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })
        return list
      })
      toast.success('Announcement posted!')
      setShowCreate(false)
      setForm({ title: '', body: '', pinned: false })
      setSelectedFile(null)
    }
    setCreating(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this announcement?')) return
    const { error } = await supabase.from('announcements').delete().eq('id', id)
    if (error) { toast.error('Failed to delete'); return }
    setAnnouncements(prev => prev.filter(a => a.id !== id))
    toast.success('Deleted')
  }

  if (loading) return (
    <DashboardLayout title="Announcements">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout title="Announcements">
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Announcements</h1>
            <p className="text-sm text-muted-foreground mt-1">Broadcast updates, schedules and alerts to your classes</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="input-field max-w-xs"
            >
              {classes.map(c => <option key={c.id} value={c.id}>{c.subject} ({c.division})</option>)}
            </select>
            <button onClick={() => setShowCreate(true)} disabled={!selectedClassId} className="btn-primary">
              <Plus className="w-4 h-4" /> New Announcement
            </button>
          </div>
        </div>

        {loadingAnnouncements ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="glass-card h-28 shimmer rounded-xl" />)}
          </div>
        ) : announcements.length === 0 ? (
          <div className="glass-card p-16 text-center text-muted-foreground">
            <Megaphone className="w-12 h-12 mx-auto opacity-30 mb-4" />
            <p className="font-semibold text-foreground">No announcements yet</p>
            <p className="text-sm mt-1">Share schedules or resources with your class.</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
              <Plus className="w-4 h-4" /> New Announcement
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map(ann => (
              <div key={ann.id} className={`announcement-card relative group ${ann.pinned ? 'border-l-4 border-l-yellow-500' : 'border-l-4 border-l-brand-500'}`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground text-sm">{ann.title}</h3>
                      {ann.pinned && (
                        <span className="badge badge-yellow text-xxs flex items-center gap-1">
                          <Pin className="w-3 h-3" /> Pinned
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{ann.createdByName} · {timeAgo(ann.createdAt)}</p>
                  </div>
                  <button onClick={() => handleDelete(ann.id)} className="text-muted-foreground hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{ann.body}</p>
                {ann.attachmentUrl && (
                  <div className="mt-3">
                    <a href={ann.attachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 font-semibold">
                      <FileText className="w-4 h-4" /> Download Attached Material
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Post Announcement</h2>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handlePostAnnouncement} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Title *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Schedule Change for Friday Lecture" required className="input-field" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Message Body *</label>
                <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} placeholder="Type details here..." required rows={4} className="input-field" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Attachment (Optional, max 10MB)</label>
                <input type="file" onChange={handleFileChange} className="input-field" />
              </div>
              {creating && selectedFile && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs"><span>Uploading...</span><span>{uploadProgress}%</span></div>
                  <div className="w-full bg-muted h-1 rounded-full"><div className="bg-brand-500 h-1 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} /></div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="pinned" checked={form.pinned} onChange={e => setForm(p => ({ ...p, pinned: e.target.checked }))} className="rounded border-border w-4 h-4 cursor-pointer" />
                <label htmlFor="pinned" className="text-sm font-medium cursor-pointer flex items-center gap-1 select-none">
                  <Pin className="w-3.5 h-3.5 text-yellow-400" /> Pin to top
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={creating} className="btn-primary flex-1">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default function ProfessorAnnouncementsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <ProfessorAnnouncementsPageContent />
    </Suspense>
  )
}
