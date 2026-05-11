import Card from '@/components/ui/Card'

export default function AuditoriaDetailLoading() {
  return (
    <div className="p-4 sm:p-8 max-w-3xl animate-pulse">
      {/* Back link */}
      <div className="h-3 w-20 bg-gray-100 rounded mb-4"></div>

      <div className="mb-6">
        <div className="h-8 w-64 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-48 bg-gray-100 rounded"></div>
      </div>

      {/* Summary card */}
      <Card className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-4 h-4 bg-gray-200 rounded-full mt-0.5 shrink-0" />
              <div className="space-y-2">
                <div className="h-3 w-16 bg-gray-100 rounded" />
                <div className="h-4 w-32 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Diff Table Card */}
      <Card padding={false}>
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
          <div className="h-3 w-24 bg-gray-100 rounded"></div>
        </div>
        <div className="divide-y divide-gray-100">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="grid grid-cols-3 px-6 py-4 gap-x-4">
              <div className="h-4 w-20 bg-gray-100 rounded" />
              <div className="h-4 w-24 bg-gray-100 rounded" />
              <div className="h-4 w-24 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
