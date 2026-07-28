'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { useTheme } from '@/lib/theme-context'
import {
  BookOpen, Users, ClipboardList, CalendarCheck, HelpCircle,
  FileText, ArrowRight, CheckCircle2, Sparkles, Shield, Zap,
  GraduationCap, Briefcase, Video, LogIn, UserPlus, Sun, Moon,
  ChevronDown, MessageSquare, Download, Layers, Award, Clock, Presentation
} from 'lucide-react'

export default function HomePage() {
  const { user, userProfile, loading } = useAuth()
  const { theme, toggleTheme } = useTheme()

  // Interactive Demo Tab State
  const [activeDemoTab, setActiveDemoTab] = useState<'professor' | 'student' | 'attendance' | 'notes' | 'doubts'>('professor')
  const [activeRoleView, setActiveRoleView] = useState<'professor' | 'student'>('professor')
  const [faqOpen, setFaqOpen] = useState<number | null>(0)

  const dashboardPath = userProfile?.role === 'professor'
    ? '/dashboard/professor'
    : userProfile?.role === 'admin'
    ? '/dashboard/admin'
    : '/dashboard/student'

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-brand-500 selection:text-white transition-colors duration-300">
      {/* ── 1. NAVBAR / HEADER ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/60 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Logo & Brand Name */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <img
                src="/logo.jpg"
                alt="Campus Connect Logo"
                className="w-9 h-9 rounded-xl object-cover shadow-md group-hover:scale-105 transition-transform"
              />
              <div className="absolute inset-0 rounded-xl bg-brand-500/20 blur-md -z-10 group-hover:bg-brand-500/40 transition-all" />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-foreground flex items-center gap-1.5">
              Campus<span className="text-brand-500">Connect</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#demo" className="hover:text-foreground transition-colors">Interactive Demo</a>
            <a href="#features" className="hover:text-foreground transition-colors">Platform Modules</a>
            <a href="#roles" className="hover:text-foreground transition-colors">For Professors & Students</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-border/80 bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            {!loading && user && userProfile ? (
              <Link href={dashboardPath} className="btn-primary py-2 px-4 text-xs sm:text-sm">
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="btn-ghost py-2 px-3.5 text-xs sm:text-sm font-semibold flex items-center gap-1.5"
                >
                  <LogIn className="w-4 h-4 text-brand-500" /> Log In
                </Link>
                <Link
                  href="/register"
                  className="btn-primary py-2 px-4 text-xs sm:text-sm shadow-md shadow-brand-500/20 flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" /> Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── 2. HERO SECTION ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
        {/* Decorative Background Elements */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />
        <div className="absolute top-1/3 -right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 animate-fade-in">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-500 dark:text-brand-400 text-xs font-semibold shadow-sm backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Next-Gen Academic Collaboration Platform</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.12]">
            Your College Classroom, <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-500 via-indigo-500 to-purple-500 dark:from-brand-400 dark:via-indigo-400 dark:to-purple-400">
              Fully Connected.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-3xl mx-auto text-base sm:text-lg md:text-xl text-muted-foreground font-normal leading-relaxed">
            Campus Connect empowers professors and students with digital attendance tracking, 
            instant assignment grading, course resource sharing, and 1-on-1 doubt resolution — all in one sleek workspace.
          </p>

          {/* Call To Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/register"
              className="w-full sm:w-auto btn-primary py-3.5 px-8 text-base font-bold shadow-xl shadow-brand-500/25 flex items-center justify-center gap-2 group"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/login"
              className="w-full sm:w-auto btn-secondary py-3.5 px-8 text-base font-semibold flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5 text-brand-500" />
              <span>Log In to Portal</span>
            </Link>
          </div>

          {/* Feature Badges */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-y-3 gap-x-8 text-xs sm:text-sm font-medium text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>100% Free for Colleges</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-500" />
              <span>Instant 6-Digit Join Codes</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-500" />
              <span>Real-Time Attendance Warnings</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-yellow-500" />
              <span>Direct Professor Doubts</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. INTERACTIVE PRODUCT DEMO SHOWCASE ─────────────────────────────── */}
      <section id="demo" className="py-16 md:py-24 bg-secondary/30 border-y border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-brand-500 dark:text-brand-400">Live Website Experience</h2>
            <p className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Explore the Platform Before Signing Up
            </p>
            <p className="text-sm sm:text-base text-muted-foreground">
              Click through the interactive demo tabs below to preview the actual student and professor workspace in action.
            </p>
          </div>

          {/* Mock Browser Frame */}
          <div className="glass-card rounded-2xl overflow-hidden shadow-2xl border border-border/80 bg-card">
            
            {/* Browser Top Bar */}
            <div className="px-4 py-3 bg-muted/60 border-b border-border/60 flex flex-wrap items-center justify-between gap-3">
              {/* MacOS Window Dots */}
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="text-xs font-mono text-muted-foreground ml-2 hidden sm:inline-block">campusconnect.edu/dashboard</span>
              </div>

              {/* Demo Switcher Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {[
                  { id: 'professor', label: 'Professor View', icon: Briefcase },
                  { id: 'student', label: 'Student View', icon: GraduationCap },
                  { id: 'attendance', label: 'Attendance System', icon: CalendarCheck },
                  { id: 'notes', label: 'Resource Hub', icon: FileText },
                  { id: 'doubts', label: 'Doubt Portal', icon: HelpCircle },
                ].map(tab => {
                  const Icon = tab.icon
                  const active = activeDemoTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveDemoTab(tab.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                        active
                          ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                          : 'bg-background/80 text-muted-foreground hover:text-foreground hover:bg-secondary'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Interactive Demo Body */}
            <div className="p-6 md:p-8 min-h-[440px] bg-background/50">
              
              {/* TAB 1: PROFESSOR VIEW */}
              {activeDemoTab === 'professor' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <div>
                      <h3 className="text-xl font-bold text-foreground">Good Morning, Prof. Anurag 🌅</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Thursday, 28 July 2026 · Department of IT & Computer Engineering</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="btn-secondary text-xs px-3 py-1.5 cursor-default">+ Join Class</span>
                      <span className="btn-primary text-xs px-3 py-1.5 cursor-default">+ Create Class</span>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl glass-card bg-brand-500/5 border-brand-500/20">
                      <p className="text-xs font-medium text-muted-foreground">My Classes</p>
                      <p className="text-2xl font-bold text-brand-500 mt-1">4 Active</p>
                    </div>
                    <div className="p-4 rounded-xl glass-card bg-indigo-500/5 border-indigo-500/20">
                      <p className="text-xs font-medium text-muted-foreground">Pending Reviews</p>
                      <p className="text-2xl font-bold text-indigo-500 mt-1">12 Papers</p>
                    </div>
                    <div className="p-4 rounded-xl glass-card bg-emerald-500/5 border-emerald-500/20">
                      <p className="text-xs font-medium text-muted-foreground">Avg. Attendance</p>
                      <p className="text-2xl font-bold text-emerald-500 mt-1">94.5%</p>
                    </div>
                    <div className="p-4 rounded-xl glass-card bg-red-500/5 border-red-500/20">
                      <p className="text-xs font-medium text-muted-foreground">Open Doubts</p>
                      <p className="text-2xl font-bold text-red-500 mt-1">3 Tickets</p>
                    </div>
                  </div>

                  {/* Class Cards */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Active Classes & Join Codes</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="glass-card p-4 space-y-3 border-l-4 border-l-brand-500">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-semibold text-foreground text-sm">Data Structures & Algorithms</h5>
                            <p className="text-xs text-muted-foreground mt-0.5">Computer Engg. &nbsp;·&nbsp; Div: A &nbsp;·&nbsp; Sem: 3</p>
                          </div>
                          <span className="badge badge-gray text-xs">84 Students</span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50">
                          <span className="text-muted-foreground">Class Join Code:</span>
                          <span className="font-mono font-bold text-brand-500 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/30">DSA2026</span>
                        </div>
                      </div>

                      <div className="glass-card p-4 space-y-3 border-l-4 border-l-purple-500">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-semibold text-foreground text-sm">Object Oriented Programming</h5>
                            <p className="text-xs text-muted-foreground mt-0.5">IT Dept &nbsp;·&nbsp; Div: B &nbsp;·&nbsp; Sem: 4</p>
                          </div>
                          <span className="badge badge-gray text-xs">76 Students</span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50">
                          <span className="text-muted-foreground">Class Join Code:</span>
                          <span className="font-mono font-bold text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30">OOPJAVA</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: STUDENT VIEW */}
              {activeDemoTab === 'student' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <div>
                      <h3 className="text-xl font-bold text-foreground">Good Morning, Rahul 🎓</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Enrolled in 5 active classes · Semester 3</p>
                    </div>
                    <span className="btn-primary text-xs px-3 py-1.5 cursor-default">+ Join Class Code</span>
                  </div>

                  {/* Student Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl glass-card">
                      <p className="text-xs font-medium text-muted-foreground">Enrolled Classes</p>
                      <p className="text-2xl font-bold text-foreground mt-1">5 Courses</p>
                    </div>
                    <div className="p-4 rounded-xl glass-card">
                      <p className="text-xs font-medium text-muted-foreground">Pending Assignments</p>
                      <p className="text-2xl font-bold text-yellow-500 mt-1">2 Due Soon</p>
                    </div>
                    <div className="p-4 rounded-xl glass-card">
                      <p className="text-xs font-medium text-muted-foreground">Overall Attendance</p>
                      <p className="text-2xl font-bold text-emerald-500 mt-1">92% (Good)</p>
                    </div>
                    <div className="p-4 rounded-xl glass-card">
                      <p className="text-xs font-medium text-muted-foreground">Upcoming Meetings</p>
                      <p className="text-2xl font-bold text-brand-500 mt-1">1 Today</p>
                    </div>
                  </div>

                  {/* Pending Assignments Preview */}
                  <div className="glass-card p-5 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pending Assignments</h4>
                    <div className="space-y-2">
                      <div className="p-3 rounded-lg bg-muted/40 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <ClipboardList className="w-4 h-4 text-brand-500" />
                          <div>
                            <p className="font-semibold text-foreground">Lab 4: Binary Search Trees Implementation</p>
                            <p className="text-muted-foreground text-[11px]">Data Structures & Algorithms</p>
                          </div>
                        </div>
                        <span className="badge badge-yellow text-xxs font-semibold">2d Left</span>
                      </div>

                      <div className="p-3 rounded-lg bg-muted/40 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <ClipboardList className="w-4 h-4 text-brand-500" />
                          <div>
                            <p className="font-semibold text-foreground">Mini Project Proposal & ER Diagram</p>
                            <p className="text-muted-foreground text-[11px]">Database Management Systems</p>
                          </div>
                        </div>
                        <span className="badge badge-blue text-xxs font-semibold">5d Left</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: ATTENDANCE & GRADING */}
              {activeDemoTab === 'attendance' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <div>
                      <h3 className="text-xl font-bold text-foreground">Session Attendance & Grading</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Real-time attendance logging & submission evaluator</p>
                    </div>
                    <span className="badge badge-green text-xs font-semibold">Session Active</span>
                  </div>

                  {/* Attendance Log Table Mock */}
                  <div className="glass-card overflow-hidden">
                    <div className="p-4 bg-muted/40 border-b border-border flex justify-between items-center text-xs font-semibold">
                      <span>Data Structures (Div A) — 28 July 2026</span>
                      <span className="text-emerald-500">10 Present · 1 Absent</span>
                    </div>
                    <table className="w-full text-xs text-left">
                      <thead className="bg-secondary/50 text-muted-foreground font-medium border-b border-border">
                        <tr>
                          <th className="p-3">#</th>
                          <th className="p-3">Student Name</th>
                          <th className="p-3">Roll No.</th>
                          <th className="p-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        <tr className="hover:bg-muted/30">
                          <td className="p-3 text-muted-foreground">1</td>
                          <td className="p-3 font-semibold text-foreground">Aditya Sharma</td>
                          <td className="p-3 text-muted-foreground">22CS101</td>
                          <td className="p-3 text-right"><span className="badge badge-green text-xxs">Present</span></td>
                        </tr>
                        <tr className="hover:bg-muted/30">
                          <td className="p-3 text-muted-foreground">2</td>
                          <td className="p-3 font-semibold text-foreground">Sneha Patil</td>
                          <td className="p-3 text-muted-foreground">22CS102</td>
                          <td className="p-3 text-right"><span className="badge badge-green text-xxs">Present</span></td>
                        </tr>
                        <tr className="hover:bg-muted/30">
                          <td className="p-3 text-muted-foreground">3</td>
                          <td className="p-3 font-semibold text-foreground">Vikas Verma</td>
                          <td className="p-3 text-muted-foreground">22CS103</td>
                          <td className="p-3 text-right"><span className="badge badge-red text-xxs">Absent</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: RESOURCE HUB */}
              {activeDemoTab === 'notes' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <div>
                      <h3 className="text-xl font-bold text-foreground">Course Notes & Resource Library</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Structured study materials uploaded by subject professors</p>
                    </div>
                    <span className="btn-primary text-xs px-3 py-1.5 cursor-default">+ Upload Resource</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="glass-card p-4 flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="badge badge-gray text-[10px] mb-1">Notes</span>
                        <h5 className="font-semibold text-foreground text-sm truncate">Unit 3 - Stack & Queue Data Structures.pdf</h5>
                        <p className="text-xs text-muted-foreground mt-0.5">Unit 3 &nbsp;·&nbsp; 2.4 MB &nbsp;·&nbsp; 24 Jul 2026</p>
                        <p className="text-xs text-brand-500 font-medium mt-1">Uploaded by Prof. Anurag</p>
                      </div>
                      <span className="p-2 text-muted-foreground hover:text-brand-500 cursor-pointer"><Download className="w-4 h-4" /></span>
                    </div>

                    <div className="glass-card p-4 flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center flex-shrink-0">
                        <Presentation className="w-5 h-5" opacity={0.9} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="badge badge-gray text-[10px] mb-1">PPT</span>
                        <h5 className="font-semibold text-foreground text-sm truncate">Lecture 8 - Sorting Algorithms & Complexity.pptx</h5>
                        <p className="text-xs text-muted-foreground mt-0.5">Unit 2 &nbsp;·&nbsp; 8.1 MB &nbsp;·&nbsp; 20 Jul 2026</p>
                        <p className="text-xs text-brand-500 font-medium mt-1">Uploaded by Prof. Anurag</p>
                      </div>
                      <span className="p-2 text-muted-foreground hover:text-brand-500 cursor-pointer"><Download className="w-4 h-4" /></span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: DOUBT PORTAL */}
              {activeDemoTab === 'doubts' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <div>
                      <h3 className="text-xl font-bold text-foreground">1-on-1 Student Doubt Portal</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Direct communication ticket between students and subject faculty</p>
                    </div>
                    <span className="badge badge-purple text-xs font-semibold">3 Active Tickets</span>
                  </div>

                  <div className="glass-card p-5 space-y-4 border-l-4 border-l-emerald-500">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="badge badge-purple text-xxs">Ask Doubt</span>
                        <h4 className="font-bold text-foreground text-sm mt-1">Clarification regarding Time Complexity of QuickSort worst case</h4>
                        <p className="text-xs text-muted-foreground">Student: Rohan Gupta &nbsp;·&nbsp; Data Structures</p>
                      </div>
                      <span className="badge badge-green text-xs font-semibold">Resolved</span>
                    </div>
                    <div className="bg-muted/40 p-3 rounded-lg text-xs space-y-2">
                      <p className="text-foreground italic">&ldquo;Prof, in lecture 6, why is QuickSort worst case O(n^2) when array is already sorted?&rdquo;</p>
                      <div className="pt-2 border-t border-border/50 text-brand-500 dark:text-brand-400 font-medium">
                        <strong>Prof. Anurag:</strong> When the array is already sorted and we pick the first/last element as pivot, the partitioning becomes unbalanced (1 vs n-1 elements), resulting in n levels of recursion.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Demo Bar */}
            <div className="px-6 py-4 bg-muted/40 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>💡 Ready to use Campus Connect in your college?</span>
              <div className="flex items-center gap-3">
                <Link href="/register" className="text-brand-500 font-bold hover:underline">
                  Create Your Free Account →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. KEY PLATFORM MODULES GRID ───────────────────────────────────── */}
      <section id="features" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-brand-500 dark:text-brand-400">Everything You Need</h2>
            <p className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
              Powerful Academic Tools in One Place
            </p>
            <p className="text-base text-muted-foreground">
              Designed specifically for higher education institutions to simplify academic management and boost student engagement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Feature 1 */}
            <div className="glass-card p-6 space-y-4 hover:-translate-y-1 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/15 text-brand-500 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Smart Class Workspaces</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Professors create subjects with branch, year & division. Unique 6-character join codes allow students & co-professors to join instantly.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card p-6 space-y-4 hover:-translate-y-1 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Digital Attendance Tracker</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Take session attendance in seconds. Automatic percentage calculations with threshold alerts for students below 75% attendance.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card p-6 space-y-4 hover:-translate-y-1 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                <ClipboardList className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Assignments & Grading</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Post assignments with instructions and attachments. Collect student file submissions and grade them out of 10 with feedback remarks.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="glass-card p-6 space-y-4 hover:-translate-y-1 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-500 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Resource & Study Library</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Organize syllabus, unit-wise notes, PPT slides, question banks, and practical lab manuals with single-click downloads for students.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="glass-card p-6 space-y-4 hover:-translate-y-1 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-red-500/15 text-red-500 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">1-on-1 Student Doubt Portal</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Students raise doubt tickets directly to subject professors with status indicators (<span className="text-yellow-500 font-semibold">Open</span>, <span className="text-emerald-500 font-semibold">Replied</span>, <span className="text-emerald-500 font-semibold">Resolved</span>).
              </p>
            </div>

            {/* Feature 6 */}
            <div className="glass-card p-6 space-y-4 hover:-translate-y-1 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-yellow-500/15 text-yellow-500 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Announcements & Meetings</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Broadcast instant announcements to class streams and schedule video meetings with agenda details for live lectures.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. ROLE-BASED ADVANTAGES ────────────────────────────────────────── */}
      <section id="roles" className="py-20 bg-secondary/20 border-y border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-brand-500 dark:text-brand-400">Tailored Experience</h2>
            <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Built for Professors & Students
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* For Professors */}
            <div className="glass-card p-8 space-y-6 border-l-4 border-l-brand-500">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-500/15 text-brand-500 flex items-center justify-center">
                  <Briefcase className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-foreground">For Professors & Faculty</h3>
              </div>
              
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                  <span>Create division-wise classes with unique join codes for students</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                  <span>Invite co-professors to join classes using the professor join option</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                  <span>Mark attendance per session and monitor average class attendance %</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                  <span>Grade assignments out of 10 and provide feedback remarks to students</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                  <span>Manage and delete queries, notes, and assignments whenever required</span>
                </li>
              </ul>

              <div className="pt-2">
                <Link href="/register" className="btn-primary w-full justify-center">
                  Sign Up as Professor →
                </Link>
              </div>
            </div>

            {/* For Students */}
            <div className="glass-card p-8 space-y-6 border-l-4 border-l-emerald-500">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-foreground">For Students</h3>
              </div>

              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Join subject classes instantly using 6-character class codes</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Track individual attendance percentage & warning flags (&lt;75%)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Submit assignments online with PDF attachments before deadlines</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Download notes, PPTs, question banks, and lab manuals anytime</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Submit 1-on-1 doubt tickets directly to subject professors</span>
                </li>
              </ul>

              <div className="pt-2">
                <Link href="/register" className="btn-secondary w-full justify-center">
                  Sign Up as Student →
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 6. FAQ ACCORDION ─────────────────────────────────────────────────── */}
      <section id="faq" className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-brand-500 dark:text-brand-400">Frequently Asked Questions</h2>
            <p className="text-3xl font-extrabold tracking-tight text-foreground">Have Questions? We Have Answers.</p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "How do students join a class on Campus Connect?",
                a: "Professors generate a unique 6-character join code when creating a class. Students simply click 'Join Class' on their dashboard and enter the code to gain instant access."
              },
              {
                q: "Can professors join another professor's class?",
                a: "Yes! Professors have a 'Join Class' option in their My Classes workspace to join another professor's class as a co-professor using the class join code."
              },
              {
                q: "Is Campus Connect free for colleges?",
                a: "Yes! Campus Connect is 100% free for all students and faculty members."
              },
              {
                q: "How does the attendance system alert students?",
                a: "The system automatically calculates individual student attendance percentages after every session log. If a student's attendance drops below 75%, a warning alert is displayed."
              },
              {
                q: "What files can be uploaded for study materials?",
                a: "Professors can upload PDFs, PPT/PPTX slides, Word documents, images, and syllabus files up to 10MB per resource."
              }
            ].map((faq, idx) => {
              const isOpen = faqOpen === idx
              return (
                <div key={idx} className="glass-card overflow-hidden transition-all">
                  <button
                    onClick={() => setFaqOpen(isOpen ? null : idx)}
                    className="w-full p-5 text-left font-semibold text-foreground flex items-center justify-between gap-4 text-sm sm:text-base hover:bg-muted/40 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-500' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── 7. BOTTOM CTA BANNER ─────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative glass-card p-8 md:p-12 text-center rounded-3xl overflow-hidden bg-gradient-to-br from-brand-500/15 via-indigo-500/10 to-purple-500/15 border border-brand-500/30">
            <div className="max-w-2xl mx-auto space-y-6">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                Ready to Transform Your College Classroom?
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Join professors and students using Campus Connect to streamline class management, attendance, assignments, and study materials.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <Link href="/register" className="btn-primary py-3 px-8 text-base font-bold shadow-lg shadow-brand-500/30">
                  Create Free Account
                </Link>
                <Link href="/login" className="btn-secondary py-3 px-8 text-base font-semibold">
                  Log In to Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card/50 py-12 text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Campus Connect" className="w-7 h-7 rounded-lg object-cover" />
            <span className="font-bold text-foreground text-sm">Campus Connect</span>
          </div>
          <p>© 2026 Campus Connect. Your College Classroom, Connected.</p>
          <div className="flex items-center gap-6 font-medium">
            <Link href="/login" className="hover:text-foreground transition-colors">Log In</Link>
            <Link href="/register" className="hover:text-foreground transition-colors">Create Account</Link>
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          </div>
        </div>
      </footer>
    </div>
  )
}