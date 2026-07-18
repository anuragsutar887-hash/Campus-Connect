'use client'
export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { ClassWorkspace, Resource } from '@/lib/types'
import { formatFileSize, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { uploadFile } from '@/lib/upload'
import {
  FileText, Plus, Trash2, Download, Loader2, X, Upload,
  BookOpen, File, Image, Presentation
} from 'lucide-react'

const RESOURCE_TYPES = [
  'Notes',
  'Question Bank',
  'Previous Year Paper',
  'PPT',
  'Practical File',
  'Lab Manual',
  'Reference PDF',
  'Syllabus',
]

// ── Skeleton loader — matches the exact layout of the page ──────────────────
function NotesSkeleton() {
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
            <div className="shimmer h-10 w-36 rounded-lg" />
          </div>
        </div>
        {/* Resource cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card p-5 flex items-start gap-4">
              <div className="shimmer w-10 h-10 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="shimmer h-3 w-16 rounded-full" />
                <div className="shimmer h-4 w-48 rounded-lg" />
                <div className="shimmer h-3 w-32 rounded-lg" />
              </div>
              <div className="flex gap-2">
                <div className="shimmer w-8 h-8 rounded-lg" />
                <div className="shimmer w-8 h-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}

// ── Icon resolver by resource type ──────────────────────────────────────────
function ResourceIcon({ type }: { type: string }) {
  if (type === 'PPT') return <Presentation className="w-5 h-5 text-orange-400" />
  if (type === 'Question Bank' || type === 'Previous Year Paper') return <BookOpen className="w-5 h-5 text-yellow-400" />
  if (type === 'Syllabus') return <File className="w-5 h-5 text-blue-400" />
  return <FileText className="w-5 h-5 text-purple-400" />
}
function resourceBg(type: string) {
  if (type === 'PPT') return 'bg-orange-500/15'
  if (type === 'Question Bank' || type === 'Previous Year Paper') return 'bg-yellow-500/15'
  if (type === 'Syllabus') return 'bg-blue-500/15'
  return 'bg-purple-500/15'
}

// ── Main page content ────────────────────────────────────────────────────────
function ProfessorNotesPageContent() {
  const { userProfile } = useAuth()
  const searchParams = useSearchParams()
  const urlClassId = searchParams.get('classId')

  const [classes, setClasses]               = useState<ClassWorkspace[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [resources, setResources]           = useState<Resource[]>([])
  const [loading, setLoading]               = useState(true)
  const [loadingResources, setLoadingResources] = useState(false)

  // Upload modal
  const [showUpload, setShowUpload]     = useState(false)
  const [uploading, setUploading]       = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [form, setForm] = useState({ title: '', type: 'Notes', unit: '' })

  const uid = userProfile?.uid

  // ── Load professor's classes from Supabase ───────────────────────────────
  useEffect(() => {
    if (!uid) return
    supabase.from('classes').select('*')
      .eq('professor_id', uid)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { toast.error('Failed to load classes'); setLoading(false); return }
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
  }, [uid, urlClassId])

  // ── Load resources for selected class from Supabase ─────────────────────
  useEffect(() => {
    if (!selectedClassId) return
    setLoadingResources(true)
    supabase.from('resources').select('*')
      .eq('class_id', selectedClassId)
      .order('uploaded_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error('Failed to load resources')
        else {
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

  // ── File validation ──────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File exceeds 10MB limit')
      e.target.value = ''
      return
    }
    setSelectedFile(file)
  }

  // ── Upload to Supabase Storage → insert row in resources table ───────────
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClassId || !selectedFile || !userProfile) return
    if (!form.title.trim()) { toast.error('Please enter a title'); return }

    const activeClass = classes.find(c => c.id === selectedClassId)
    setUploading(true)
    setUploadProgress(10)

    try {
      // 1. Upload file using server-side API to bypass Supabase RLS policies
      const path = `resources/${selectedClassId}/${Date.now()}_`
      const fileUrl = await uploadFile(selectedFile, path)
      setUploadProgress(80)

      // 3. Insert resource record in Supabase DB
      const { data: inserted, error: dbErr } = await supabase
        .from('resources')
        .insert([{
          class_id:     selectedClassId,
          title:        form.title.trim(),
          type:         form.type,
          unit:         form.unit || null,
          file_url:     fileUrl,
          file_name:    selectedFile.name,
          file_size:    selectedFile.size,
          uploaded_by:  userProfile.uid,
          uploader_name: userProfile.name,
          uploaded_at:  new Date().toISOString(),
        }])
        .select()
        .single()

      if (dbErr) throw new Error(`DB insert failed: ${dbErr.message}`)
      setUploadProgress(100)

      // 4. Optimistic UI update
      setResources(prev => [{
        id: inserted.id,
        title: inserted.title,
        type: inserted.type as Resource['type'],
        unit: inserted.unit ?? undefined,
        fileUrl: inserted.file_url,
        fileName: inserted.file_name,
        fileSize: inserted.file_size,
        uploadedBy: inserted.uploaded_by,
        uploaderName: inserted.uploader_name,
        uploadedAt: inserted.uploaded_at,
        classId: inserted.class_id,
        subject: activeClass?.subject || 'Class Resource',
        visibility: 'class',
      } as Resource, ...prev])

      toast.success('Resource uploaded successfully!')
      setShowUpload(false)
      setForm({ title: '', type: 'Notes', unit: '' })
      setSelectedFile(null)
    } catch (err: any) {
      console.error('Upload error:', err)
      toast.error(err?.message || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  // ── Delete resource ──────────────────────────────────────────────────────
  const handleDelete = async (resource: Resource) => {
    if (!confirm(`Delete "${resource.title}"? This cannot be undone.`)) return
    try {
      const { error } = await supabase.from('resources').delete().eq('id', resource.id)
      if (error) throw error
      setResources(prev => prev.filter(r => r.id !== resource.id))
      toast.success('Resource deleted')
    } catch (err) {
      toast.error('Failed to delete resource')
    }
  }

  // ── Loading state — show skeleton ────────────────────────────────────────
  if (loading) return <NotesSkeleton />

  return (
    <DashboardLayout title="Notes & Resources">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Resource Library</h1>
            <p className="text-sm text-muted-foreground mt-1">Upload and manage syllabus, notes, PPTs and manuals</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="input-field max-w-xs"
            >
              {classes.length === 0
                ? <option value="">No classes found</option>
                : classes.map(c => (
                  <option key={c.id} value={c.id}>{c.subject} ({c.division})</option>
                ))}
            </select>
            <button
              onClick={() => setShowUpload(true)}
              disabled={!selectedClassId}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" /> Upload Resource
            </button>
          </div>
        </div>

        {/* Resource list */}
        {loadingResources ? (
          // Inline skeleton for resource list switch
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="glass-card p-5 flex items-start gap-4">
                <div className="shimmer w-10 h-10 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="shimmer h-3 w-16 rounded-full" />
                  <div className="shimmer h-4 w-40 rounded-lg" />
                  <div className="shimmer h-3 w-24 rounded-lg" />
                </div>
                <div className="flex gap-2">
                  <div className="shimmer w-8 h-8 rounded-lg" />
                  <div className="shimmer w-8 h-8 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : resources.length === 0 ? (
          <div className="glass-card p-16 text-center space-y-4">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground opacity-30" />
            <p className="text-foreground font-medium">No resources uploaded yet</p>
            <p className="text-muted-foreground text-sm">Upload study materials for your students.</p>
            <button onClick={() => setShowUpload(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Upload Resource
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resources.map(res => (
              <div key={res.id} className="glass-card p-5 flex items-start gap-4 hover:border-brand-500/20 transition-all">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${resourceBg(res.type)}`}>
                  <ResourceIcon type={res.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="badge badge-gray text-[10px] mb-1">{res.type}</span>
                  <h3 className="font-semibold text-foreground text-sm truncate">{res.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {res.unit ? `Unit ${res.unit} · ` : ''}
                    {formatFileSize(res.fileSize)} · {formatDate(res.uploadedAt)}
                  </p>
                  <p className="text-xs text-muted-foreground">by {res.uploaderName}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <a href={res.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="btn-ghost p-2 hover:text-brand-400" title="Download">
                    <Download className="w-4 h-4" />
                  </a>
                  <button onClick={() => handleDelete(res)}
                    className="btn-ghost p-2 text-muted-foreground hover:text-red-400" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg p-6 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Upload Study Material</h2>
              <button onClick={() => { setShowUpload(false); setSelectedFile(null) }}
                className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Resource Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Lecture 1 - Intro to SQL"
                  required
                  className="input-field"
                />
              </div>

              {/* Type + Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Resource Type *</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                    required className="input-field"
                  >
                    {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Unit / Chapter</label>
                  <input
                    value={form.unit}
                    onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                    placeholder="e.g. 1, 2, A"
                    className="input-field"
                  />
                </div>
              </div>

              {/* File drop zone */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">File Upload *</label>
                <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors relative cursor-pointer
                  ${selectedFile ? 'border-brand-500/60 bg-brand-500/5' : 'border-border hover:border-brand-500/40'}`}>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    required
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    accept=".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg,.xlsx,.csv,.txt"
                  />
                  <Upload className={`w-8 h-8 mx-auto mb-2 ${selectedFile ? 'text-brand-400' : 'text-muted-foreground'}`} />
                  <p className={`text-sm font-medium ${selectedFile ? 'text-brand-400' : 'text-foreground'}`}>
                    {selectedFile ? selectedFile.name : 'Click to upload or drag & drop'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Max size: 10MB · PDF, PPT, PPTX, DOCX, PNG, JPG etc.
                  </p>
                  {selectedFile && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  )}
                </div>
              </div>

              {/* Upload progress bar */}
              {uploading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Uploading to storage...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-brand-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowUpload(false); setSelectedFile(null) }}
                  className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={uploading || !selectedFile}
                  className="btn-primary flex-1">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4" /> Upload</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

// ── Export with Suspense (fallback = full skeleton, not spinner) ─────────────
export default function ProfessorNotesPage() {
  return (
    <Suspense fallback={<NotesSkeleton />}>
      <ProfessorNotesPageContent />
    </Suspense>
  )
}
