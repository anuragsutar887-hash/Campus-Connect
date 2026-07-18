'use client'
export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { ClassWorkspace, Resource } from '@/lib/types'
import { formatFileSize, formatDate } from '@/lib/utils'
import { FileText, Download, Search, Filter } from 'lucide-react'
import { toast } from 'sonner'

// ── Skeleton loader for student resources ────────────────────────────────────
function StudentNotesSkeleton() {
  return (
    <DashboardLayout title="Notes & Resources">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="shimmer h-6 w-40 rounded-lg" />
            <div className="shimmer h-4 w-64 rounded-lg" />
          </div>
          <div className="flex items-center gap-3">
            <div className="shimmer h-10 w-48 rounded-lg" />
          </div>
        </div>
        {/* Filters */}
        <div className="flex gap-4">
          <div className="shimmer h-10 flex-1 rounded-lg" />
          <div className="shimmer h-10 w-36 rounded-lg" />
        </div>
        {/* Resource grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card p-5 flex items-start gap-4">
              <div className="shimmer w-10 h-10 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="shimmer h-3 w-16 rounded-full" />
                <div className="shimmer h-4 w-48 rounded-lg" />
                <div className="shimmer h-3 w-32 rounded-lg" />
              </div>
              <div className="shimmer w-8 h-8 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}

function StudentNotesPageContent() {
  const { userProfile } = useAuth()
  const searchParams = useSearchParams()
  const urlClassId = searchParams.get('classId')

  const [classes, setClasses]               = useState<ClassWorkspace[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [resources, setResources]           = useState<Resource[]>([])
  const [loading, setLoading]               = useState(true)
  const [loadingResources, setLoadingResources] = useState(false)
  const [search, setSearch]                 = useState('')
  const [selectedType, setSelectedType]     = useState('All')

  const uid = userProfile?.uid

  // ── Load student's enrolled classes from Supabase ────────────────────────
  useEffect(() => {
    if (!uid) return
    supabase.from('classes').select('*')
      .contains('students', [uid])
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast.error('Failed to load classes')
          setLoading(false)
          return
        }
        const list = (data ?? []).map(r => ({
          id: r.id, subject: r.subject, name: r.name, department: r.department,
          year: r.year, division: r.division, semester: r.semester, college: r.college,
          professorId: r.professor_id, professorName: r.professor_name,
          joinCode: r.join_code, students: r.students ?? [], createdAt: r.created_at,
        })) as ClassWorkspace[]
        setClasses(list)

        if (list.length > 0) {
          const defaultId = urlClassId && list.some(c => c.id === urlClassId)
            ? urlClassId
            : list[0].id
          setSelectedClassId(defaultId)
        }
        setLoading(false)
      })
  }, [uid, urlClassId])

  // ── Load resources for selected class from Supabase ─────────────────────
  useEffect(() => {
    if (!selectedClassId) return
    setLoadingResources(true)
    supabase.from('resources').select('*')
      .eq('class_id', selectedClassId)
      .order('uploaded_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast.error('Failed to load study materials')
        } else {
          const activeClass = classes.find(c => c.id === selectedClassId)
          const list = (data ?? []).map(r => ({
            id: r.id,
            title: r.title,
            type: r.type as Resource['type'],
            unit: r.unit ?? undefined,
            fileUrl: r.file_url,
            fileName: r.file_name,
            fileSize: r.file_size,
            uploadedBy: r.uploaded_by,
            uploaderName: r.uploader_name,
            uploadedAt: r.uploaded_at,
            classId: r.class_id,
            subject: activeClass?.subject || 'Class Resource',
            visibility: (r.visibility as Resource['visibility']) || 'class',
          })) as Resource[]
          setResources(list)
        }
        setLoadingResources(false)
      })
  }, [selectedClassId, classes])

  const filteredResources = resources.filter(res => {
    const matchesSearch = res.title.toLowerCase().includes(search.toLowerCase())
    const matchesType = selectedType === 'All' || res.type === selectedType
    return matchesSearch && matchesType
  })

  const resourceTypes = ['All', ...Array.from(new Set(resources.map(r => r.type)))]

  if (loading) return <StudentNotesSkeleton />

  return (
    <DashboardLayout title="Notes & Resources">
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Resource Library</h1>
            <p className="text-sm text-muted-foreground mt-1">Access lecture notes, syllabus, question papers and more</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground font-semibold">Select Class:</label>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="input-field max-w-xs"
            >
              {classes.length === 0 ? (
                <option value="">No enrolled classes</option>
              ) : (
                classes.map(c => (
                  <option key={c.id} value={c.id}>{c.subject} (Prof. {c.professorName.split(' ').slice(-1)[0]})</option>
                ))
              )}
            </select>
          </div>
        </div>

        {classes.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-4" />
            <p className="text-foreground font-medium">Not enrolled in any classes</p>
            <p className="text-muted-foreground text-sm mt-1">Please join a class workspace first to access study materials.</p>
          </div>
        ) : (
          <>
            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-full sm:flex-1">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search resources by title..."
                  className="input-field pl-10"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select
                  value={selectedType}
                  onChange={e => setSelectedType(e.target.value)}
                  className="input-field"
                >
                  {resourceTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* List */}
            {loadingResources ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="glass-card p-5 flex items-start gap-4">
                    <div className="shimmer w-10 h-10 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="shimmer h-3 w-16 rounded-full" />
                      <div className="shimmer h-4 w-40 rounded-lg" />
                      <div className="shimmer h-3 w-24 rounded-lg" />
                    </div>
                    <div className="shimmer w-8 h-8 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="glass-card p-16 text-center space-y-2 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto opacity-30" />
                <p>No study materials found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredResources.map(res => (
                  <div key={res.id} className="glass-card p-5 flex items-start gap-4 hover:border-brand-500/20 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="badge badge-purple text-xxs mb-1">{res.type}</span>
                      <h3 className="font-semibold text-foreground text-sm truncate">{res.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {res.unit ? `Unit ${res.unit} · ` : ''}
                        {formatFileSize(res.fileSize)} · {formatDate(res.uploadedAt)}
                      </p>
                      <p className="text-xxs text-muted-foreground mt-1">Uploaded by: {res.uploaderName}</p>
                    </div>
                    <a
                      href={res.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost p-2 hover:text-brand-400 flex-shrink-0 self-center"
                      title="Download File"
                      download
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function StudentNotesPage() {
  return (
    <Suspense fallback={<StudentNotesSkeleton />}>
      <StudentNotesPageContent />
    </Suspense>
  )
}
