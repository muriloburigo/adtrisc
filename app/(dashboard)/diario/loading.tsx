import Card from '@/components/ui/Card'

export default function DiarioLoading() {
  return (
    <div className="p-4 sm:p-8 max-w-4xl space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-44 bg-gray-200 rounded"></div>
        <Card>
          <div className="flex flex-wrap gap-3">
            <div className="h-10 w-32 bg-gray-100 rounded-lg"></div>
            <div className="h-10 w-24 bg-gray-100 rounded-lg"></div>
            <div className="h-10 w-48 bg-gray-100 rounded-lg"></div>
          </div>
        </Card>
      </div>

      {/* Resumo do mês */}
      <Card>
        <div className="h-4 w-32 bg-gray-200 rounded mb-4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-10 bg-gray-100 rounded-lg"></div>
          <div className="h-10 bg-gray-100 rounded-lg"></div>
        </div>
        <div className="h-24 w-full bg-gray-100 rounded-lg mt-4"></div>
      </Card>

      {/* Days table */}
      <Card padding={false}>
        <div className="divide-y divide-gray-100">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="h-4 w-16 bg-gray-200 rounded flex-shrink-0"></div>
              <div className="h-4 w-24 bg-gray-100 rounded flex-shrink-0"></div>
              <div className="h-4 flex-1 bg-gray-100 rounded"></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
