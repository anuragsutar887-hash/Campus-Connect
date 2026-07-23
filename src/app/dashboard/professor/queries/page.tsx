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
import { HelpCircle, Eye, X, Loader2, FileText, Trash2 } from 'lucide-react'

function ProfessorQueriesPageContent() {
  const { userProfile } = useAuth()
  const searchParams = useSearchParams()
  const urlClassId = searchParams.get('classId')

  const [classes, setClasses]               = useState<ClassWorkspace[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [queries, setQueries]               = useState<QueryType[]>([])
  const [loading, setLoading]               = useState(true)
  const [loadingQueries, setLoadingQueries] = useState(false)
  const [activeQuery, setActiveQuery]       = useState<QueryType | null>(null)
  const [replyText, setReplyText]           = useState('')
  const [newStatus, setNewStatus]           = useState<'replied' | 'resolved' | 'rejected'>('replied')
  const [submitting, setSubmitting]         = useState(false)

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
    setLoadingQueries(true)
    supabase.from('queries').select('*').eq('class_id', selectedClassId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setQueries((data ?? []).map(r => ({
          id: r.id, type: r.type, subject: r.subject, classId: r.class_id,
          studentId: r.student_id, studentName: r.student_name,
          professorId: r.professor_id, professorName: r.professor_name,
          message: r.message, attachmentUrl: r.attachment_url,
          status: r.status, reply: r.reply, repliedAt: r.replied_at, createdAt: r.created_at,
        })) as QueryType[])
        setLoadingQueries(false)
      })
  }, [selectedClassId])

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeQuery || !replyText.trim()) return
    setSubmitting(true)
    const { error } = await supabase.from('queries').update({
      reply:      replyText.trim(),
      replied_at: new Date().toISOString(),
      status:     newStatus,
    }).eq('id', activeQuery.id)

    if (error) {
      toast.error('Failed to save reply')
    } else {
      setQueries(prev => prev.map(q =>
        q.id === activeQuery.id
          ? { ...q, reply: replyText.trim(), repliedAt: new Date().toISOString(), status: newStatus }
          : q
      ))
      toast.success('Reply submitted!')
      setActiveQuery(null)
      setReplyText('')
    }
    setSubmitting(false)
  }

  const handleDeleteQuery = async (queryId: string) => {
    if (!confirm('Are you sure you want to delete this query?')) return
    const { error } = await supabase.from('queries').delete().eq('id', queryId)
    if (error) {
      toast.error('Failed to delete query')
    } else {
      setQueries(prev => prev.filter(q => q.id !== queryId))
      if (activeQuery?.id === queryId) setActiveQuery(null)
      toast.success('Query deleted successfully!')
    }
  }

  if (loading) return (
    <DashboardLayout title="Student Queries">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout title="Student Queries">
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Student Queries</h1>
            <p className="text-sm text-muted-foreground mt-1">Review and reply to doubts, corrections, and requests from students</p>
          </div>
          <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="input-field max-w-xs">
            {classes.map(c => <option key={c.id} value={c.id}>{c.subject} ({c.division})</option>)}
          </select>
        </div>

        {loadingQueries ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="glass-card h-20 shimmer rounded-xl" />)}</div>
        ) : queries.length === 0 ? (
          <div className="glass-card p-16 text-center text-muted-foreground">
            <HelpCircle className="w-12 h-12 mx-auto opacity-30 mb-4" />
            <p className="font-semibold text-foreground">No queries raised</p>
            <p className="text-sm mt-1">Students haven&apos;t raised any query tickets yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {queries.map(q => {
              const statusColors: Record<string, string> = {
                open: 'badge-yellow', 'in-review': 'badge-blue',
                replied: 'badge-green', resolved: 'badge-green', rejected: 'badge-red'
              }
              return (
                <div key={q.id} className="glass-card p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="badge badge-purple text-xxs">{q.type}</span>
                      <div className="flex items-center gap-2">
                        <span className={`badge ${statusColors[q.status]} text-xxs capitalize font-semibold`}>{q.status}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteQuery(q.id) }}
                          className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete query"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-semibold text-foreground text-sm truncate">{q.subject}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{q.message}</p>
                    <p className="text-xxs text-muted-foreground">Student: {q.studentName} · {formatDate(q.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => { setActiveQuery(q); setNewStatus('replied'); setReplyText(q.reply || '') }}
                    className="btn-primary w-full justify-center text-xs py-2"
                  >
                    <Eye className="w-3.5 h-3.5" /> View & Reply
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {activeQuery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="badge badge-purple text-xxs">{activeQuery.type}</span>
                <h2 className="text-base font-semibold mt-1">{activeQuery.subject}</h2>
                <p className="text-xxs text-muted-foreground mt-0.5">Raised by: {activeQuery.studentName}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDeleteQuery(activeQuery.id)}
                  className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Delete query"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={() => setActiveQuery(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="space-y-4 max-h-[20rem] overflow-y-auto pr-1">
              <div className="bg-muted/40 p-4 rounded-xl space-y-2">
                <div className="flex justify-between text-xxs text-muted-foreground">
                  <span>Student Message</span><span>{formatDateTime(activeQuery.createdAt)}</span>
                </div>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{activeQuery.message}</p>
                {activeQuery.attachmentUrl && (
                  <a href={activeQuery.attachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 font-semibold pt-1">
                    <FileText className="w-4 h-4" /> Download Attached Support File
                  </a>
                )}
              </div>
            </div>
            <form onSubmit={handleReplySubmit} className="space-y-4 pt-2 border-t border-border">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Your Reply *</label>
                <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Enter your explanation or resolution..." required rows={3} className="input-field" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Update Status</label>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value as any)} className="input-field">
                  <option value="replied">Replied (Keep open)</option>
                  <option value="resolved">Resolved (Close)</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setActiveQuery(null)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Response'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default function ProfessorQueriesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <ProfessorQueriesPageContent />
    </Suspense>
  )
}
