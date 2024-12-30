import { Skeleton } from '@/components/ui/skeleton'

export default function InstancesLoading() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>
        <Skeleton className="h-10 w-[150px]" /> {/* New Instance button */}
      </div>

      {/* Instances grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <Skeleton className="h-6 w-[160px]" /> {/* Instance name */}
                <Skeleton className="h-4 w-[120px]" /> {/* Status */}
              </div>
              <Skeleton className="h-8 w-8 rounded-full" /> {/* Status indicator */}
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="flex justify-between items-center pt-4">
              <Skeleton className="h-4 w-[100px]" /> {/* Created date */}
              <Skeleton className="h-9 w-[100px]" /> {/* Action button */}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 