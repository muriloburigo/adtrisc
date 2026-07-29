import Card from '@/components/ui/Card'

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="h-32">
          <div className="flex items-center justify-between mb-3">
            <div className="h-3 w-20 bg-gray-100 rounded"></div>
            <div className="h-5 w-5 bg-gray-100 rounded"></div>
          </div>
          <div className="h-10 w-16 bg-gray-200 rounded"></div>
        </Card>
      ))}
    </div>
  )
}

export function TurmasOcupacaoSkeleton() {
  return (
    <div className="lg:col-span-2 space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 bg-gray-200 rounded"></div>
        <div className="h-3 w-16 bg-gray-100 rounded"></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="h-40">
            <div className="h-4 w-3/4 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 w-1/2 bg-gray-100 rounded mb-4"></div>
            <div className="h-3 w-full bg-gray-100 rounded mb-2"></div>
            <div className="h-2 w-full bg-gray-100 rounded"></div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function RecentPresencasSkeleton() {
  return (
    <div>
      <div className="h-4 w-32 bg-gray-200 rounded mb-3"></div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="h-16"><></></Card>
        ))}
      </div>
    </div>
  )
}

export function UltimosAtletasSkeleton() {
  return (
    <div>
      <div className="h-4 w-32 bg-gray-200 rounded mb-3"></div>
      <Card className="h-64"><></></Card>
    </div>
  )
}

export function FaltasAlertSkeleton() {
  return (
    <div>
      <div className="h-4 w-56 bg-gray-200 rounded mb-3"></div>
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <Card key={i} className="h-14"><></></Card>
        ))}
      </div>
    </div>
  )
}

export function NovosCandidatosAlertSkeleton() {
  return <Card className="h-16"><></></Card>
}
