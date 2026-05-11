import Card from '@/components/ui/Card'

export default function AvaliacoesLoading() {
  return (
    <div className="p-4 sm:p-8 max-w-4xl space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-64 bg-gray-100 rounded"></div>
      </div>

      {/* Selector Card */}
      <Card>
        <div className="h-4 w-40 bg-gray-200 rounded mb-4"></div>
        <div className="h-10 w-full bg-gray-100 rounded-xl"></div>
      </Card>

      {/* History Section */}
      <div className="space-y-4">
        <div className="h-4 w-24 bg-gray-200 rounded"></div>
        
        {/* FilterBar Skeleton */}
        <div className="h-12 w-full bg-gray-100 rounded-xl"></div>

        <Card padding={false}>
          <div className="divide-y divide-gray-100">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between px-5 py-4">
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-1/4 bg-gray-200 rounded"></div>
                  <div className="h-3 w-1/6 bg-gray-100 rounded"></div>
                </div>
                <div className="flex gap-4 items-center">
                  <div className="h-6 w-8 bg-gray-100 rounded"></div>
                  <div className="h-6 w-24 bg-gray-100 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
