'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore'
import { ClassWorkspace } from '@/lib/types'
import { Search, Trash2, ArrowLeft, Archive, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function AdminClassesPage() {
  const { userProfile } = useAuth()
  const [classes, setClasses] = useState<ClassWorkspace[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!userProfile || userProfile.role !== 'admin') return
    async function loadClasses() {
      try {
        const snap = await getDocs(collection(db, 'classes'))
        setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ClassWorkspace[])
      } catch (err) {
        console.error(err)
        toast.error('Failed to load classes')
      } finally {
        setLoading(false)
      }
    }
    loadClasses()
  }, [userProfile])

  const handleDeleteClass = async (classId: string, subject: string) => {
    if (!confirm(`Are you absolutely sure you want to delete class: ${subject}? All assignments, notes, and records inside it will remain orphaned or inaccessible. This cannot be undone.`)) return
    try {
      await deleteDoc(doc(db, 'classes', classId))
      setClasses(prev => prev.filter(c => c.id !== classId))
      toast.success(`Class ${subject} deleted`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete class')
    }
  }

  const handleToggleArchive = async (cls: ClassWorkspace) => {
    const nextArchived = !cls.archived
    try {
      await updateDoc(doc(db, 'classes', cls.id), { archived: nextArchived })
      setClasses(prev => prev.map(c => c.id === cls.id ? { ...c, archived: nextArchived } : c))
      toast.success(nextArchived ? `Class ${cls.subject} archived` : `Class ${cls.subject} unarchived`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to update class archive state')
    }
  }

  const filteredClasses = classes.filter(c =>
    c.subject.toLowerCase().includes(search.toLowerCase()) ||
    c.professorName.toLowerCase().includes(search.toLowerCase()) ||
    c.department.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <DashboardLayout title="Admin Panel">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout title="System Workspaces">
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/admin" className="btn-ghost p-2">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Manage Classes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Control active and archived classes in the college environment</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search classes by subject, professor or branch..."
            className="input-field pl-10"
          />
        </div>

        {/* Table list */}
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-white/2">
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground">Subject</th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground">Professor</th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground">Branch & Semester</th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground">Students</th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-muted-foreground text-xs">
                    No classes found.
                  </td>
                </tr>
              ) : (
                filteredClasses.map(cls => (
                  <tr key={cls.id} className="border-b border-border/50 hover:bg-white/3 transition-colors">
                    <td className="p-4 font-medium text-foreground">{cls.subject}</td>
                    <td className="p-4 text-muted-foreground text-xs">Prof. {cls.professorName}</td>
                    <td className="p-4 text-muted-foreground text-xs">{cls.department} · Div {cls.division} · Sem {cls.semester}</td>
                    <td className="p-4 text-muted-foreground text-xs">{cls.students?.length || 0} enrolled</td>
                    <td className="p-4">
                      <span className={`badge text-xs font-semibold ${cls.archived ? 'badge-red' : 'badge-green'}`}>
                        {cls.archived ? 'Archived' : 'Active'}
                      </span>
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleArchive(cls)}
                        className="btn-ghost py-1 px-2 text-xs border border-border flex items-center gap-1 hover:text-brand-400"
                        title={cls.archived ? 'Unarchive class' : 'Archive class'}
                      >
                        {cls.archived ? (
                          <><RefreshCw className="w-3 h-3" /> Restore</>
                        ) : (
                          <><Archive className="w-3 h-3" /> Archive</>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteClass(cls.id, cls.subject)}
                        className="text-muted-foreground hover:text-red-400 p-1"
                        title="Delete Class"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  )
}
