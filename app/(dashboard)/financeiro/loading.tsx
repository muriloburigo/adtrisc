import Card from '@/components/ui/Card'

export default function FinanceiroLoading() {
  return (
    <div className="p-4 sm:p-8 max-w-4xl animate-pulse">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 mb-8">
        <div>
          <div className="h-8 w-32 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 w-64 bg-gray-100 rounded"></div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="flex items-center gap-4 border-b border-gray-200 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 w-20 bg-gray-200 rounded mb-3"></div>
        ))}
      </div>

      {/* Ano selector */}
      <div className="mb-6 h-16 w-full max-w-xs bg-gray-100 rounded-lg"></div>

      {/* Project cards */}
      <div className="space-y-5">
        {[1, 2].map((i) => (
          <Card key={i}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="space-y-2">
                <div className="h-5 w-48 bg-gray-200 rounded"></div>
                <div className="h-3 w-32 bg-gray-100 rounded"></div>
              </div>
              <div className="h-4 w-16 bg-gray-100 rounded"></div>
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((j) => (
                <div key={j} className="space-y-1.5">
                  <div className="flex justify-between">
                    <div className="h-4 w-28 bg-gray-200 rounded"></div>
                    <div className="h-3 w-24 bg-gray-100 rounded"></div>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full"></div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
              <div className="h-3 w-24 bg-gray-100 rounded"></div>
              <div className="h-3 w-24 bg-gray-100 rounded"></div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
