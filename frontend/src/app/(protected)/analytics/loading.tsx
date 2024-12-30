import { Skeleton } from '@/components/ui/skeleton'

export default function AnalyticsLoading() {
  return (
    <div className="container mx-auto p-4 space-y-8">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-4 w-[300px]" />
      </div>

      {/* Stats cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-2">
            <Skeleton className="h-4 w-[100px]" /> {/* Stat label */}
            <Skeleton className="h-8 w-[120px]" /> {/* Stat value */}
            <Skeleton className="h-2 w-full" /> {/* Trend indicator */}
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Usage over time chart */}
        <div className="rounded-lg border p-6 space-y-4">
          <Skeleton className="h-6 w-[150px]" /> {/* Chart title */}
          <Skeleton className="h-[300px] w-full" /> {/* Chart area */}
        </div>

        {/* Top queries chart */}
        <div className="rounded-lg border p-6 space-y-4">
          <Skeleton className="h-6 w-[150px]" /> {/* Chart title */}
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-full" /> {/* Query text */}
                <Skeleton className="h-4 w-[60px]" /> {/* Query count */}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent activity table */}
      <div className="rounded-lg border">
        <div className="p-4 border-b">
          <Skeleton className="h-6 w-[150px]" /> {/* Table title */}
        </div>
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" /> {/* Activity description */}
                <Skeleton className="h-3 w-1/4" /> {/* Timestamp */}
              </div>
              <Skeleton className="h-8 w-8 rounded-full" /> {/* Status icon */}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 