import Card from '@/components/ui/Card'

export default function AuditoriaLoading() {
  return (
    <div className="p-4 sm:p-8 animate-pulse">
      <div className="mb-8">
        <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-64 bg-gray-100 rounded"></div>
      </div>

      {/* FilterBar Skeleton */}
      <div className="mb-8 h-12 w-full bg-gray-100 rounded-xl"></div>

      {/* List Skeleton */}
      <Card padding={false}>
        <div className="divide-y divide-gray-100">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="px-4 py-3 space-y-2">
              <div className="flex justify-between">
                <div className="h-4 w-1/4 bg-gray-200 rounded" />
                <div className="h-3 w-20 bg-gray-100 rounded" />
              </div>
              <div className="h-3 w-1/2 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
