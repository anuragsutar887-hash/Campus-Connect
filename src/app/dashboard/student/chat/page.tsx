'use client'
export const dynamic = 'force-dynamic'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { ClassWorkspace, ChatMessage } from '@/lib/types'
import { timeAgo, getInitials } from '@/lib/utils'
import { MessageCircle, Send, Users } from 'lucide-react'
import { toast } from 'sonner'

function StudentChatPageContent() {
  const { userProfile } = useAuth()
  const searchParams = useSearchParams()
  const urlClassId = searchParams.get('classId')

  const [classes, setClasses]               = useState<ClassWorkspace[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [messages, setMessages]             = useState<ChatMessage[]>([])
  const [loading, setLoading]               = useState(true)
  const [inputText, setInputText]           = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ── Load enrolled classes ─────────────────────────────────────────────────
  useEffect(() => {
    if (!userProfile?.uid) return
    supabase.from('classes').select('*').contains('students', [userProfile.uid])
      .then(({ data }) => {
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
  }, [userProfile, urlClassId])

  // ── Real-time messages via Supabase Realtime ───────────────────────────────
  useEffect(() => {
    if (!selectedClassId) return

    // Initial load
    supabase.from('chat_messages').select('*')
      .eq('class_id', selectedClassId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages((data ?? []).map(r => ({
          id: r.id, text: r.text, senderId: r.sender_id,
          senderName: r.sender_name, createdAt: r.created_at,
        })) as ChatMessage[])
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      })

    // Real-time subscription
    const channel = supabase
      .channel(`chat:${selectedClassId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `class_id=eq.${selectedClassId}`
      }, (payload) => {
        const r = payload.new as Record<string, string>
        setMessages(prev => [...prev, {
          id: r.id, text: r.text, senderId: r.sender_id,
          senderName: r.sender_name, createdAt: r.created_at,
        } as ChatMessage])
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedClassId])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || !selectedClassId || !userProfile) return
    const text = inputText.trim()
    setInputText('')

    const { error } = await supabase.from('chat_messages').insert([{
      class_id:    selectedClassId,
      text,
      sender_id:   userProfile.uid,
      sender_name: userProfile.name,
    }])
    if (error) { toast.error('Failed to send'); setInputText(text) }
  }

  if (loading) return (
    <DashboardLayout title="Class Chat">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  )

  const activeClass = classes.find(c => c.id === selectedClassId)

  return (
    <DashboardLayout title="Class Chat">
      <div className="space-y-4 h-[calc(100vh-12rem)] flex flex-col animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 border border-border p-4 rounded-xl flex-shrink-0">
          <div>
            <h1 className="text-sm font-bold text-foreground flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-brand-400" /> Class Group Chat
            </h1>
            <p className="text-xxs text-muted-foreground mt-0.5">Real-time chat with your class.</p>
          </div>
          <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="input-field py-1.5 text-xs max-w-xs">
            {classes.length === 0
              ? <option value="">No enrolled classes</option>
              : classes.map(c => <option key={c.id} value={c.id}>{c.subject} ({c.division})</option>)}
          </select>
        </div>

        {classes.length === 0 ? (
          <div className="glass-card p-16 text-center flex-1 flex flex-col justify-center items-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground opacity-30 mb-4" />
            <p className="text-foreground font-medium">Not enrolled in any classes</p>
            <p className="text-muted-foreground text-sm mt-1">Join a class to access group chat.</p>
          </div>
        ) : (
          <div className="flex-1 glass-card flex flex-col overflow-hidden min-h-0 border border-border">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-muted-foreground text-xs space-y-2">
                  <Users className="w-8 h-8 opacity-30 animate-pulse" />
                  <p>No messages yet. Say hello!</p>
                </div>
              ) : messages.map((msg, i) => {
                const isMe = msg.senderId === userProfile?.uid
                return (
                  <div key={msg.id || i} className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <div className="avatar w-7 h-7 text-[10px] flex-shrink-0">
                      <span>{getInitials(msg.senderName)}</span>
                    </div>
                    <div className="max-w-[70%] space-y-1">
                      <div className={`text-[10px] text-muted-foreground px-1 ${isMe ? 'text-right' : ''}`}>
                        {msg.senderName} · {timeAgo(msg.createdAt)}
                      </div>
                      <div className={`p-3 rounded-2xl text-xs whitespace-pre-wrap leading-relaxed ${isMe ? 'bg-brand-500 text-white rounded-tr-none' : 'bg-muted text-foreground rounded-tl-none'}`}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSend} className="p-3 border-t border-border bg-muted/20 flex gap-2 flex-shrink-0">
              <input
                type="text" value={inputText} onChange={e => setInputText(e.target.value)}
                placeholder={`Message #${activeClass?.subject.substring(0, 15) || 'chat'}...`}
                className="input-field flex-1" maxLength={500}
              />
              <button type="submit" disabled={!inputText.trim()} className="btn-primary px-4 py-2">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function StudentChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <StudentChatPageContent />
    </Suspense>
  )
}
