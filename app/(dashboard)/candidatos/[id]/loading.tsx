import Card from '@/components/ui/Card'

export default function CandidatoDetailLoading() {
  return (
    <div className="p-4 sm:p-8 max-w-3xl animate-pulse">
      {/* Back link */}
      <div className="h-3 w-20 bg-gray-100 rounded mb-4"></div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="h-8 w-64 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 w-48 bg-gray-100 rounded"></div>
        </div>
        <div className="h-10 w-40 bg-gray-200 rounded-lg"></div>
      </div>

      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((section) => (
          <Card key={section}>
            <div className="h-4 w-32 bg-gray-200 rounded mb-4 pb-2 border-b border-gray-100"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((row) => (
                <div key={row} className="flex flex-col sm:flex-row gap-1 py-1 border-b border-gray-50 last:border-0">
                  <div className="h-3 w-32 bg-gray-100 rounded"></div>
                  <div className="h-3 w-48 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
