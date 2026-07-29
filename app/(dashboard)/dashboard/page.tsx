import { Suspense } from 'react'
import StatsSection from './_components/StatsSection'
import TurmasOcupacaoSection from './_components/TurmasOcupacaoSection'
import RecentPresencasSection from './_components/RecentPresencasSection'
import UltimosAtletasSection from './_components/UltimosAtletasSection'
import FaltasAlertSection from './_components/FaltasAlertSection'
import NovosCandidatosAlertSection from './_components/NovosCandidatosAlertSection'
import {
  StatsSkeleton,
  TurmasOcupacaoSkeleton,
  RecentPresencasSkeleton,
  UltimosAtletasSkeleton,
  FaltasAlertSkeleton,
  NovosCandidatosAlertSkeleton
} from './_components/Skeletons'

export default function DashboardPage() {
  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy-500">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Visão geral da escolinha</p>
      </div>

      {/* Stats - Independente */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection />
      </Suspense>

      {/* Alertas — Independentes */}
      <div className="mb-6 space-y-4">
        <Suspense fallback={<NovosCandidatosAlertSkeleton />}>
          <NovosCandidatosAlertSection />
        </Suspense>
        <Suspense fallback={<FaltasAlertSkeleton />}>
          <FaltasAlertSection />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ocupação das turmas — Independente */}
        <Suspense fallback={<TurmasOcupacaoSkeleton />}>
          <TurmasOcupacaoSection />
        </Suspense>

        {/* Coluna direita */}
        <div className="space-y-6">
          {/* Presenças recentes — Independente */}
          <Suspense fallback={<RecentPresencasSkeleton />}>
            <RecentPresencasSection />
          </Suspense>

          {/* Últimos atletas — Independente */}
          <Suspense fallback={<UltimosAtletasSkeleton />}>
            <UltimosAtletasSection />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
