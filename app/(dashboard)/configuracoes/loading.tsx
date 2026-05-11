import Card from '@/components/ui/Card'

export default function ConfiguracoesLoading() {
  return (
    <div className="p-4 sm:p-8 animate-pulse">
      <div className="mb-8">
        <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-64 bg-gray-100 rounded"></div>
      </div>

      {/* List Skeleton */}
      <Card padding={false}>
        <div className="divide-y divide-gray-100">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/4 bg-gray-200 rounded" />
                <div className="h-3 w-1/3 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
