'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import { BookOpen, Mail, ArrowLeft, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await resetPassword(email)
      setSent(true)
      toast.success('Reset email sent!')
    } catch {
      toast.error('Failed to send reset email. Check the address.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, hsl(239 84% 55%), hsl(239 84% 40%))' }}>
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Campus Connect</h1>
        </div>

        <div className="glass-card p-8 space-y-6">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="w-16 h-16 text-emerald-400" />
              </div>
              <h2 className="text-xl font-semibold">Check your email</h2>
              <p className="text-muted-foreground text-sm">
                We sent a password reset link to <strong className="text-foreground">{email}</strong>.
                Check your inbox (and spam folder).
              </p>
              <Link href="/login" className="btn-primary inline-flex">Back to Login</Link>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-xl font-semibold">Reset password</h2>
                <p className="text-muted-foreground text-sm mt-1">Enter your email to receive a reset link.</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="reset-email" className="text-sm font-medium">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input id="reset-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" required className="input-field pl-10" />
                  </div>
                </div>
                <button id="reset-submit-btn" type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Send Reset Link'}
                </button>
              </form>
              <Link href="/login" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
