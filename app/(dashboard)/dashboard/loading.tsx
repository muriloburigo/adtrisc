import Card from '@/components/ui/Card'

export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-8 animate-pulse">
      <div className="mb-8">
        <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-64 bg-gray-100 rounded"></div>
      </div>

      {/* Stats Skeletons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="h-32">
            <></>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ocupação Skeletons */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-4 w-32 bg-gray-200 rounded"></div>
            <div className="h-3 w-16 bg-gray-100 rounded"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="h-40"><></></Card>
            ))}
          </div>
        </div>

        {/* Sidebar Skeletons */}
        <div className="space-y-6">
          <div>
            <div className="h-4 w-32 bg-gray-200 rounded mb-3"></div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="h-16"><></></Card>
              ))}
            </div>
          </div>
          <div>
            <div className="h-4 w-32 bg-gray-200 rounded mb-3"></div>
            <Card className="h-64"><></></Card>
          </div>
        </div>
      </div>
    </div>
  )
}
