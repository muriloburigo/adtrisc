import Card from '@/components/ui/Card'

export default function ImprensaLoading() {
  return (
    <div className="p-4 sm:p-8 max-w-5xl animate-pulse">
      <div className="mb-8">
        <div className="h-8 w-28 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-72 bg-gray-100 rounded"></div>
      </div>

      {/* Add-link form skeleton */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
          <div className="flex-1 w-full space-y-1.5">
            <div className="h-4 w-24 bg-gray-200 rounded"></div>
            <div className="h-10 w-full bg-gray-100 rounded-lg"></div>
          </div>
          <div className="h-10 w-32 bg-gray-200 rounded-lg flex-shrink-0"></div>
        </div>
      </Card>

      {/* Card grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="aspect-[16/9] bg-gray-100"></div>
            <div className="p-4 space-y-3">
              <div className="h-4 w-full bg-gray-200 rounded"></div>
              <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
              <div className="h-3 w-full bg-gray-100 rounded"></div>
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <div className="h-3 w-20 bg-gray-100 rounded"></div>
                <div className="h-3 w-12 bg-gray-100 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
