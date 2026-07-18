'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { UserProfile } from '@/lib/types'
import { toast } from 'sonner'
import { BookOpen, Mail, Lock, Eye, EyeOff, GraduationCap, Briefcase, ShieldAlert } from 'lucide-react'

export default function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleRole, setGoogleRole] = useState<'student' | 'professor'>('student')
  const [googleLoading, setGoogleLoading] = useState(false)

  // After email/password sign-in, read the role from Firestore and redirect
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await signIn(email, password)

      // Fetch the user's Firestore profile to get their role
      // We can't use useAuth().userProfile yet (still loading), so query directly
      // onAuthStateChanged sets the UID, but we need to find it from the credential
      // Instead, look up by email indirectly via auth state — wait briefly for it
      // Actually the cleanest pattern: query Firestore by a known auth state
      // The signIn returns void but auth state is updated; we use a short poll
      toast.success('Welcome back!')
      // Redirect to home — the home page will detect role and redirect appropriately
      router.replace('/')
    } catch (err: any) {
      toast.error(getFriendlyError(err.code))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    try {
      await signInWithGoogle(googleRole)
      toast.success('Signed in with Google!')
      router.replace('/')
    } catch (err: any) {
      // Check for our custom ROLE_MISMATCH error
      if (err.message?.startsWith('ROLE_MISMATCH:')) {
        const msg = err.message.replace('ROLE_MISMATCH:', '')
        toast.error(msg, {
          duration: 6000,
          icon: '🚫',
        })
      } else {
        toast.error('Google sign-in failed. Try again.')
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-background">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, hsl(239 84% 60%), hsl(239 84% 45%))' }}>
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Campus Connect</h1>
          <p className="text-muted-foreground text-sm mt-1">Your College Classroom, Connected.</p>
        </div>

        <div className="glass-card p-8 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Welcome back</h2>
            <p className="text-muted-foreground text-sm mt-1">Sign in to your account</p>
          </div>

          {/* Google role selector + button */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sign in with Google as</p>
            <div className="grid grid-cols-2 gap-2">
              {(['student', 'professor'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  id={`google-role-${r}`}
                  onClick={() => setGoogleRole(r)}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                    googleRole === r
                      ? 'border-brand-500/60 bg-brand-500/10 text-brand-400'
                      : 'border-border bg-secondary text-muted-foreground hover:border-border/80'
                  }`}
                >
                  {r === 'student' ? <GraduationCap className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                  <span className="capitalize">{r}</span>
                </button>
              ))}
            </div>

            <button
              id="google-login-btn"
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
              Continue with Google
            </button>

            {/* Role mismatch hint */}
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-400/80">
                Your Google account is locked to the role you registered with. Selecting the wrong role will be rejected.
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs text-muted-foreground">
              <span className="bg-card px-3 rounded">or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-sm font-medium text-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@college.edu"
                  required
                  className="input-field pl-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-sm font-medium text-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input-field pl-10 pr-10"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link href="/reset-password" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                Forgot password?
              </Link>
            </div>

            <button id="login-submit-btn" type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function getFriendlyError(code: string): string {
  const map: Record<string, string> = {
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/too-many-requests': 'Too many attempts. Try again later.',
    'auth/invalid-credential': 'Invalid email or password.',
  }
  return map[code] || 'Sign in failed. Please try again.'
}
