import Card from '@/components/ui/Card'

export default function PresencaChecklistLoading() {
  return (
    <div className="p-4 sm:p-8 max-w-2xl animate-pulse">
      <div className="h-4 w-20 bg-gray-100 rounded mb-6"></div>

      <div className="mb-8">
        <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-32 bg-gray-100 rounded"></div>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="h-5 w-40 bg-gray-200 rounded mb-6"></div>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className="w-5 h-5 bg-gray-100 rounded border border-gray-200" />
              <div className="h-4 w-1/2 bg-gray-100 rounded" />
            </div>
          ))}
          <div className="mt-8 pt-4">
            <div className="h-10 w-full bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </Card>
    </div>
  )
}
