import Card from '@/components/ui/Card'

export default function NotasFiscaisLoading() {
  return (
    <div className="p-4 sm:p-8 max-w-4xl animate-pulse">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 mb-8">
        <div>
          <div className="h-8 w-32 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 w-48 bg-gray-100 rounded"></div>
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded-xl"></div>
      </div>

      <div className="flex items-center gap-4 border-b border-gray-200 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 w-20 bg-gray-200 rounded mb-3"></div>
        ))}
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-2">
        <div className="h-10 w-full sm:w-48 bg-gray-100 rounded-lg"></div>
        <div className="h-10 w-full sm:w-48 bg-gray-100 rounded-lg"></div>
      </div>

      <Card padding={false}>
        <div className="divide-y divide-gray-100">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0 space-y-2">
                <div className="h-4 w-44 bg-gray-200 rounded"></div>
                <div className="h-3 w-56 bg-gray-100 rounded"></div>
              </div>
              <div className="h-4 w-16 bg-gray-200 rounded flex-shrink-0"></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
