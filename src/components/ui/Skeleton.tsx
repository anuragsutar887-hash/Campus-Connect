import { cn } from '@/lib/utils'

// ── Core skeleton block ──────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg bg-muted/60',
        'before:absolute before:inset-0 before:-translate-x-full',
        'before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent',
        'before:animate-[shimmer_1.5s_infinite]',
        className
      )}
    />
  )
}

// ── Stat card skeleton (4-up grid on dashboard) ──────────────────────────────
export function StatCardSkeleton() {
  return (
    <div className="glass-card p-5 space-y-3">
      <Skeleton className="w-10 h-10 rounded-xl" />
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  )
}

// ── List-row skeleton (assignments, queries, meetings etc.) ──────────────────
export function RowSkeleton({ rows = 3, height = 'h-16' }: { rows?: number; height?: string }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={`w-full rounded-xl ${height}`} />
      ))}
    </div>
  )
}

// ── Card skeleton (classes grid, meetings grid) ──────────────────────────────
export function CardSkeleton({ count = 3, height = 'h-40' }: { count?: number; height?: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={`w-full rounded-xl ${height}`} />
      ))}
    </div>
  )
}

// ── Dashboard welcome skeleton ───────────────────────────────────────────────
export function WelcomeSkeleton() {
  return (
    <div className="glass-card p-6 space-y-2">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-4 w-48" />
    </div>
  )
}

// ── Announcement card skeleton ───────────────────────────────────────────────
export function AnnouncementSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card p-4 border-l-4 border-l-muted space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}

// ── Table / roster skeleton ──────────────────────────────────────────────────
export function TableRowSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-4">
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

// ── Profile / avatar skeleton ────────────────────────────────────────────────
export function ProfileSkeleton() {
  return (
    <div className="flex items-center gap-3 p-2">
      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
      <div className="space-y-1.5 flex-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

// ── Chat message skeletons ───────────────────────────────────────────────────
export function ChatSkeleton() {
  return (
    <div className="space-y-5 p-4">
      {[false, true, false, true, false].map((isMe, i) => (
        <div key={i} className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
          <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />
          <div className={`space-y-1 ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
            <Skeleton className="h-3 w-20" />
            <Skeleton className={`h-10 rounded-2xl ${isMe ? 'w-40' : 'w-56'}`} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Attendance stats skeleton ─────────────────────────────────────────────────
export function AttendanceStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="glass-card p-5 space-y-4 md:col-span-1">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <div className="glass-card p-5 md:col-span-2 grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-8 w-10" />
          </div>
        ))}
      </div>
    </div>
  )
}
