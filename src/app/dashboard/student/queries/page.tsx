'use client'
export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { ClassWorkspace, Query as QueryType } from '@/lib/types'
import { formatDate, formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { uploadFile } from '@/lib/upload'
import { HelpCircle, Plus, Eye, X, Loader2, FileText } from 'lucide-react'

const QUERY_TYPES = [
  'Ask Doubt',
  'Assignment Clarification',
  'Attendance Correction',
  'Request Extension',
  'Meeting Request',
  'General Academic Query',
]

// ── Skeleton loader ──────────────────────────────────────────────────────────
function QueriesSkeleton() {
  return (
    <DashboardLayout title="Academic Queries">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="shimmer h-6 w-36 rounded-lg" />
            <div className="shimmer h-4 w-72 rounded-lg" />
          </div>
          <div className="flex items-center gap-3">
            <div className="shimmer h-10 w-48 rounded-lg" />
            <div className="shimmer h-10 w-32 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card p-5 space-y-3">
              <div className="flex justify-between">
                <div className="shimmer h-4 w-24 rounded-full" />
                <div className="shimmer h-4 w-16 rounded-full" />
              </div>
              <div className="shimmer h-5 w-48 rounded-lg" />
              <div className="shimmer h-3 w-full rounded-lg" />
              <div className="shimmer h-3 w-2/3 rounded-lg" />
              <div className="shimmer h-8 w-full rounded-lg mt-2" />
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}

function StudentQueriesPageContent() {
  const { userProfile } = useAuth()
  const searchParams = useSearchParams()
  const urlClassId = searchParams.get('classId')

  const [classes, setClasses]               = useState<ClassWorkspace[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [queries, setQueries]               = useState<QueryType[]>([])
  const [loading, setLoading]               = useState(true)
  const [loadingQueries, setLoadingQueries] = useState(false)

  const [showCreate, setShowCreate]     = useState(false)
  const [creating, setCreating]         = useState(false)
  const [form, setForm]                 = useState({ type: 'Ask Doubt', subject: '', message: '' })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [activeQuery, setActiveQuery]   = useState<QueryType | null>(null)

  const uid = userProfile?.uid

  // ── Load enrolled classes from Supabase ────────────────────────────────
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

  // ── Load queries for selected class from Supabase ──────────────────────
  useEffect(() => {
    if (!selectedClassId || !uid) return
    setLoadingQueries(true)
    supabase.from('queries').select('*')
      .eq('class_id', selectedClassId)
      .eq('student_id', uid)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error('Failed to load queries')
        else setQueries((data ?? []).map(r => ({
          id: r.id, type: r.type, subject: r.subject, classId: r.class_id,
          studentId: r.student_id, studentName: r.student_name,
          professorId: r.professor_id, professorName: r.professor_name,
          message: r.message, attachmentUrl: r.attachment_url,
          status: r.status, reply: r.reply, repliedAt: r.replied_at, createdAt: r.created_at,
        })) as QueryType[])
        setLoadingQueries(false)
      })
  }, [selectedClassId, uid])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('File exceeds 10MB'); return }
    setSelectedFile(file)
  }

  // ── Submit query (with optional file upload to Supabase Storage) ────────
  const handleRaiseQuery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClassId || !userProfile) return
    const activeClass = classes.find(c => c.id === selectedClassId)
    if (!activeClass) return
    setCreating(true)
    setUploadProgress(0)

    let attachmentUrl: string | null = null

    // Upload attachment if present
    if (selectedFile) {
      try {
        const path = `queries/${selectedClassId}/${Date.now()}_`
        attachmentUrl = await uploadFile(selectedFile, path)
        setUploadProgress(60)
      } catch (err) {
        toast.error('File upload failed')
        setCreating(false)
        return
      }
    }

    // Insert query record in Supabase
    const { data: inserted, error: dbErr } = await supabase
      .from('queries')
      .insert([{
        type:           form.type,
        subject:        form.subject,
        class_id:       selectedClassId,
        student_id:     userProfile.uid,
        student_name:   userProfile.name,
        professor_id:   activeClass.professorId,
        professor_name: activeClass.professorName,
        message:        form.message,
        attachment_url: attachmentUrl,
        status:         'open',
        created_at:     new Date().toISOString(),
      }])
      .select()
      .single()

    if (dbErr) {
      toast.error('Failed to submit query')
    } else {
      const newQuery: QueryType = {
        id: inserted.id, type: inserted.type, subject: inserted.subject,
        classId: inserted.class_id, studentId: inserted.student_id,
        studentName: inserted.student_name, professorId: inserted.professor_id,
        professorName: inserted.professor_name, message: inserted.message,
        attachmentUrl: inserted.attachment_url, status: inserted.status,
        reply: inserted.reply, repliedAt: inserted.replied_at, createdAt: inserted.created_at,
      }
      setQueries(prev => [newQuery, ...prev])
      toast.success('Query submitted!')
      setShowCreate(false)
      setForm({ type: 'Ask Doubt', subject: '', message: '' })
      setSelectedFile(null)
    }
    setUploadProgress(0)
    setCreating(false)
  }

  if (loading) return <QueriesSkeleton />

  const statusColors: Record<string, string> = {
    open: 'badge-yellow',
    'in-review': 'badge-blue',
    replied: 'badge-green',
    resolved: 'badge-green',
    rejected: 'badge-red',
  }

  return (
    <DashboardLayout title="Academic Queries">
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Raise Query</h1>
            <p className="text-sm text-muted-foreground mt-1">Submit academic doubts, request extensions, or report attendance errors</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="input-field max-w-xs"
            >
              {classes.length === 0
                ? <option value="">No enrolled classes</option>
                : classes.map(c => (
                  <option key={c.id} value={c.id}>{c.subject} (Prof. {c.professorName.split(' ').slice(-1)[0]})</option>
                ))}
            </select>
            <button onClick={() => setShowCreate(true)} disabled={!selectedClassId} className="btn-primary">
              <Plus className="w-4 h-4" /> Ask a Query
            </button>
          </div>
        </div>

        {classes.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <HelpCircle className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-4" />
            <p className="text-foreground font-medium">Not enrolled in any classes</p>
            <p className="text-muted-foreground text-sm mt-1">Join a class workspace to raise queries with professors.</p>
          </div>
        ) : loadingQueries ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="glass-card p-5 space-y-3">
                <div className="flex justify-between">
                  <div className="shimmer h-4 w-24 rounded-full" />
                  <div className="shimmer h-4 w-16 rounded-full" />
                </div>
                <div className="shimmer h-5 w-48 rounded-lg" />
                <div className="shimmer h-3 w-full rounded-lg" />
                <div className="shimmer h-8 w-full rounded-lg" />
              </div>
            ))}
          </div>
        ) : queries.length === 0 ? (
          <div className="glass-card p-12 text-center text-muted-foreground text-sm">
            <HelpCircle className="w-10 h-10 mx-auto opacity-30 mb-2" />
            <p>No queries submitted yet.</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-3">
              <Plus className="w-4 h-4" /> Ask a Query
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {queries.map(q => (
              <div key={q.id} className="glass-card p-5 flex flex-col justify-between gap-4 border hover:border-brand-500/20 transition-all">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="badge badge-purple text-xxs">{q.type}</span>
                    <span className={`badge ${statusColors[q.status] || 'badge-gray'} text-xxs capitalize font-semibold`}>{q.status}</span>
                  </div>
                  <h3 className="font-semibold text-foreground text-sm truncate">{q.subject}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{q.message}</p>
                  <p className="text-xxs text-muted-foreground">Prof: {q.professorName} · {formatDate(q.createdAt)}</p>
                </div>
                <button onClick={() => setActiveQuery(q)} className="btn-ghost w-full justify-center text-xs border border-border">
                  <Eye className="w-3.5 h-3.5" /> View Discussion
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Raise Query Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Submit a Query</h2>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleRaiseQuery} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-sm font-medium">Query Type *</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} required className="input-field">
                    {QUERY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-sm font-medium">Topic / Subject *</label>
                  <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                    placeholder="e.g. extension on Experiment 3" required className="input-field" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Explain your Query *</label>
                <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  placeholder="Detail your request or query..." required rows={4} className="input-field" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Attach Supporting File (Optional)</label>
                <input type="file" onChange={handleFileChange} className="input-field"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" />
                <p className="text-xxs text-muted-foreground">Max file size: 10MB.</p>
              </div>
              {creating && selectedFile && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs"><span>Uploading...</span><span>{uploadProgress}%</span></div>
                  <div className="w-full bg-muted h-1 rounded-full">
                    <div className="bg-brand-500 h-1 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={creating} className="btn-primary flex-1">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Query'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Discussion Modal */}
      {activeQuery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="badge badge-purple text-xxs">{activeQuery.type}</span>
                <h2 className="text-base font-semibold mt-1">{activeQuery.subject}</h2>
              </div>
              <button onClick={() => setActiveQuery(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              <div className="bg-muted/40 p-4 rounded-xl space-y-2">
                <div className="flex justify-between text-xxs text-muted-foreground">
                  <span>Student: {activeQuery.studentName}</span>
                  <span>{formatDateTime(activeQuery.createdAt)}</span>
                </div>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{activeQuery.message}</p>
                {activeQuery.attachmentUrl && (
                  <a href={activeQuery.attachmentUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 font-semibold pt-1">
                    <FileText className="w-4 h-4" /> Download Attachment
                  </a>
                )}
              </div>
              {activeQuery.reply ? (
                <div className="bg-brand-500/5 border border-brand-500/20 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between text-xxs text-brand-400 font-semibold">
                    <span>Professor Reply: Prof. {activeQuery.professorName}</span>
                    <span>{activeQuery.repliedAt ? formatDateTime(activeQuery.repliedAt) : ''}</span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{activeQuery.reply}</p>
                </div>
              ) : (
                <div className="text-center p-6 text-muted-foreground text-xs italic bg-muted/20 rounded-xl">
                  Awaiting response from professor...
                </div>
              )}
            </div>
            <div className="flex pt-2">
              <button onClick={() => setActiveQuery(null)} className="btn-ghost w-full">Close discussion</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default function StudentQueriesPage() {
  return (
    <Suspense fallback={<QueriesSkeleton />}>
      <StudentQueriesPageContent />
    </Suspense>
  )
}
