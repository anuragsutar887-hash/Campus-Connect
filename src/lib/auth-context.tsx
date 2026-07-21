'use client'

/**
 * AUTH CONTEXT — Firebase Auth + Supabase Storage
 *
 * Architecture:
 *  - Firebase  → Authentication only (sign-in, sign-up, Google OAuth, session management)
 *  - Supabase  → User profile persistence (replaces Firestore entirely)
 *  - localStorage → Instant cache layer (zero-latency UI, no waiting for network)
 *
 * Flow:
 *  1. Firebase Auth fires onAuthStateChanged
 *  2. We check localStorage first (instant render, no flicker)
 *  3. We reconcile with Supabase in the background (sync across devices)
 *  4. signUp / signInWithGoogle own their profile creation end-to-end
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth'
import { auth } from './firebase'
import { supabase } from './supabase'
import { UserProfile, UserRole } from './types'

// ── localStorage helpers (instant, zero-latency) ──────────────────────────────
function lsWrite(profile: UserProfile) {
  try {
    const json = JSON.stringify(profile)
    localStorage.setItem(`cc:${profile.uid}`, json)
    localStorage.setItem(`userProfile_${profile.uid}`, json) // legacy compat
  } catch {}
}

function lsRead(uid: string): UserProfile | null {
  try {
    const raw =
      localStorage.getItem(`cc:${uid}`) ??
      localStorage.getItem(`userProfile_${uid}`)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function lsDel(uid: string) {
  try {
    localStorage.removeItem(`cc:${uid}`)
    localStorage.removeItem(`userProfile_${uid}`)
  } catch {}
}

// ── Supabase profile helpers ───────────────────────────────────────────────────
async function sbReadProfile(uid: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('uid', uid)
      .single()
    if (error || !data) return null
    // Map snake_case Supabase columns → camelCase TypeScript
    return {
      uid: data.uid,
      name: data.name,
      email: data.email,
      role: data.role as UserRole,
      college: data.college,
      department: data.department,
      rollNumber: data.roll_number,
      employeeId: data.employee_id,
      photoURL: data.photo_url,
      joinedClasses: data.joined_classes ?? [],
      createdAt: data.created_at,
    } as UserProfile
  } catch { return null }
}

function sbWriteProfile(profile: UserProfile) {
  // Fire-and-forget background sync — never block the UI
  supabase.from('users').upsert([{
    uid:           profile.uid,
    name:          profile.name,
    email:         profile.email,
    role:          profile.role,
    college:       profile.college ?? '',
    department:    profile.department ?? '',
    roll_number:   profile.rollNumber ?? '',
    employee_id:   profile.employeeId ?? '',
    photo_url:     profile.photoURL ?? '',
    joined_classes: profile.joinedClasses ?? [],
    created_at:    profile.createdAt,
  }]).then(({ error }) => {
    if (error) console.warn('[Auth] Supabase profile sync failed (non-fatal):', error.message)
  })
}

// ─────────────────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: (role?: UserRole) => Promise<void>
  signUp: (
    email: string, password: string, name: string,
    role: UserRole, extra?: Partial<UserProfile>
  ) => Promise<void>
  logOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]               = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)

      if (!firebaseUser) {
        setUserProfile(null)
        setLoading(false)
        return
      }

      // ── Fast path: localStorage → instant render, no network wait ─────────
      const cached = lsRead(firebaseUser.uid)
      if (cached) {
        setUserProfile(cached)
        setLoading(false)  // UI unblocks immediately

        // Background sync with Supabase (update cache if stale)
        sbReadProfile(firebaseUser.uid).then((sbProfile) => {
          if (sbProfile) {
            setUserProfile(sbProfile)
            lsWrite(sbProfile)
          } else {
            // Profile exists in cache but not in Supabase → migrate
            sbWriteProfile(cached)
          }
        })
        return
      }

      // ── Slow path: no cache, fetch from Supabase ──────────────────────────
      const sbProfile = await sbReadProfile(firebaseUser.uid)
      if (sbProfile) {
        lsWrite(sbProfile)
        setUserProfile(sbProfile)
      } else {
        // Fallback profile creation for new Google users or missing database records
        const pendingRole = (localStorage.getItem('pending_google_role') as UserRole) || 'student'
        localStorage.removeItem('pending_google_role')
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || '',
          role: pendingRole,
          photoURL: firebaseUser.photoURL || undefined,
          joinedClasses: [],
          createdAt: new Date().toISOString(),
        }
        lsWrite(newProfile)
        sbWriteProfile(newProfile)
        setUserProfile(newProfile)
      }
      setLoading(false)
    })

    return () => unsub()
  }, [])

  // ── Email / Password sign-in ──────────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
    // onAuthStateChanged handles profile resolution
  }

  // ── Google sign-in ────────────────────────────────────────────────────────
  const signInWithGoogle = async (requestedRole: UserRole = 'student') => {
    localStorage.setItem('pending_google_role', requestedRole)
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })

    let result
    try {
      result = await signInWithPopup(auth, provider)
    } catch (popupErr: any) {
      if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/cancelled-popup-request') {
        const { signInWithRedirect } = await import('firebase/auth')
        await signInWithRedirect(auth, provider)
        return
      }
      throw popupErr
    }

    const gUser = result.user

    // Check localStorage first, then Supabase
    const existing = lsRead(gUser.uid) ?? await sbReadProfile(gUser.uid)

    if (existing) {
      lsWrite(existing)
      sbWriteProfile(existing)
      setUserProfile(existing)
    } else {
      const profile: UserProfile = {
        uid: gUser.uid,
        name: gUser.displayName || 'User',
        email: gUser.email || '',
        role: requestedRole,
        photoURL: gUser.photoURL || undefined,
        joinedClasses: [],
        createdAt: new Date().toISOString(),
      }
      lsWrite(profile)
      sbWriteProfile(profile)
      setUserProfile(profile)
    }
  }

  // ── Email / Password registration ─────────────────────────────────────────
  const signUp = async (
    email: string, password: string, name: string,
    role: UserRole, extra?: Partial<UserProfile>
  ) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName: name })

    const profile: UserProfile = {
      uid: cred.user.uid,
      name, email, role,
      joinedClasses: [],
      createdAt: new Date().toISOString(),
      ...extra,
    }

    lsWrite(profile)
    sbWriteProfile(profile)
    setUserProfile(profile)
  }

  // ── Sign out ──────────────────────────────────────────────────────────────
  const logOut = async () => {
    if (user) lsDel(user.uid)
    await fbSignOut(auth)
    setUserProfile(null)
  }

  const resetPassword = (email: string) => sendPasswordResetEmail(auth, email)

  return (
    <AuthContext.Provider
      value={{ user, userProfile, loading, signIn, signInWithGoogle, signUp, logOut, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}