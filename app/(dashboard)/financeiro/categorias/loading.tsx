import Card from '@/components/ui/Card'

export default function CategoriasFinanceirasLoading() {
  return (
    <div className="p-4 sm:p-8 max-w-2xl animate-pulse">
      <div className="mb-8">
        <div className="h-8 w-32 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-72 bg-gray-100 rounded"></div>
      </div>

      <div className="flex items-center gap-4 border-b border-gray-200 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 w-20 bg-gray-200 rounded mb-3"></div>
        ))}
      </div>

      <div className="flex gap-2 mb-6">
        <div className="h-10 flex-1 bg-gray-100 rounded-lg"></div>
        <div className="h-10 w-28 bg-gray-200 rounded-lg"></div>
      </div>

      <Card padding={false}>
        <div className="divide-y divide-gray-100">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
              <div className="h-4 w-16 bg-gray-100 rounded"></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
