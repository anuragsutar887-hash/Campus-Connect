'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { UserRole } from '@/lib/types'
import { toast } from 'sonner'
import { BookOpen, Mail, Lock, User, Eye, EyeOff, GraduationCap, Briefcase } from 'lucide-react'

export default function RegisterPage() {
  const { signUp, signInWithGoogle } = useAuth()
  const router = useRouter()
  const [role, setRole] = useState<UserRole>('student')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [college, setCollege] = useState('')
  const [department, setDepartment] = useState('')
  const [rollNumber, setRollNumber] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPw) { toast.error('Passwords do not match'); return }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await signUp(email, password, name, role, {
        college, department,
        ...(role === 'student' ? { rollNumber } : { employeeId }),
      })
      toast.success('Account created! Welcome to Campus Connect.')
      router.replace('/')
    } catch (err: any) {
      toast.error(err.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    try {
      await signInWithGoogle(role)
      toast.success('Signed in with Google!')
      router.replace('/')
    } catch (err: any) {
      if (err?.message?.startsWith('ROLE_MISMATCH:')) {
        toast.error(err.message.replace('ROLE_MISMATCH:', ''), { duration: 6000, icon: '🚫' })
      } else {
        toast.error('Google sign-in failed. Please try again.')
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-background">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-500/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, hsl(239 84% 60%), hsl(239 84% 45%))' }}>
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Join Campus Connect</h1>
          <p className="text-muted-foreground text-sm mt-1">Create your academic workspace account</p>
        </div>

        <div className="glass-card p-8 space-y-6">
          {/* Role Selector */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">I am a...</p>
            <div className="grid grid-cols-2 gap-3">
              {(['student', 'professor'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  id={`role-${r}`}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-sm font-medium transition-all ${
                    role === r
                      ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
                      : 'border-border bg-white/5 text-muted-foreground hover:border-border/80 hover:bg-white/8'
                  }`}
                >
                  {r === 'student' ? <GraduationCap className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
                  <span className="capitalize">{r}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Google Button */}
          <button
            id="google-register-btn"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-secondary px-4 py-3 text-sm font-medium text-foreground transition-all hover:bg-muted hover:border-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <div className="w-4 h-4 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continue with Google as {role}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs text-muted-foreground">
              <span className="bg-card px-3">or register with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <label htmlFor="reg-name" className="text-sm font-medium text-foreground">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input id="reg-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" required className="input-field pl-10" />
                </div>
              </div>

              <div className="space-y-1.5 col-span-2">
                <label htmlFor="reg-email" className="text-sm font-medium text-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" required className="input-field pl-10" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="reg-college" className="text-sm font-medium text-foreground">College</label>
                <input id="reg-college" type="text" value={college} onChange={(e) => setCollege(e.target.value)} placeholder="ABC Institute" className="input-field" />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="reg-dept" className="text-sm font-medium text-foreground">Department</label>
                <input id="reg-dept" type="text" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Computer Engg." className="input-field" />
              </div>

              {role === 'student' ? (
                <div className="space-y-1.5 col-span-2">
                  <label htmlFor="reg-roll" className="text-sm font-medium text-foreground">Roll Number</label>
                  <input id="reg-roll" type="text" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} placeholder="e.g. CE2024001" className="input-field" />
                </div>
              ) : (
                <div className="space-y-1.5 col-span-2">
                  <label htmlFor="reg-empid" className="text-sm font-medium text-foreground">Employee ID</label>
                  <input id="reg-empid" type="text" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="e.g. PROF001" className="input-field" />
                </div>
              )}

              <div className="space-y-1.5 col-span-2">
                <label htmlFor="reg-password" className="text-sm font-medium text-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input id="reg-password" type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 characters" required className="input-field pl-10 pr-10" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 col-span-2">
                <label htmlFor="reg-confirm-pw" className="text-sm font-medium text-foreground">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input id="reg-confirm-pw" type={showPw ? 'text' : 'password'} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Repeat password" required className="input-field pl-10" />
                </div>
              </div>
            </div>

            <button id="register-submit-btn" type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
