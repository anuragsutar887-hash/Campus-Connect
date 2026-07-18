'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { supabase } from '@/lib/supabase'
import { ClassWorkspace, UserProfile } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import {
  BookOpen, Users, FileText, ClipboardList, CalendarCheck,
  Megaphone, Video, Key, Copy, Trash2, ArrowLeft, UserX
} from 'lucide-react'
import Link from 'next/link'

// ── Skeleton for this page while class data loads ──────────────────────────
function ClassDetailSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <div className="shimmer w-9 h-9 rounded-lg" />
        <div className="space-y-1.5">
          <div className="shimmer h-6 w-48 rounded-lg" />
          <div className="shimmer h-3 w-64 rounded-lg" />
        </div>
      </div>

      {/* Info bar */}
      <div className="glass-card p-4 flex flex-wrap items-center gap-4">
        <div className="shimmer h-5 w-24 rounded-lg" />
        <div className="shimmer h-5 w-20 rounded-lg" />
        <div className="shimmer h-5 w-28 rounded-lg ml-auto" />
      </div>

      {/* Module grid */}
      <div>
        <div className="shimmer h-5 w-32 rounded-lg mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="glass-card p-5 space-y-3">
              <div className="shimmer w-10 h-10 rounded-xl" />
              <div className="shimmer h-4 w-28 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Students */}
      <div>
        <div className="shimmer h-5 w-28 rounded-lg mb-4" />
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border flex gap-8">
            {['#','Name','Email','Roll No.'].map(h => (
              <div key={h} className="shimmer h-3 w-16 rounded" />
            ))}
          </div>
          {[1,2,3].map(i => (
            <div key={i} className="p-4 border-b border-border/50 flex gap-8 items-center">
              <div className="shimmer h-3 w-4 rounded" />
              <div className="shimmer h-4 w-28 rounded" />
              <div className="shimmer h-3 w-36 rounded" />
              <div className="shimmer h-3 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ClassWorkspacePage() {
  const { classId } = useParams<{ classId: string }>()
  const router = useRouter()
  const [cls, setCls]         = useState<ClassWorkspace | null>(null)
  const [students, setStudents] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!classId) return

    async function load() {
      try {
        // ── Fetch class from Supabase ──────────────────────────────────────
        const { data: classRow, error: classErr } = await supabase
          .from('classes')
          .select('*')
          .eq('id', classId)
          .single()

        if (classErr || !classRow) {
          router.replace('/dashboard/professor/classes')
          return
        }

        const classData: ClassWorkspace = {
          id:            classRow.id,
          subject:       classRow.subject,
          name:          classRow.name,
          department:    classRow.department,
          year:          classRow.year,
          division:      classRow.division,
          semester:      classRow.semester,
          college:       classRow.college,
          professorId:   classRow.professor_id,
          professorName: classRow.professor_name,
          joinCode:      classRow.join_code,
          students:      classRow.students ?? [],
          createdAt:     classRow.created_at,
        }
        setCls(classData)

        // ── Fetch enrolled student profiles from Supabase ─────────────────
        // (Students write their profile to Supabase on sign-up, so we read from there)
        const studentUids: string[] = classRow.students ?? []
        if (studentUids.length > 0) {
          const { data: profileRows } = await supabase
            .from('users')
            .select('*')
            .in('uid', studentUids)

          setStudents(
            (profileRows ?? []).map(r => ({
              uid:         r.uid,
              name:        r.name,
              email:       r.email,
              role:        r.role,
              college:     r.college,
              department:  r.department,
              rollNumber:  r.roll_number,
              employeeId:  r.employee_id,
              photoURL:    r.photo_url,
              joinedClasses: r.joined_classes ?? [],
              createdAt:   r.created_at,
            })) as UserProfile[]
          )
        }
      } catch (err) {
        console.error('Class detail load error:', err)
        toast.error('Failed to load class data')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [classId, router])

  const copyCode = () => {
    navigator.clipboard.writeText(cls?.joinCode || '')
    toast.success('Join code copied!')
  }

  const removeStudent = async (uid: string, name: string) => {
    if (!cls) return
    if (!confirm(`Remove ${name} from this class?`)) return

    const updatedStudents = cls.students.filter(id => id !== uid)
    const { error } = await supabase
      .from('classes')
      .update({ students: updatedStudents })
      .eq('id', classId)

    if (error) {
      toast.error('Failed to remove student')
      return
    }

    setStudents(prev => prev.filter(s => s.uid !== uid))
    setCls(prev => prev ? { ...prev, students: updatedStudents } : null)
    toast.success(`${name} removed from class`)
  }

  const modules = [
    { label: 'Notes & Resources', href: `/dashboard/professor/notes?classId=${classId}`,        icon: FileText,    color: 'text-purple-400', bg: 'bg-purple-500/15' },
    { label: 'Assignments',       href: `/dashboard/professor/assignments?classId=${classId}`,  icon: ClipboardList, color: 'text-yellow-400', bg: 'bg-yellow-500/15' },
    { label: 'Attendance',        href: `/dashboard/professor/attendance?classId=${classId}`,   icon: CalendarCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
    { label: 'Announcements',     href: `/dashboard/professor/announcements?classId=${classId}`,icon: Megaphone,   color: 'text-red-400',    bg: 'bg-red-500/15' },
    { label: 'Meetings',          href: `/dashboard/professor/meetings?classId=${classId}`,     icon: Video,       color: 'text-blue-400',   bg: 'bg-blue-500/15' },
    { label: 'Student Queries',   href: `/dashboard/professor/queries?classId=${classId}`,      icon: Users,       color: 'text-brand-400',  bg: 'bg-brand-500/15' },
  ]

  // ── Show skeleton while loading ───────────────────────────────────────────
  if (loading) {
    return (
      <DashboardLayout title="Class Workspace">
        <ClassDetailSkeleton />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title={cls?.subject}>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/professor/classes" className="btn-ghost p-2">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">{cls?.subject}</h1>
            <p className="text-sm text-muted-foreground">{cls?.department} · {cls?.year} · Division {cls?.division} · {cls?.semester}</p>
          </div>
        </div>

        {/* Class info bar */}
        <div className="glass-card p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            {/* Use cls.students.length for count (includes newly joined students) */}
            <span className="text-sm text-foreground"><strong>{cls?.students?.length ?? 0}</strong> Students</span>
          </div>
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-mono font-bold text-brand-400">{cls?.joinCode}</span>
            <button onClick={copyCode} className="text-muted-foreground hover:text-foreground transition-colors">
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-xs text-muted-foreground ml-auto">
            Created {cls?.createdAt ? formatDate(cls.createdAt) : '—'}
          </span>
        </div>

        {/* Module Grid */}
        <div>
          <h2 className="section-title mb-4">Class Modules</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {modules.map(m => (
              <Link key={m.label} href={m.href}
                className="glass-card p-5 space-y-3 hover:border-brand-500/30 transition-all block group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${m.bg}`}>
                  <m.icon className={`w-5 h-5 ${m.color}`} />
                </div>
                <p className="text-sm font-medium text-foreground group-hover:text-brand-400 transition-colors">{m.label}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Student List */}
        <div>
          {/* Show student count from cls.students array — always in sync with DB */}
          <h2 className="section-title mb-4">Students ({cls?.students?.length ?? 0})</h2>
          {students.length === 0 ? (
            <div className="glass-card p-8 text-center text-muted-foreground text-sm space-y-2">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              {cls?.students?.length ?? 0 > 0
                ? <p>Students have joined but profile data is still loading.</p>
                : <>
                    <p>No students yet. Share join code <strong className="text-brand-400">{cls?.joinCode}</strong> with your class.</p>
                  </>}
            </div>
          ) : (
            <div className="glass-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">#</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Name</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Email</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Roll No.</th>
                    <th className="p-4" />
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr key={s.uid} className="border-b border-border/50 hover:bg-white/3 transition-colors">
                      <td className="p-4 text-muted-foreground">{i + 1}</td>
                      <td className="p-4 font-medium text-foreground">{s.name}</td>
                      <td className="p-4 text-muted-foreground text-xs">{s.email}</td>
                      <td className="p-4 text-muted-foreground text-xs">{s.rollNumber || '—'}</td>
                      <td className="p-4">
                        <button onClick={() => removeStudent(s.uid, s.name)}
                          className="text-muted-foreground hover:text-red-400 transition-colors">
                          <UserX className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
