import { Skeleton } from '@/components/ui/skeleton'

export default function DataSourcesLoading() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="h-4 w-[350px]" />
        </div>
        <Skeleton className="h-10 w-[180px]" /> {/* Add Data Source button */}
      </div>

      {/* Data Sources grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-6 space-y-4">
            <div className="flex items-start gap-4">
              <Skeleton className="h-12 w-12 rounded-lg" /> {/* Source icon */}
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-[140px]" /> {/* Source name */}
                <Skeleton className="h-4 w-[100px]" /> {/* Source type */}
              </div>
              <Skeleton className="h-8 w-8 rounded-full" /> {/* Status indicator */}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-[120px]" /> {/* Last synced */}
                <Skeleton className="h-4 w-[80px]" /> {/* Document count */}
              </div>
              <Skeleton className="h-2 w-full rounded-full" /> {/* Progress bar */}
            </div>
            <div className="flex justify-end gap-2">
              <Skeleton className="h-9 w-[90px]" /> {/* Sync button */}
              <Skeleton className="h-9 w-[90px]" /> {/* Settings button */}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 