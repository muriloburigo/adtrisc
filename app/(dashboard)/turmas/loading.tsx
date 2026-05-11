import Card from '@/components/ui/Card'

export default function TurmasLoading() {
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

      {/* Grid Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="h-64">
            <div className="flex items-start justify-between mb-3">
              <div className="h-5 w-3/4 bg-gray-200 rounded"></div>
              <div className="h-5 w-16 bg-gray-100 rounded-full"></div>
            </div>
            <div className="h-3 w-1/3 bg-gray-100 rounded mb-6"></div>
            <div className="space-y-3">
              <div className="h-4 w-full bg-gray-100 rounded"></div>
              <div className="h-4 w-1/2 bg-gray-100 rounded"></div>
              <div className="h-2 w-full bg-gray-100 rounded"></div>
            </div>
            <div className="mt-8 pt-4 border-t border-gray-100">
              <div className="h-3 w-1/2 bg-gray-100 rounded"></div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
