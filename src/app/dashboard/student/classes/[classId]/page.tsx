'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { supabase } from '@/lib/supabase'
import { ClassWorkspace, UserProfile } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import {
  BookOpen, Users, FileText, ClipboardList, CalendarCheck,
  Megaphone, Video, MessageCircle, HelpCircle, ArrowLeft, GraduationCap
} from 'lucide-react'
import Link from 'next/link'

export default function StudentClassWorkspacePage() {
  const { classId } = useParams<{ classId: string }>()
  const router = useRouter()
  const [cls, setCls] = useState<ClassWorkspace | null>(null)
  const [classmates, setClassmates] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!classId) return
    async function load() {
      try {
        // Fetch class from Supabase
        const { data: classRow, error: classErr } = await supabase
          .from('classes')
          .select('*')
          .eq('id', classId)
          .single()

        if (classErr || !classRow) {
          router.replace('/dashboard/student/classes')
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

        // Fetch enrolled classmates from Supabase users table
        const studentUids: string[] = classRow.students ?? []
        if (studentUids.length > 0) {
          const { data: userRows } = await supabase
            .from('users')
            .select('*')
            .in('uid', studentUids)

          if (userRows) {
            const list = userRows.map(r => ({
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
            setClassmates(list)
          }
        }
      } catch (err) {
        console.error('Error loading class data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [classId, router])

  const modules = [
    { label: 'Notes & Resources', href: `/dashboard/student/notes?classId=${classId}`, icon: FileText, color: 'text-purple-400', bg: 'bg-purple-500/15' },
    { label: 'Assignments', href: `/dashboard/student/assignments?classId=${classId}`, icon: ClipboardList, color: 'text-yellow-400', bg: 'bg-yellow-500/15' },
    { label: 'Attendance', href: `/dashboard/student/attendance?classId=${classId}`, icon: CalendarCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
    { label: 'Announcements', href: `/dashboard/student/announcements?classId=${classId}`, icon: Megaphone, color: 'text-red-400', bg: 'bg-red-500/15' },
    { label: 'Class Chat', href: `/dashboard/student/chat?classId=${classId}`, icon: MessageCircle, color: 'text-pink-400', bg: 'bg-pink-500/15' },
    { label: 'Ask a Doubt / Query', href: `/dashboard/student/queries?classId=${classId}`, icon: HelpCircle, color: 'text-brand-400', bg: 'bg-brand-500/15' },
    { label: 'Meetings', href: `/dashboard/student/meetings?classId=${classId}`, icon: Video, color: 'text-blue-400', bg: 'bg-blue-500/15' },
  ]

  if (loading) return (
    <DashboardLayout title="Class Workspace">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout title={cls?.subject}>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/student/classes" className="btn-ghost p-2">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">{cls?.subject}</h1>
            <p className="text-sm text-muted-foreground">
              Prof. {cls?.professorName} · {cls?.department} · Division {cls?.division}
            </p>
          </div>
        </div>

        {/* Class info bar */}
        <div className="glass-card p-4 flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground"><strong>{cls?.students?.length || 0}</strong> classmates enrolled</span>
          </div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground">{cls?.year} · {cls?.semester}</span>
          </div>
          <span className="text-xs text-muted-foreground ml-auto">
            Joined {cls?.createdAt ? formatDate(cls.createdAt) : '—'}
          </span>
        </div>

        {/* Modules Grid */}
        <div>
          <h2 className="section-title mb-4">Class Modules</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
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

        {/* Classmates list */}
        <div>
          <h2 className="section-title mb-4">Classmates ({cls?.students?.length || 0})</h2>
          {classmates.length === 0 ? (
            <div className="glass-card p-8 text-center text-muted-foreground text-sm">
              {cls?.students?.length ?? 0 > 0
                ? 'Classmates enrolled, loading profile roster...'
                : 'No other classmates are registered in this class yet.'}
            </div>
          ) : (
            <div className="glass-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">#</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Name</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Roll No.</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Branch</th>
                  </tr>
                </thead>
                <tbody>
                  {classmates.map((s, i) => (
                    <tr key={s.uid} className="border-b border-border/50 hover:bg-white/3 transition-colors">
                      <td className="p-4 text-muted-foreground">{i + 1}</td>
                      <td className="p-4 font-medium text-foreground">{s.name}</td>
                      <td className="p-4 text-muted-foreground text-xs">{s.rollNumber || '—'}</td>
                      <td className="p-4 text-muted-foreground text-xs">{s.department || cls?.department}</td>
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
