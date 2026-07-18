'use client'
export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { ClassWorkspace, UserProfile, AttendanceRecord } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { CalendarCheck, Users, Loader2, Pencil, CheckSquare, Square, CheckCircle2 } from 'lucide-react'

// ── Skeleton ─────────────────────────────────────────────────────────────────
function AttendanceSkeleton() {
  return (
    <DashboardLayout title="Attendance">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="shimmer h-6 w-44 rounded-lg" />
            <div className="shimmer h-4 w-56 rounded-lg" />
          </div>
          <div className="flex gap-3">
            <div className="shimmer h-10 w-44 rounded-lg" />
            <div className="shimmer h-10 w-36 rounded-lg" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card p-4 flex items-center gap-4">
              <div className="shimmer h-5 w-5 rounded" />
              <div className="space-y-1.5 flex-1">
                <div className="shimmer h-4 w-40 rounded-lg" />
                <div className="shimmer h-3 w-24 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}

function ProfessorAttendancePageContent() {
  const { userProfile } = useAuth()
  const searchParams = useSearchParams()
  const urlClassId = searchParams.get('classId')

  const [classes, setClasses]                 = useState<ClassWorkspace[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [students, setStudents]               = useState<UserProfile[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading]                 = useState(true)
  const [loadingClassData, setLoadingClassData] = useState(false)

  // ── Marking / Editing state ───────────────────────────────────────────────
  const [isMarking, setIsMarking]             = useState(false)
  const [editingRecord, setEditingRecord]     = useState<AttendanceRecord | null>(null)
  const [markingDate, setMarkingDate]         = useState(new Date().toISOString().split('T')[0])
  // present UIDs — everyone else is absent
  const [presentSet, setPresentSet]           = useState<Set<string>>(new Set())
  const [submitting, setSubmitting]           = useState(false)

  // ── Load classes ─────────────────────────────────────────────────────────
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

  // ── Load students + attendance records when class changes ─────────────────
  useEffect(() => {
    if (!selectedClassId) return
    setLoadingClassData(true)
    const activeClass = classes.find(c => c.id === selectedClassId)
    const studentIds: string[] = activeClass?.students ?? []

    Promise.all([
      studentIds.length
        ? supabase.from('users').select('*').in('uid', studentIds)
        : Promise.resolve({ data: [] }),
      supabase.from('attendance').select('*').eq('class_id', selectedClassId)
        .order('date', { ascending: false }),
    ]).then(([studRes, attRes]) => {
      const studentList = ((studRes as any).data ?? []).map((r: any) => ({
        uid: r.uid, name: r.name, email: r.email, role: r.role,
        rollNumber: r.roll_number, college: r.college, department: r.department,
      })) as UserProfile[]
      setStudents(studentList)
      // All students default to present
      setPresentSet(new Set(studentList.map(s => s.uid)))

      setAttendanceRecords(((attRes as any).data ?? []).map((r: any) => ({
        id: r.id, date: r.date, subject: r.subject,
        professorId: r.professor_id, professorName: r.professor_name,
        classId: r.class_id, records: r.records ?? {},
        lectureNumber: r.lecture_number,
        createdAt: r.created_at,
      })) as AttendanceRecord[])
      setLoadingClassData(false)
    })
  }, [selectedClassId, classes])

  // ── Toggle individual student present / absent ────────────────────────────
  const toggleStudent = (uid: string) => {
    setPresentSet(prev => {
      const next = new Set(prev)
      if (next.has(uid)) next.delete(uid)
      else next.add(uid)
      return next
    })
  }

  // ── Select / deselect all ─────────────────────────────────────────────────
  const toggleAll = () => {
    if (presentSet.size === students.length) setPresentSet(new Set())
    else setPresentSet(new Set(students.map(s => s.uid)))
  }

  const openMarkingPanel = () => {
    // Check if attendance already exists for today
    const alreadyMarked = attendanceRecords.find(
      r => r.date === markingDate && r.classId === selectedClassId
    )
    if (alreadyMarked) {
      toast.error(`Attendance already marked for ${formatDate(markingDate)}. Use Edit to correct it.`)
      return
    }
    setEditingRecord(null)
    setPresentSet(new Set(students.map(s => s.uid)))
    setIsMarking(true)
  }

  const openEditPanel = (rec: AttendanceRecord) => {
    setEditingRecord(rec)
    setMarkingDate(rec.date)
    // Rebuild present set from existing records
    const presentUids = new Set(
      Object.entries(rec.records)
        .filter(([, status]) => status === 'present')
        .map(([uid]) => uid)
    )
    setPresentSet(presentUids)
    setIsMarking(true)
  }

  // ── Build records object: present / absent only ───────────────────────────
  const buildRecords = () => {
    const records: Record<string, 'present' | 'absent'> = {}
    students.forEach(s => {
      records[s.uid] = presentSet.has(s.uid) ? 'present' : 'absent'
    })
    return records
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClassId || !userProfile) return
    setSubmitting(true)
    const records = buildRecords()
    const activeClass = classes.find(c => c.id === selectedClassId)

    if (editingRecord) {
      // Update via server proxy to bypass RLS
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'attendance',
          method: 'update',
          data: { records },
          filters: [{ col: 'id', val: editingRecord.id }],
        }),
      })
      const json = await res.json()
      if (json.error) {
        toast.error('Failed to update attendance')
      } else {
        setAttendanceRecords(prev => prev.map(r =>
          r.id === editingRecord.id ? { ...r, records } : r
        ))
        toast.success('Attendance updated!')
        setIsMarking(false)
        setEditingRecord(null)
      }
    } else {
      // Insert via server proxy to bypass RLS
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'attendance',
          method: 'insert',
          data: [{
            class_id:       selectedClassId,
            date:           markingDate,
            subject:        activeClass?.subject ?? '',
            professor_id:   userProfile.uid,
            professor_name: userProfile.name,
            records,
          }],
        }),
      })
      const json = await res.json()
      if (json.error) {
        toast.error('Failed to record attendance')
      } else {
        const presentCount = Object.values(records).filter(v => v === 'present').length
        setAttendanceRecords(prev => [{
          id: crypto.randomUUID(), date: markingDate,
          subject: activeClass?.subject ?? '',
          professorId: userProfile.uid, professorName: userProfile.name,
          classId: selectedClassId, records, createdAt: new Date().toISOString(),
        } as AttendanceRecord, ...prev])
        toast.success(`Attendance saved! ${presentCount}/${students.length} present`)
        setIsMarking(false)
      }
    }
    setSubmitting(false)
  }

  if (loading) return <AttendanceSkeleton />

  const presentCount = presentSet.size
  const totalCount   = students.length
  const allPresent   = presentCount === totalCount

  return (
    <DashboardLayout title="Attendance">
      <div className="space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Attendance Tracker</h1>
            <p className="text-sm text-muted-foreground mt-1">Mark daily attendance and view past records</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="input-field max-w-xs">
              {classes.map(c => <option key={c.id} value={c.id}>{c.subject} ({c.division})</option>)}
            </select>
            {!isMarking && (
              <button onClick={openMarkingPanel} disabled={!selectedClassId || students.length === 0} className="btn-primary">
                <CalendarCheck className="w-4 h-4" /> Mark Attendance
              </button>
            )}
          </div>
        </div>

        {loadingClassData ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="glass-card h-16 shimmer rounded-xl" />)}</div>
        ) : students.length === 0 ? (
          <div className="glass-card p-16 text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto opacity-30 mb-4" />
            <p className="font-semibold text-foreground">No students in this class</p>
            <p className="text-sm mt-1">Students join using the class join code.</p>
          </div>
        ) : isMarking ? (

          /* ── Attendance Marking Form ─────────────────────────────────── */
          <form onSubmit={handleSave} className="glass-card p-6 space-y-5 animate-fade-in">
            {/* Date picker */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-foreground">Session Date</label>
                <input
                  type="date"
                  value={markingDate}
                  onChange={e => setMarkingDate(e.target.value)}
                  required
                  disabled={!!editingRecord}
                  className="input-field w-auto"
                />
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">
                  {presentCount} / {totalCount} Present
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {totalCount - presentCount} absent
                </p>
              </div>
            </div>

            {/* Select-all toggle */}
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-foreground">Student Roster</h3>
              <button type="button" onClick={toggleAll}
                className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1.5 transition-colors">
                {allPresent
                  ? <><Square className="w-4 h-4" /> Mark All Absent</>
                  : <><CheckSquare className="w-4 h-4" /> Mark All Present</>
                }
              </button>
            </div>

            {/* Student list */}
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {students.map((s, idx) => {
                const isPresent = presentSet.has(s.uid)
                return (
                  <label
                    key={s.uid}
                    htmlFor={`student-${s.uid}`}
                    className={`flex items-center gap-4 p-3.5 rounded-xl border cursor-pointer transition-all select-none ${
                      isPresent
                        ? 'bg-emerald-500/8 border-emerald-500/30 hover:bg-emerald-500/12'
                        : 'bg-red-500/5 border-red-500/20 hover:bg-red-500/8'
                    }`}
                  >
                    {/* Hidden real checkbox */}
                    <input
                      type="checkbox"
                      id={`student-${s.uid}`}
                      checked={isPresent}
                      onChange={() => toggleStudent(s.uid)}
                      className="sr-only"
                    />
                    {/* Custom checkbox */}
                    <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                      isPresent ? 'bg-emerald-500 border-emerald-500' : 'bg-transparent border-muted-foreground/40'
                    }`}>
                      {isPresent && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                    {/* Student info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Roll No: {s.rollNumber || '—'}
                      </p>
                    </div>
                    {/* Status badge */}
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex-shrink-0 ${
                      isPresent ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                    }`}>
                      {isPresent ? 'Present' : 'Absent'}
                    </span>
                  </label>
                )
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-border">
              <button type="button" onClick={() => { setIsMarking(false); setEditingRecord(null) }} className="btn-ghost flex-1">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary flex-1">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingRecord ? 'Update Attendance' : 'Save Attendance'}
              </button>
            </div>
          </form>

        ) : (

          /* ── Past Records List ──────────────────────────────────────── */
          <div className="space-y-4">
            <h2 className="section-title">Past Attendance Records</h2>
            {attendanceRecords.length === 0 ? (
              <div className="glass-card p-10 text-center text-muted-foreground text-sm">
                <CalendarCheck className="w-8 h-8 mx-auto opacity-30 mb-2" />
                <p>No attendance recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {attendanceRecords.map(rec => {
                  const values = Object.values(rec.records)
                  const presentCnt = values.filter(v => v === 'present').length
                  const pct = values.length > 0 ? Math.round((presentCnt / values.length) * 100) : 0
                  return (
                    <div key={rec.id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-foreground text-sm">{formatDate(rec.date)}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Prof. {rec.professorName} · {values.length} students
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-sm font-bold text-foreground">{presentCnt}/{values.length} Present</span>
                          <p className="text-xxs text-muted-foreground mt-0.5">{pct}% attendance</p>
                        </div>
                        <div className="w-16 bg-muted h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full ${pct >= 75 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <button
                          onClick={() => openEditPanel(rec)}
                          className="btn-ghost p-2 rounded-lg text-muted-foreground hover:text-foreground border border-border"
                          title="Edit this attendance record"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function ProfessorAttendancePage() {
  return (
    <Suspense fallback={<AttendanceSkeleton />}>
      <ProfessorAttendancePageContent />
    </Suspense>
  )
}
