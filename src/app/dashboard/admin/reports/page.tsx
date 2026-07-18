'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { collection, getDocs, doc, deleteDoc, updateDoc, query, where } from 'firebase/firestore'
import { ClassWorkspace, ChatMessage } from '@/lib/types'
import { formatDate, timeAgo } from '@/lib/utils'
import { Search, Trash2, ArrowLeft, ShieldAlert, Check } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface ReportedMessage extends ChatMessage {
  classId: string
  className: string
}

export default function AdminReportsPage() {
  const { userProfile } = useAuth()
  const [reports, setReports] = useState<ReportedMessage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userProfile || userProfile.role !== 'admin') return

    async function loadReports() {
      try {
        const classesSnap = await getDocs(collection(db, 'classes'))
        const classesList = classesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as ClassWorkspace[]

        const reportedMsgs: ReportedMessage[] = []

        for (const cls of classesList) {
          const msgSnap = await getDocs(
            query(collection(db, 'classes', cls.id, 'messages'), where('reported', '==', true))
          )
          msgSnap.docs.forEach(docSnap => {
            reportedMsgs.push({
              id: docSnap.id,
              classId: cls.id,
              className: cls.subject,
              ...docSnap.data()
            } as ReportedMessage)
          })
        }

        reportedMsgs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setReports(reportedMsgs)
      } catch (err) {
        console.error(err)
        toast.error('Failed to load reported chat content')
      } finally {
        setLoading(false)
      }
    }
    loadReports()
  }, [userProfile])

  const handleDeleteMessage = async (rep: ReportedMessage) => {
    if (!confirm('Permanently delete this message from the class chat database?')) return
    try {
      await deleteDoc(doc(db, 'classes', rep.classId, 'messages', rep.id))
      setReports(prev => prev.filter(r => r.id !== rep.id))
      toast.success('Inappropriate content removed')
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete message')
    }
  }

  const handleDismissReport = async (rep: ReportedMessage) => {
    try {
      await updateDoc(doc(db, 'classes', rep.classId, 'messages', rep.id), { reported: false })
      setReports(prev => prev.filter(r => r.id !== rep.id))
      toast.success('Report dismissed')
    } catch (err) {
      console.error(err)
      toast.error('Failed to dismiss report')
    }
  }

  if (loading) return (
    <DashboardLayout title="Admin Panel">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout title="System Compliance">
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/admin" className="btn-ghost p-2">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Flagged Content</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Review reported student chat messages and enforce campus rules</p>
          </div>
        </div>

        {reports.length === 0 ? (
          <div className="glass-card p-16 text-center text-muted-foreground">
            <ShieldAlert className="w-12 h-12 mx-auto text-emerald-500 opacity-60 mb-4" />
            <p className="font-semibold text-foreground text-base">Clear Compliance Log</p>
            <p className="text-sm mt-1">No student messages have been reported for inappropriate behavior.</p>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            {reports.map(rep => (
              <div key={rep.id} className="glass-card p-5 border border-red-500/20 bg-red-500/2 hover:border-red-500/30 transition-all space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <span className="badge badge-red text-xxs font-semibold">Reported Message</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      Posted by <strong className="text-foreground">{rep.senderName}</strong> in class <span className="text-brand-400 font-semibold">{rep.className}</span> · {timeAgo(rep.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDismissReport(rep)}
                      className="btn-ghost py-1 px-2.5 text-xs border border-border flex items-center gap-1 hover:text-emerald-400"
                      title="Dismiss Report"
                    >
                      <Check className="w-3.5 h-3.5" /> Dismiss
                    </button>
                    <button
                      onClick={() => handleDeleteMessage(rep)}
                      className="btn-primary py-1 px-2.5 text-xs bg-red-600 hover:bg-red-700 shadow-none flex items-center gap-1"
                      title="Remove Message"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete Msg
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-black/40 border border-border/80 text-xs text-foreground italic leading-relaxed">
                  &ldquo;{rep.text}&rdquo;
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
