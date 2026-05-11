import Card from '@/components/ui/Card'

export default function CandidatosLoading() {
  return (
    <div className="p-4 sm:p-8 animate-pulse">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 mb-8">
        <div>
          <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 w-64 bg-gray-100 rounded"></div>
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded-xl"></div>
      </div>

      {/* FilterBar Skeleton */}
      <div className="mb-8 h-12 w-full bg-gray-100 rounded-xl"></div>

      {/* List Skeleton */}
      <Card padding={false}>
        <div className="divide-y divide-gray-100">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-gray-200 rounded" />
                <div className="h-3 w-1/2 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
