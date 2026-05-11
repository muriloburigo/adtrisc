import {
  StatsSkeleton,
  TurmasOcupacaoSkeleton,
  RecentPresencasSkeleton,
  UltimosAtletasSkeleton
} from './_components/Skeletons'

export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-8 animate-pulse">
      <div className="mb-8">
        <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-64 bg-gray-100 rounded"></div>
      </div>

      <StatsSkeleton />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TurmasOcupacaoSkeleton />

        <div className="space-y-6">
          <RecentPresencasSkeleton />
          <UltimosAtletasSkeleton />
        </div>
      </div>
    </div>
  )
}
