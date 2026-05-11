import Card from '@/components/ui/Card'

export default function AlunoDetailLoading() {
  return (
    <div className="p-4 sm:p-8 animate-pulse">
      {/* BackButton Skeleton */}
      <div className="h-4 w-20 bg-gray-100 rounded mb-6"></div>

      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 mb-8">
        <div>
          <div className="h-8 w-64 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 w-32 bg-gray-100 rounded"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-28 bg-gray-200 rounded-xl"></div>
          <div className="h-10 w-24 bg-gray-200 rounded-xl"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Info principal */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gray-200 rounded-full" />
              <div className="space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-16 bg-gray-100 rounded" />
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
            <div className="h-4 w-full bg-gray-100 rounded" />
          </Card>
        </div>

        {/* Coluna direita */}
        <div className="space-y-6">
          <Card>
            <div className="h-4 w-32 bg-gray-200 rounded mb-6" />
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                  <div className="h-4 w-32 bg-gray-100 rounded" />
                  <div className="h-3 w-24 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
            <div className="h-20 w-full bg-gray-50 rounded" />
          </Card>

          <Card>
            <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-8 w-8 bg-gray-100 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-full bg-gray-100 rounded" />
                    <div className="h-2 w-1/2 bg-gray-50 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
