import Card from '@/components/ui/Card'
import BackButton from '@/components/ui/BackButton'

export default function TurmaDetailLoading() {
  return (
    <div className="p-4 sm:p-8 animate-pulse">
      <BackButton />
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 mb-8">
        <div>
          <div className="h-8 w-64 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 w-48 bg-gray-100 rounded"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-gray-100 rounded-xl"></div>
          <div className="h-10 w-24 bg-gray-100 rounded-xl"></div>
        </div>
      </div>

      {/* Info Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="h-20">
            <div className="h-3 w-16 bg-gray-100 rounded mb-2"></div>
            <div className="h-4 w-24 bg-gray-200 rounded"></div>
          </Card>
        ))}
      </div>

      {/* Alunos Header Skeleton */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="h-6 w-40 bg-gray-200 rounded"></div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-32 bg-gray-100 rounded-lg"></div>
          <div className="h-9 w-40 bg-gray-100 rounded-lg"></div>
        </div>
      </div>

      {/* Alunos Table Skeleton */}
      <Card padding={false}>
        <div className="h-64 w-full bg-gray-50 rounded-xl"></div>
      </Card>

      {/* Galeria Skeleton */}
      <div className="mt-10">
        <div className="h-6 w-40 bg-gray-200 rounded mb-4"></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-video bg-gray-100 rounded-xl"></div>
          ))}
        </div>
      </div>
    </div>
  )
}
