'use client'
import { useState, useRef } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { auth } from '@/lib/firebase'
import { updateProfile } from 'firebase/auth'
import { getInitials } from '@/lib/utils'
import { toast } from 'sonner'
import {
  User, Mail, Phone, Building2, Hash, Briefcase,
  GraduationCap, Save, Loader2, Camera, Shield
} from 'lucide-react'

export default function EditProfilePage() {
  const { userProfile, user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name:       userProfile?.name       ?? '',
    college:    userProfile?.college    ?? '',
    department: userProfile?.department ?? '',
    rollNumber: userProfile?.rollNumber ?? '',
    employeeId: userProfile?.employeeId ?? '',
  })

  const isStudent   = userProfile?.role === 'student'
  const isProfessor = userProfile?.role === 'professor'
  const isAdmin     = userProfile?.role === 'admin'

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userProfile || !user) return
    setSaving(true)
    try {
      // Update Firebase display name
      await updateProfile(user, { displayName: form.name.trim() })

      // Build Supabase update payload
      const updates: Record<string, string> = {
        name:       form.name.trim(),
        college:    form.college.trim(),
        department: form.department.trim(),
      }
      if (isStudent)   updates.roll_number = form.rollNumber.trim()
      if (isProfessor) updates.employee_id  = form.employeeId.trim()

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('uid', userProfile.uid)

      if (error) throw new Error(error.message)

      // Update localStorage cache
      const cached = localStorage.getItem(`cc:${userProfile.uid}`)
      if (cached) {
        const parsed = JSON.parse(cached)
        const updated = { ...parsed, ...form, rollNumber: form.rollNumber, employeeId: form.employeeId }
        localStorage.setItem(`cc:${userProfile.uid}`, JSON.stringify(updated))
      }

      toast.success('Profile updated successfully!')
    } catch (err: any) {
      console.error('[EditProfile] save error:', err)
      toast.error(err?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const getRoleIcon = () => {
    if (isProfessor) return <Briefcase className="w-4 h-4 text-brand-400" />
    if (isAdmin)     return <Shield className="w-4 h-4 text-brand-400" />
    return <GraduationCap className="w-4 h-4 text-brand-400" />
  }

  return (
    <DashboardLayout title="Edit Profile">
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">

        {/* Avatar section */}
        <div className="glass-card p-6 flex flex-col items-center gap-4">
          <div className="relative group">
            <div className="avatar w-24 h-24 text-2xl ring-4 ring-brand-500/30">
              {userProfile?.photoURL
                ? <img src={userProfile.photoURL} className="w-24 h-24 rounded-full object-cover" alt="avatar" />
                : <span>{getInitials(userProfile?.name || 'U')}</span>
              }
            </div>
            {/* Camera overlay — visual only for now */}
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="w-6 h-6 text-white" />
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />
          </div>

          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground">{userProfile?.name}</h2>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              {getRoleIcon()}
              <span className="text-sm text-brand-400 capitalize font-medium">{userProfile?.role}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{userProfile?.email}</p>
          </div>
        </div>

        {/* Edit form */}
        <form onSubmit={handleSave} className="glass-card p-6 space-y-5">
          <h3 className="text-base font-semibold text-foreground border-b border-border pb-3">
            Personal Information
          </h3>

          <div className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-muted-foreground" /> Full Name
              </label>
              <input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Your full name"
                required
                className="input-field"
              />
            </div>

            {/* Email — read-only */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" /> Email Address
              </label>
              <input
                value={userProfile?.email ?? ''}
                disabled
                className="input-field opacity-60 cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
            </div>

            {/* College */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" /> College
              </label>
              <input
                value={form.college}
                onChange={e => setForm(p => ({ ...p, college: e.target.value }))}
                placeholder="Enter your college name"
                className="input-field"
              />
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5 text-muted-foreground" /> Department / Branch
              </label>
              <input
                value={form.department}
                onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                placeholder="Enter your department or branch"
                className="input-field"
              />
            </div>

            {/* Roll Number — students only */}
            {isStudent && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5 text-muted-foreground" /> Roll Number
                </label>
                <input
                  value={form.rollNumber}
                  onChange={e => setForm(p => ({ ...p, rollNumber: e.target.value }))}
                  placeholder="Enter your roll number"
                  className="input-field"
                />
              </div>
            )}

            {/* Employee ID — professors only */}
            {isProfessor && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5 text-muted-foreground" /> Employee ID
                </label>
                <input
                  value={form.employeeId}
                  onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))}
                  placeholder="Enter your employee ID"
                  className="input-field"
                />
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary px-6"
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                : <><Save className="w-4 h-4" /> Save Changes</>
              }
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
