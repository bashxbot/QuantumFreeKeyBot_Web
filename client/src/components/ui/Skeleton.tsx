import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-gradient-to-r from-[rgba(255,255,255,0.05)] via-[rgba(255,255,255,0.1)] to-[rgba(255,255,255,0.05)] rounded-lg',
        className
      )}
    />
  )
}

export function StatCardSkeleton() {
  return (
    <div className="bg-[rgba(20,20,20,0.8)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <Skeleton className="w-16 h-6 rounded-lg" />
      </div>
      <Skeleton className="w-20 h-4 mb-2 rounded" />
      <Skeleton className="w-24 h-8 rounded" />
    </div>
  )
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="bg-[rgba(15,15,15,0.6)] border-b border-[rgba(255,255,255,0.05)]">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <Skeleton className="h-4 w-full max-w-[150px] rounded" />
        </td>
      ))}
    </tr>
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-[rgba(20,20,20,0.8)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="flex-1">
          <Skeleton className="w-32 h-5 mb-2 rounded" />
          <Skeleton className="w-24 h-4 rounded" />
        </div>
      </div>
      <Skeleton className="w-full h-4 rounded" />
      <Skeleton className="w-3/4 h-4 rounded" />
    </div>
  )
}
