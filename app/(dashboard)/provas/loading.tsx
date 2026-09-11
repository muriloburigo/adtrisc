import Card from '@/components/ui/Card'

export default function ProvasLoading() {
  return (
    <div className="p-4 sm:p-8 max-w-4xl animate-pulse">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 mb-8">
        <div>
          <div className="h-8 w-32 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 w-64 bg-gray-100 rounded"></div>
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded-xl"></div>
      </div>

      {/* FilterBar Skeleton */}
      <div className="mb-8 h-12 w-full bg-gray-100 rounded-xl"></div>

      <Card padding={false}>
        <div className="divide-y divide-gray-100">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0 space-y-2">
                <div className="h-4 w-40 bg-gray-200 rounded"></div>
                <div className="h-3 w-28 bg-gray-100 rounded"></div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="space-y-1 text-right">
                  <div className="h-3 w-16 bg-gray-100 rounded ml-auto"></div>
                  <div className="h-4 w-6 bg-gray-200 rounded ml-auto"></div>
                </div>
                <div className="space-y-1 text-right">
                  <div className="h-3 w-16 bg-gray-100 rounded ml-auto"></div>
                  <div className="h-4 w-6 bg-gray-200 rounded ml-auto"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
