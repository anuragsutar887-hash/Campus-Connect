'use client'
export const dynamic = 'force-dynamic'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { ClassWorkspace, Assignment, Submission } from '@/lib/types'
import { formatDate, formatDateTime, isDeadlinePassed, daysUntilDeadline } from '@/lib/utils'
import { toast } from 'sonner'
import { ClipboardList, X, Loader2, FileText, Download } from 'lucide-react'
import { uploadFile } from '@/lib/upload'

// ── Skeleton loader ──────────────────────────────────────────────────────────
function AssignmentsSkeleton() {
  return (
    <DashboardLayout title="Assignments">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="shimmer h-6 w-32 rounded-lg" />
            <div className="shimmer h-4 w-56 rounded-lg" />
          </div>
          <div className="shimmer h-10 w-48 rounded-lg" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <div className="shimmer h-5 w-48 rounded-lg" />
                  <div className="shimmer h-5 w-16 rounded-full" />
                </div>
                <div className="shimmer h-3 w-full rounded-lg" />
                <div className="shimmer h-3 w-2/3 rounded-lg" />
                <div className="shimmer h-3 w-32 rounded-lg" />
              </div>
              <div className="shimmer h-10 w-36 rounded-xl flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}

function StudentAssignmentsPageContent() {
  const { userProfile } = useAuth()
  const searchParams = useSearchParams()
  const urlClassId = searchParams.get('classId')

  const [classes, setClasses]               = useState<ClassWorkspace[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [assignments, setAssignments]       = useState<Assignment[]>([])
  const [submissions, setSubmissions]       = useState<Record<string, Submission>>({})
  const [loading, setLoading]               = useState(true)
  const [loadingAssignments, setLoadingAssignments] = useState(false)
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submitting, setSubmitting]         = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile]     = useState<File | null>(null)
  const [comment, setComment]               = useState('')

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
    setLoadingAssignments(true)
    Promise.all([
      supabase.from('assignments').select('*').eq('class_id', selectedClassId).order('created_at', { ascending: false }),
      supabase.from('submissions').select('*').eq('student_id', userProfile.uid),
    ]).then(([asgRes, subRes]) => {
      const asgList = ((asgRes as any).data ?? []).map((r: any) => ({
        id: r.id, title: r.title, instructions: r.instructions,
        subject: r.subject, dueDate: r.due_date,
        attachmentUrl: r.attachment_url, attachmentName: r.attachment_name,
        createdBy: r.created_by, createdByName: r.created_by_name,
        createdAt: r.created_at, status: r.status, classId: r.class_id,
      })) as Assignment[]
      setAssignments(asgList)

      const subMap: Record<string, Submission> = {}
      ;((subRes as any).data ?? []).forEach((r: any) => {
        subMap[r.assignment_id] = {
          studentId: r.student_id, studentName: r.student_name,
          fileUrl: r.file_url, fileName: r.file_name, comment: r.comment,
          submittedAt: r.submitted_at, status: r.status, marks: r.marks, remarks: r.remarks,
        } as Submission
      })
      setSubmissions(subMap)
      setLoadingAssignments(false)
    })
  }, [selectedClassId, userProfile])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('File exceeds 10MB'); return }
    setSelectedFile(file)
  }

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClassId || !activeAssignment || !selectedFile || !userProfile) return
    setSubmitting(true)
    setUploadProgress(10)

    let fileUrl = ''
    try {
      // Upload via server-side API route — bypasses Supabase RLS
      const path = `submissions/${selectedClassId}/${activeAssignment.id}/${userProfile.uid}_`
      fileUrl = await uploadFile(selectedFile, path)
    } catch (err: any) {
      toast.error(err?.message ?? 'Upload failed')
      setSubmitting(false)
      setUploadProgress(0)
      return
    }
    setUploadProgress(70)
    const passed = isDeadlinePassed(activeAssignment.dueDate)

    const { error: subErr } = await supabase.from('submissions').upsert([{
      assignment_id: activeAssignment.id,
      student_id:    userProfile.uid,
      student_name:  userProfile.name,
      file_url:      fileUrl,
      file_name:     selectedFile.name,
      comment:       comment || '',
      status:        passed ? 'late' : 'submitted',
    }])

    setUploadProgress(100)
    if (subErr) {
      toast.error('Failed to record submission')
    } else {
      setSubmissions(prev => ({
        ...prev,
        [activeAssignment.id]: {
          studentId: userProfile.uid, studentName: userProfile.name,
          fileUrl, fileName: selectedFile.name, comment,
          submittedAt: new Date().toISOString(), status: passed ? 'late' : 'submitted',
        } as Submission
      }))
      toast.success('Assignment submitted!')
      setShowSubmitModal(false)
      setSelectedFile(null)
      setComment('')
    }
    setSubmitting(false)
    setUploadProgress(0)
  }

  if (loading) return <AssignmentsSkeleton />

  return (
    <DashboardLayout title="Assignments">
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Assignments</h1>
            <p className="text-sm text-muted-foreground mt-1">Submit your work and track grades</p>
          </div>
          <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="input-field max-w-xs">
            {classes.length === 0
              ? <option value="">No classes</option>
              : classes.map(c => <option key={c.id} value={c.id}>{c.subject} (Prof. {c.professorName.split(' ').slice(-1)[0]})</option>)}
          </select>
        </div>

        {classes.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-4" />
            <p className="text-foreground font-medium">Not enrolled in any classes</p>
          </div>
        ) : loadingAssignments ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="glass-card h-28 shimmer rounded-xl" />)}</div>
        ) : assignments.length === 0 ? (
          <div className="glass-card p-16 text-center text-muted-foreground text-sm">
            <ClipboardList className="w-10 h-10 mx-auto opacity-30 mb-2" />
            <p>No assignments posted yet 🎉</p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map(asg => {
              const sub = submissions[asg.id]
              const passed = isDeadlinePassed(asg.dueDate)
              const days = daysUntilDeadline(asg.dueDate)
              return (
                <div key={asg.id} className="glass-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground text-base">{asg.title}</h3>
                      {sub
                        ? sub.status === 'reviewed'
                          ? <span className="badge badge-green text-xs">Reviewed</span>
                          : <span className="badge badge-blue text-xs">Submitted</span>
                        : passed
                        ? <span className="badge badge-red text-xs">Overdue</span>
                        : <span className="badge badge-yellow text-xs">Pending</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{asg.instructions}</p>
                    <div className="flex gap-4 text-xxs text-muted-foreground">
                      <span>Due: {formatDateTime(asg.dueDate)}</span>
                      {!sub && !passed && (
                        <span className={days <= 2 ? 'text-yellow-400 font-semibold' : ''}>
                          {days === 0 ? 'Due today' : `${days} days left`}
                        </span>
                      )}
                    </div>
                    {asg.attachmentUrl && (
                      <a href={asg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 pt-1">
                        <FileText className="w-3.5 h-3.5" /> Download Instruction PDF
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    {sub ? (
                      <div className="glass-card bg-muted/40 p-4 border border-border/40 rounded-xl space-y-2 w-full md:w-64">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Your Submission:</span>
                          <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-400 hover:underline flex items-center gap-1">
                            File <Download className="w-3 h-3" />
                          </a>
                        </div>
                        {sub.status === 'reviewed' ? (
                          <div className="pt-1.5 border-t border-border/50">
                            <p className="text-xs text-foreground font-semibold">Marks: <span className="text-emerald-400 font-bold">{sub.marks}</span></p>
                            {sub.remarks && <p className="text-xxs text-muted-foreground mt-1">Feedback: &ldquo;{sub.remarks}&rdquo;</p>}
                          </div>
                        ) : (
                          <p className="text-xxs text-muted-foreground italic">Awaiting grading...</p>
                        )}
                      </div>
                    ) : (
                      <button onClick={() => { setActiveAssignment(asg); setShowSubmitModal(true) }} disabled={passed} className="btn-primary w-full md:w-auto">
                        Submit Assignment
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showSubmitModal && activeAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Submit Assignment</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{activeAssignment.title}</p>
              </div>
              <button onClick={() => setShowSubmitModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmitWork} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Select File *</label>
                <input type="file" onChange={handleFileChange} required className="input-field" />
                <p className="text-xxs text-muted-foreground">Max 10MB</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Comment</label>
                <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} className="input-field" />
              </div>
              {submitting && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs"><span>Uploading...</span><span>{uploadProgress}%</span></div>
                  <div className="w-full bg-muted h-1 rounded-full"><div className="bg-brand-500 h-1 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} /></div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowSubmitModal(false)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={submitting || !selectedFile} className="btn-primary flex-1">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default function StudentAssignmentsPage() {
  return (
    <Suspense fallback={<AssignmentsSkeleton />}>
      <StudentAssignmentsPageContent />
    </Suspense>
  )
}
