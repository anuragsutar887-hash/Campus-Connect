'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { ClassWorkspace } from '@/lib/types'
import { generateClassCode } from '@/lib/utils'
import { toast } from 'sonner'
import {
  BookOpen, Plus, Users, Key, ChevronRight, X,
  Loader2, Copy, Check, Share2
} from 'lucide-react'
import Link from 'next/link'

// Map Supabase snake_case row → ClassWorkspace camelCase
function rowToClass(row: Record<string, unknown>): ClassWorkspace {
  return {
    id:            row.id as string,
    subject:       row.subject as string,
    name:          row.name as string,
    department:    row.department as string,
    year:          row.year as string,
    division:      row.division as string,
    semester:      row.semester as string,
    college:       row.college as string,
    professorId:   row.professor_id as string,
    professorName: row.professor_name as string,
    joinCode:      row.join_code as string,
    students:      (row.students as string[]) ?? [],
    archived:      row.archived as boolean,
    createdAt:     row.created_at as string,
  }
}

// ── Join Code Success Modal ────────────────────────────────────────────────────
function JoinCodeModal({
  classData,
  onClose,
}: {
  classData: ClassWorkspace
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(classData.joinCode)
      setCopied(true)
      toast.success('Join code copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy — please copy manually')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md p-8 space-y-6 animate-fade-in text-center">
        {/* Success icon */}
        <div className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center mx-auto">
          <Check className="w-8 h-8 text-emerald-400" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold text-foreground">Class Created!</h2>
          <p className="text-sm text-muted-foreground">
            Share the join code below with your students so they can join{' '}
            <span className="font-semibold text-foreground">{classData.subject}</span>
          </p>
        </div>

        {/* Join code display — the hero element */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Student Join Code
          </p>
          <div className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-brand-500/10 border-2 border-brand-500/30">
            <span className="font-mono text-4xl font-black tracking-[0.3em] text-brand-400">
              {classData.joinCode}
            </span>
          </div>
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 ${
            copied
              ? 'bg-emerald-500 text-white'
              : 'btn-primary'
          }`}
        >
          {copied ? (
            <><Check className="w-4 h-4" /> Copied!</>
          ) : (
            <><Copy className="w-4 h-4" /> Copy Join Code</>
          )}
        </button>

        {/* Class info summary */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border">
          <p>{classData.department} · {classData.year} · Division {classData.division} · Sem {classData.semester}</p>
          {classData.college && <p>{classData.college}</p>}
        </div>

        <button
          onClick={onClose}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
        >
          Close
        </button>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ProfessorClassesPage() {
  const { userProfile } = useAuth()
  const [classes, setClasses]           = useState<ClassWorkspace[]>([])
  const [loading, setLoading]           = useState(true)
  const [showCreate, setShowCreate]     = useState(false)
  const [creating, setCreating]         = useState(false)
  const [newClass, setNewClass]         = useState<ClassWorkspace | null>(null) // triggers success modal
  const [form, setForm] = useState({
    subject: '', department: '', year: '', division: '', semester: '', college: ''
  })

  // ── Fetch professor's classes ───────────────────────────────────────────────
  useEffect(() => {
    if (!userProfile?.uid) return
    supabase
      .from('classes')
      .select('*')
      .eq('professor_id', userProfile.uid)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('[Classes] fetch error:', error.message)
          toast.error('Failed to load classes')
        } else {
          setClasses((data ?? []).map(rowToClass))
        }
        setLoading(false)
      })
  }, [userProfile])

  // ── Create class handler ────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userProfile) return
    setCreating(true)

    try {
      const row = {
        subject:        form.subject.trim(),
        name:           `${form.division.trim()} - ${form.subject.trim()}`,
        department:     form.department.trim(),
        year:           form.year,
        division:       form.division.trim(),
        semester:       form.semester,
        college:        form.college.trim() || userProfile.college || '',
        professor_id:   userProfile.uid,
        professor_name: userProfile.name,
        join_code:      generateClassCode(),
        students:       [],
      }

      const { data, error } = await supabase
        .from('classes')
        .insert([row])
        .select()
        .single()

      if (error) throw new Error(error.message)

      const created = rowToClass(data)
      setClasses(prev => [created, ...prev])
      setShowCreate(false)
      setForm({ subject: '', department: '', year: '', division: '', semester: '', college: '' })

      // Show the join code success modal
      setNewClass(created)

    } catch (err: any) {
      console.error('[Classes] create error:', err)
      toast.error(err?.message || 'Failed to create class. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <DashboardLayout title="My Classes">
      <div className="space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">My Classes</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {classes.length} active class{classes.length !== 1 ? 'es' : ''}
            </p>
          </div>
          <button
            id="create-class-modal-btn"
            onClick={() => setShowCreate(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" /> Create Class
          </button>
        </div>

        {/* Class list */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card h-40 shimmer rounded-xl" />
            ))}
          </div>
        ) : classes.length === 0 ? (
          <div className="glass-card p-16 text-center space-y-4">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground opacity-30" />
            <p className="text-foreground font-medium">No classes yet</p>
            <p className="text-muted-foreground text-sm">
              Create your first class workspace to get started.
            </p>
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Create Class
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {classes.map(cls => (
              <Link
                key={cls.id}
                href={`/dashboard/professor/classes/${cls.id}`}
                className="glass-card p-5 space-y-4 hover:border-brand-500/30 transition-all block group"
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-brand-400" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-brand-400 transition-colors" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{cls.subject}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {cls.department} · {cls.year} · Div {cls.division}
                  </p>
                  <p className="text-xs text-muted-foreground">Semester {cls.semester}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    <span>{cls.students?.length ?? 0} students</span>
                  </div>
                  {/* Join code always visible on card */}
                  <div
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-brand-500/10 cursor-pointer hover:bg-brand-500/20 transition-colors group/code"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      navigator.clipboard.writeText(cls.joinCode).then(() =>
                        toast.success(`Copied: ${cls.joinCode}`)
                      )
                    }}
                    title="Click to copy join code"
                  >
                    <Key className="w-3 h-3 text-brand-400" />
                    <span className="font-mono text-xs font-bold text-brand-400 tracking-wider">
                      {cls.joinCode}
                    </span>
                    <Copy className="w-2.5 h-2.5 text-brand-400 opacity-0 group-hover/code:opacity-100 transition-opacity" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Create Class Modal ───────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Create New Class</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-sm font-medium">Subject Name *</label>
                  <input
                    value={form.subject}
                    onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                    placeholder="e.g. Data Structures & Algorithms"
                    required
                    className="input-field"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Department *</label>
                  <input
                    value={form.department}
                    onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                    placeholder="e.g. Computer Engg."
                    required
                    className="input-field"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">College</label>
                  <input
                    value={form.college}
                    onChange={e => setForm(p => ({ ...p, college: e.target.value }))}
                    placeholder="e.g. ICEM"
                    className="input-field"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Year *</label>
                  <select
                    value={form.year}
                    onChange={e => setForm(p => ({ ...p, year: e.target.value }))}
                    required
                    className="input-field"
                  >
                    <option value="">Select Year</option>
                    {['First Year', 'Second Year', 'Third Year', 'Fourth Year'].map(y => (
                      <option key={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Division *</label>
                  <input
                    value={form.division}
                    onChange={e => setForm(p => ({ ...p, division: e.target.value }))}
                    placeholder="e.g. A, B, C"
                    required
                    className="input-field"
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-sm font-medium">Semester *</label>
                  <select
                    value={form.semester}
                    onChange={e => setForm(p => ({ ...p, semester: e.target.value }))}
                    required
                    className="input-field"
                  >
                    <option value="">Select Semester</option>
                    {['1', '2', '3', '4', '5', '6', '7', '8'].map(s => (
                      <option key={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary flex-1"
                >
                  {creating
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <><Share2 className="w-4 h-4" /> Create & Get Join Code</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Join Code Success Modal ──────────────────────────────────────────── */}
      {newClass && (
        <JoinCodeModal
          classData={newClass}
          onClose={() => setNewClass(null)}
        />
      )}
    </DashboardLayout>
  )
}
