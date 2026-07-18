'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { UserProfile, UserRole } from '@/lib/types'
import { Search, ShieldAlert, Trash2, X, Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function AdminUsersPage() {
  const { userProfile } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Role edit state
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [selectedRole, setSelectedRole] = useState<UserRole>('student')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!userProfile || userProfile.role !== 'admin') return
    async function loadUsers() {
      try {
        const snap = await getDocs(collection(db, 'users'))
        setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })) as UserProfile[])
      } catch (err) {
        console.error(err)
        toast.error('Failed to load users')
      } finally {
        setLoading(false)
      }
    }
    loadUsers()
  }, [userProfile])

  const handleRoleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    setSaving(true)

    try {
      const uRef = doc(db, 'users', editingUser.uid)
      await updateDoc(uRef, { role: selectedRole })
      
      setUsers(prev => prev.map(u => u.uid === editingUser.uid ? { ...u, role: selectedRole } : u))
      toast.success(`Role updated to ${selectedRole} for ${editingUser.name}`)
      setEditingUser(null)
    } catch (err) {
      console.error(err)
      toast.error('Failed to update role')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async (uid: string, name: string) => {
    if (uid === userProfile?.uid) {
      toast.error('You cannot delete your own admin account!')
      return
    }
    if (!confirm(`Are you absolutely sure you want to delete user: ${name}? This will remove their profile record from Firestore.`)) return

    try {
      await deleteDoc(doc(db, 'users', uid))
      setUsers(prev => prev.filter(u => u.uid !== uid))
      toast.success('User deleted')
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete user')
    }
  }

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <DashboardLayout title="Admin Panel">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout title="System Users">
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/admin" className="btn-ghost p-2">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Manage Users</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Control registration accounts and system roles</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search users by name or email..."
            className="input-field pl-10"
          />
        </div>

        {/* Table list */}
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-white/2">
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground">Name</th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground">Email</th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground">Role</th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground">Department</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-muted-foreground text-xs">
                    No users found matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.uid} className="border-b border-border/50 hover:bg-white/3 transition-colors">
                    <td className="p-4 font-medium text-foreground">{user.name}</td>
                    <td className="p-4 text-muted-foreground text-xs">{user.email}</td>
                    <td className="p-4">
                      <span className={`badge capitalize font-semibold ${user.role === 'admin' ? 'badge-red' : user.role === 'professor' ? 'badge-purple bg-purple-500/10 text-purple-400' : 'badge-blue'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground text-xs">{user.department || '—'}</td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingUser(user)
                          setSelectedRole(user.role)
                        }}
                        className="btn-ghost py-1 px-2.5 text-xs border border-border"
                      >
                        Edit Role
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.uid, user.name)}
                        className="text-muted-foreground hover:text-red-400 p-1"
                        title="Delete User"
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

      {/* Edit Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Edit User Role</h2>
                <p className="text-xs text-muted-foreground mt-0.5">User: {editingUser.name}</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRoleUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">System Role *</label>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value as UserRole)}
                  required
                  className="input-field"
                >
                  <option value="student">Student</option>
                  <option value="professor">Professor</option>
                  <option value="admin">System Admin</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingUser(null)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
