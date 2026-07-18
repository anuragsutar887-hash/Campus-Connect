'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import {
  collection, query, orderBy, getDocs, doc, updateDoc, writeBatch
} from 'firebase/firestore'
import { Notification } from '@/lib/types'
import { timeAgo } from '@/lib/utils'
import { Bell, CheckCircle, Info, Trash2, CalendarCheck, FileText, HelpCircle, Video, BookOpen, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function NotificationsPage() {
  const { userProfile } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userProfile?.uid) return
    async function loadNotifications() {
      try {
        const snap = await getDocs(
          query(collection(db, 'notifications', userProfile!.uid, 'items'), orderBy('createdAt', 'desc'))
        )
        setNotifications(snap.docs.map(d => {
          const data = d.data()
          const createdAtStr = data.createdAt?.seconds 
            ? new Date(data.createdAt.seconds * 1000).toISOString()
            : data.createdAt || new Date().toISOString()
            
          return {
            id: d.id,
            ...data,
            createdAt: createdAtStr
          }
        }) as Notification[])
      } catch (err) {
        console.error(err)
        toast.error('Failed to load notifications')
      } finally {
        setLoading(false)
      }
    }
    loadNotifications()
  }, [userProfile])

  const handleMarkAllRead = async () => {
    if (!userProfile || notifications.length === 0) return
    const unread = notifications.filter(n => !n.read)
    if (unread.length === 0) return

    try {
      const batch = writeBatch(db)
      unread.forEach(n => {
        const ref = doc(db, 'notifications', userProfile.uid, 'items', n.id)
        batch.update(ref, { read: true })
      })
      await batch.commit()

      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      toast.success('All notifications marked as read')
    } catch (err) {
      console.error(err)
      toast.error('Failed to update notifications')
    }
  }

  const handleMarkRead = async (id: string) => {
    if (!userProfile) return
    try {
      const ref = doc(db, 'notifications', userProfile.uid, 'items', id)
      await updateDoc(ref, { read: true })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    } catch (err) {
      console.error(err)
    }
  }

  const getNotifIcon = (type: string) => {
    const classes = "w-5 h-5 flex-shrink-0 "
    switch (type) {
      case 'class_join':
        return <BookOpen className={classes + "text-brand-400"} />
      case 'resource_upload':
        return <FileText className={classes + "text-purple-400"} />
      case 'assignment_new':
      case 'assignment_submit':
      case 'assignment_graded':
        return <CheckCircle className={classes + "text-yellow-400"} />
      case 'attendance_update':
        return <CalendarCheck className={classes + "text-emerald-400"} />
      case 'query_new':
      case 'query_update':
        return <HelpCircle className={classes + "text-red-400"} />
      case 'meeting_new':
        return <Video className={classes + "text-blue-400"} />
      default:
        return <Bell className={classes + "text-muted-foreground"} />
    }
  }

  if (loading) return (
    <DashboardLayout title="Notifications">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout title="Notifications">
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground mt-1">Stay updated with classroom materials, gradings and schedules</p>
          </div>
          {notifications.some(n => !n.read) && (
            <button onClick={handleMarkAllRead} className="btn-ghost text-xs border border-border">
              Mark all as read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="glass-card p-16 text-center text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto opacity-30 mb-4 animate-bounce" />
            <p className="font-semibold text-foreground">All caught up!</p>
            <p className="text-sm mt-1">You will receive notifications here for updates in your classes.</p>
          </div>
        ) : (
          <div className="glass-card divide-y divide-border/40 overflow-hidden">
            {notifications.map(n => {
              const content = (
                <div className={`p-4 flex items-start gap-4 transition-all hover:bg-white/3 ${!n.read ? 'bg-brand-500/2' : ''}`}>
                  <div className="mt-0.5">
                    {getNotifIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${!n.read ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>{n.title}</p>
                      {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{n.message}</p>
                    <p className="text-xxs text-muted-foreground">{timeAgo(n.createdAt)}</p>
                  </div>
                  {n.link && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 self-center" />}
                </div>
              )

              return n.link ? (
                <Link
                  key={n.id}
                  href={n.link}
                  onClick={() => handleMarkRead(n.id)}
                  className="block"
                >
                  {content}
                </Link>
              ) : (
                <div key={n.id} onClick={() => handleMarkRead(n.id)} className="cursor-pointer">
                  {content}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
