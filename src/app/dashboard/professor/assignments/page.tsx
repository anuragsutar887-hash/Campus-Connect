'use client'
export const dynamic = 'force-dynamic'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { ClassWorkspace, Assignment, Submission, UserProfile } from '@/lib/types'
import { formatDate, formatDateTime, isDeadlinePassed } from '@/lib/utils'
import { toast } from 'sonner'
import {
  ClipboardList, Plus, X, Loader2, FileText, Download
} from 'lucide-react'

function ProfessorAssignmentsPageContent() {
  const { userProfile } = useAuth()
  const searchParams = useSearchParams()
  const urlClassId = searchParams.get('classId')

  const [classes, setClasses]                   = useState<ClassWorkspace[]>([])
  const [selectedClassId, setSelectedClassId]   = useState<string>('')
  const [assignments, setAssignments]           = useState<Assignment[]>([])
  const [loading, setLoading]                   = useState(true)
  const [loadingAssignments, setLoadingAssignments] = useState(false)
  const [showCreate, setShowCreate]             = useState(false)
  const [creating, setCreating]                 = useState(false)
  const [form, setForm] = useState({ title: '', instructions: '', dueDate: '' })
  const [selectedFile, setSelectedFile]         = useState<File | null>(null)
  const [uploadProgress, setUploadProgress]     = useState(0)
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null)
  const [submissions, setSubmissions]           = useState<Submission[]>([])
  const [classStudents, setClassStudents]       = useState<UserProfile[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  const [reviewingStudent, setReviewingStudent] = useState<Submission | null>(null)
  const [reviewForm, setReviewForm]             = useState({ marks: '', remarks: '' })
  const [submittingReview, setSubmittingReview] = useState(false)

  // ── Load classes ────────────────────────────────────────────────────────────
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

  // ── Load assignments for selected class ─────────────────────────────────────
  useEffect(() => {
    if (!selectedClassId) return
    setLoadingAssignments(true)
    setActiveAssignment(null)
    supabase.from('assignments').select('*').eq('class_id', selectedClassId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setAssignments((data ?? []).map(r => ({
          id: r.id, title: r.title, instructions: r.instructions,
          subject: r.subject, dueDate: r.due_date,
          attachmentUrl: r.attachment_url, attachmentName: r.attachment_name,
          createdBy: r.created_by, createdByName: r.created_by_name,
          createdAt: r.created_at, status: r.status, classId: r.class_id,
        })) as Assignment[])
        setLoadingAssignments(false)
      })
  }, [selectedClassId])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('File size exceeds 10MB'); return }
    setSelectedFile(file)
  }

  // ── Create assignment ────────────────────────────────────────────────────────
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClassId || !userProfile) return
    setCreating(true)

    const activeClass = classes.find(c => c.id === selectedClassId)
    let attachmentUrl = ''
    let attachmentName = ''

    if (selectedFile) {
      const filePath = `assignments/${selectedClassId}/${Date.now()}_${selectedFile.name}`
      const { error: upErr } = await supabase.storage.from('campus-files').upload(filePath, selectedFile)
      if (upErr) { toast.error('File upload failed'); setCreating(false); return }
      attachmentUrl = supabase.storage.from('campus-files').getPublicUrl(filePath).data.publicUrl
      attachmentName = selectedFile.name
    }

    const { data, error } = await supabase.from('assignments').insert([{
      class_id:        selectedClassId,
      title:           form.title,
      instructions:    form.instructions,
      subject:         activeClass?.subject ?? '',
      due_date:        form.dueDate,
      attachment_url:  attachmentUrl,
      attachment_name: attachmentName,
      created_by:      userProfile.uid,
      created_by_name: userProfile.name,
      status:          'active',
    }]).select().single()

    if (error) {
      toast.error('Failed to create assignment')
    } else {
      setAssignments(prev => [{
        id: data.id, title: data.title, instructions: data.instructions,
        subject: data.subject, dueDate: data.due_date,
        attachmentUrl: data.attachment_url, attachmentName: data.attachment_name,
        createdBy: data.created_by, createdByName: data.created_by_name,
        createdAt: data.created_at, status: data.status, classId: data.class_id,
      } as Assignment, ...prev])
      toast.success('Assignment posted!')
      setShowCreate(false)
      setForm({ title: '', instructions: '', dueDate: '' })
      setSelectedFile(null)
    }
    setCreating(false)
  }

  // ── View submissions for an assignment ───────────────────────────────────────
  const viewSubmissions = async (assignment: Assignment) => {
    setActiveAssignment(assignment)
    setLoadingSubmissions(true)
    const currentClass = classes.find(c => c.id === selectedClassId)
    const studentIds = currentClass?.students ?? []

    const [{ data: studentsData }, { data: subsData }] = await Promise.all([
      supabase.from('users').select('*').in('uid', studentIds.length ? studentIds : ['__none__']),
      supabase.from('submissions').select('*').eq('assignment_id', assignment.id),
    ])

    setClassStudents((studentsData ?? []).map(r => ({
      uid: r.uid, name: r.name, email: r.email, role: r.role,
      rollNumber: r.roll_number, college: r.college, department: r.department,
    })) as UserProfile[])

    setSubmissions((subsData ?? []).map(r => ({
      studentId: r.student_id, studentName: r.student_name,
      fileUrl: r.file_url, fileName: r.file_name, comment: r.comment,
      submittedAt: r.submitted_at, status: r.status,
      marks: r.marks, remarks: r.remarks,
    })) as Submission[])
    setLoadingSubmissions(false)
  }

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeAssignment || !reviewingStudent) return
    const marksVal = Number(reviewForm.marks)

    if (isNaN(marksVal) || marksVal < 0 || marksVal > 10) {
      toast.error('Marks must be between 0 and 10')
      return
    }

    setSubmittingReview(true)

    const res = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'submissions',
        method: 'update',
        data: { marks: marksVal, remarks: reviewForm.remarks, status: 'reviewed' },
        filters: [
          { col: 'assignment_id', val: activeAssignment.id },
          { col: 'student_id', val: reviewingStudent.studentId },
        ]
      })
    })

    const json = await res.json()

    if (!res.ok || json.error) {
      toast.error('Failed to save grade')
    } else {
      setSubmissions(prev => prev.map(s =>
        s.studentId === reviewingStudent.studentId
          ? { ...s, marks: marksVal, remarks: reviewForm.remarks, status: 'reviewed' }
          : s
      ))
      toast.success('Grade saved successfully!')
      setReviewingStudent(null)
      setReviewForm({ marks: '', remarks: '' })
    }
    setSubmittingReview(false)
  }

  if (loading) return (
    <DashboardLayout title="Assignments">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout title="Assignments">
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Assignments</h1>
            <p className="text-sm text-muted-foreground mt-1">Create assignments and review student submissions</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="input-field max-w-xs">
              {classes.map(c => <option key={c.id} value={c.id}>{c.subject} ({c.division})</option>)}
            </select>
            <button onClick={() => setShowCreate(true)} disabled={!selectedClassId} className="btn-primary">
              <Plus className="w-4 h-4" /> Create Assignment
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <h2 className="section-title">Assignment History</h2>
            {loadingAssignments ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="glass-card h-24 shimmer rounded-xl" />)}</div>
            ) : assignments.length === 0 ? (
              <div className="glass-card p-10 text-center text-muted-foreground text-sm space-y-2">
                <ClipboardList className="w-8 h-8 mx-auto opacity-30" />
                <p>No assignments posted yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map(asg => {
                  const passed = isDeadlinePassed(asg.dueDate)
                  const isSelected = activeAssignment?.id === asg.id
                  return (
                    <button key={asg.id} onClick={() => viewSubmissions(asg)}
                      className={`w-full text-left glass-card p-4 space-y-2 transition-all block border ${isSelected ? 'border-brand-500/60 bg-brand-500/5' : 'hover:border-white/10'}`}>
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-foreground text-sm truncate pr-2">{asg.title}</h3>
                        <span className={`badge text-xxs ${passed ? 'badge-red' : 'badge-green'}`}>{passed ? 'Closed' : 'Active'}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{asg.instructions}</p>
                      <div className="text-xxs text-muted-foreground pt-1 border-t border-white/5 flex justify-between">
                        <span>Due: {formatDate(asg.dueDate)}</span>
                        <span>Posted: {formatDate(asg.createdAt)}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h2 className="section-title">Submissions & Grading</h2>
            {!activeAssignment ? (
              <div className="glass-card p-16 text-center text-muted-foreground text-sm space-y-3">
                <ClipboardList className="w-12 h-12 mx-auto opacity-20" />
                <p>Select an assignment to view submissions</p>
              </div>
            ) : loadingSubmissions ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="glass-card h-16 shimmer rounded-xl" />)}</div>
            ) : (
              <div className="glass-card p-5 space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{activeAssignment.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Due: {formatDateTime(activeAssignment.dueDate)}</p>
                  {activeAssignment.attachmentUrl && (
                    <a href={activeAssignment.attachmentUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 mt-2">
                      <FileText className="w-3.5 h-3.5" /> {activeAssignment.attachmentName}
                    </a>
                  )}
                </div>
                <div className="border-t border-border pt-4">
                  <h4 className="text-sm font-semibold text-foreground mb-3">Students ({classStudents.length})</h4>
                  <div className="space-y-3">
                    {classStudents.map(student => {
                      const sub = submissions.find(s => s.studentId === student.uid)
                      return (
                        <div key={student.uid} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50 gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{student.name}</p>
                            <p className="text-xs text-muted-foreground">Roll No: {student.rollNumber || '—'}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {sub ? (
                              <>
                                <div className="text-right">
                                  {sub.status === 'reviewed'
                                    ? <span className="badge badge-green text-xs">Reviewed ({sub.marks}/10 marks)</span>
                                    : sub.status === 'late'
                                    ? <span className="badge badge-yellow text-xs">Late Submit</span>
                                    : <span className="badge badge-blue text-xs">Submitted</span>}
                                  <p className="text-xxs text-muted-foreground mt-0.5">{formatDate(sub.submittedAt)}</p>
                                </div>
                                <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost p-2 hover:text-brand-400"><Download className="w-4 h-4" /></a>
                                <button onClick={() => { setReviewingStudent(sub); setReviewForm({ marks: sub.marks ? String(sub.marks) : '', remarks: sub.remarks || '' }) }} className="btn-primary px-3 py-1.5 text-xs">Grade</button>
                              </>
                            ) : <span className="badge badge-red text-xs">No Submission</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Post Assignment</h2>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Title *</label>
                <input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} placeholder="e.g. Lab 3 - SQL Queries" required className="input-field" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Instructions *</label>
                <textarea value={form.instructions} onChange={e => setForm(p => ({...p, instructions: e.target.value}))} placeholder="Assignment guidelines..." required rows={4} className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Due Date & Time *</label>
                  <input type="datetime-local" value={form.dueDate} onChange={e => setForm(p => ({...p, dueDate: e.target.value}))} required className="input-field" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Attachment (Optional)</label>
                  <input type="file" onChange={handleFileChange} className="input-field" />
                </div>
              </div>
              {creating && selectedFile && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs"><span>Uploading...</span><span>{uploadProgress}%</span></div>
                  <div className="w-full bg-muted h-1 rounded-full"><div className="bg-brand-500 h-1 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} /></div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={creating} className="btn-primary flex-1">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reviewingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Grade Submission</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Student: {reviewingStudent.studentName}</p>
              </div>
              <button onClick={() => setReviewingStudent(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex justify-between">
                  <span>Marks (Out of 10) *</span>
                  <span className="text-xs text-muted-foreground font-mono">0 - 10</span>
                </label>
                <input
                  type="number"
                  value={reviewForm.marks}
                  onChange={e => setReviewForm(p => ({...p, marks: e.target.value}))}
                  placeholder="e.g. 8.5"
                  required
                  min={0}
                  max={10}
                  step="0.5"
                  className="input-field"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Remarks</label>
                <textarea value={reviewForm.remarks} onChange={e => setReviewForm(p => ({...p, remarks: e.target.value}))} rows={3} className="input-field" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setReviewingStudent(null)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={submittingReview} className="btn-primary flex-1">
                  {submittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Grade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default function ProfessorAssignmentsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <ProfessorAssignmentsPageContent />
    </Suspense>
  )
}
