'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { ClassWorkspace } from '@/lib/types'
import { toast } from 'sonner'
import { BookOpen, Plus, Users, ChevronRight, X, Loader2, Key } from 'lucide-react'
import Link from 'next/link'
import { CardSkeleton } from '@/components/ui/Skeleton'

export default function StudentClassesPage() {
  const { userProfile } = useAuth()
  const [classes, setClasses]     = useState<ClassWorkspace[]>([])
  const [loading, setLoading]     = useState(true)
  const [showJoin, setShowJoin]   = useState(false)
  const [joining, setJoining]     = useState(false)
  const [joinCode, setJoinCode]   = useState('')

  const uid = userProfile?.uid

  // ── Load enrolled classes (dependent on uid only, avoids infinite loops/lag) ──
  useEffect(() => {
    if (!uid) return
    setLoading(true)
    supabase.from('classes').select('*')
      .contains('students', [uid])
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast.error('Failed to load classes')
        } else {
          setClasses((data ?? []).map(r => ({
            id: r.id, subject: r.subject, name: r.name, department: r.department,
            year: r.year, division: r.division, semester: r.semester, college: r.college,
            professorId: r.professor_id, professorName: r.professor_name,
            joinCode: r.join_code, students: r.students ?? [], createdAt: r.created_at,
          })) as ClassWorkspace[])
        }
        setLoading(false)
      })
  }, [uid])

  // ── Join class with code ──
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uid || !userProfile) return
    const code = joinCode.trim().toUpperCase()
    if (!code) return
    setJoining(true)

    // Find class by join code
    const { data: found, error: findErr } = await supabase
      .from('classes').select('*').eq('join_code', code).single()

    if (findErr || !found) {
      toast.error('Invalid join code — class not found')
      setJoining(false)
      return
    }

    const existingStudents: string[] = found.students ?? []
    if (existingStudents.includes(uid)) {
      toast.error('You are already enrolled in this class')
      setJoining(false)
      return
    }

    // Add student to class
    const updatedStudents = Array.from(new Set([...existingStudents, uid]))
    const { error: updateErr } = await supabase
      .from('classes').update({ students: updatedStudents }).eq('id', found.id)

    if (updateErr) {
      toast.error('Failed to join class')
    } else {
      // Also sync user's joined_classes in Supabase users table
      const userJoined = Array.from(new Set([...(userProfile.joinedClasses || []), found.id]))
      await supabase.from('users').update({ joined_classes: userJoined }).eq('uid', uid)

      const enrolledClass = {
        id: found.id, subject: found.subject, name: found.name,
        department: found.department, year: found.year, division: found.division,
        semester: found.semester, college: found.college,
        professorId: found.professor_id, professorName: found.professor_name,
        joinCode: found.join_code, students: updatedStudents, createdAt: found.created_at,
      } as ClassWorkspace

      setClasses(prev => [enrolledClass, ...prev])
      toast.success(`Successfully enrolled in ${found.subject}!`)
      setShowJoin(false)
      setJoinCode('')
    }
    setJoining(false)
  }

  return (
    <DashboardLayout title="My Classes">
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">My Classes</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {loading ? 'Loading enrolled classes...' : `Enrolled in ${classes.length} class${classes.length !== 1 ? 'es' : ''}`}
            </p>
          </div>
          <button onClick={() => setShowJoin(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Join Class
          </button>
        </div>

        {loading ? (
          <CardSkeleton count={3} height="h-40" />
        ) : classes.length === 0 ? (
          <div className="glass-card p-16 text-center space-y-4">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground opacity-30" />
            <p className="text-foreground font-medium">No classes yet</p>
            <p className="text-muted-foreground text-sm">Join a class using a code from your professor.</p>
            <button onClick={() => setShowJoin(true)} className="btn-primary"><Plus className="w-4 h-4" /> Join Class</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {classes.map(cls => (
              <Link key={cls.id} href={`/dashboard/student/classes/${cls.id}`}
                className="glass-card p-5 space-y-4 hover:border-brand-500/30 transition-all block group">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-brand-400" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-brand-400 transition-colors" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground truncate">{cls.subject}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Prof. {cls.professorName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{cls.department} · {cls.year}</p>
                  <p className="text-xs text-muted-foreground">Sem {cls.semester} · Div {cls.division}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    <span>{cls.students?.length || 0} students</span>
                  </div>
                  <span className="badge badge-gray text-xs">{cls.year}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Join Modal */}
      {showJoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Join Class</h2>
              <button onClick={() => setShowJoin(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Key className="w-4 h-4 text-brand-400" /> Join Code *
                </label>
                <input
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. A2B4CD"
                  required
                  className="input-field font-mono text-center text-lg uppercase tracking-widest"
                  maxLength={6}
                />
                <p className="text-xs text-muted-foreground">Ask your professor for the 6-character class code.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowJoin(false)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={joining} className="btn-primary flex-1">
                  {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
