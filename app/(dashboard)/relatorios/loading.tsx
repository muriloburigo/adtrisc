import Card from '@/components/ui/Card'

export default function RelatoriosLoading() {
  return (
    <div className="p-4 sm:p-8 space-y-4 animate-pulse">
      <div className="mb-2">
        <div className="h-8 w-40 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-48 bg-gray-100 rounded"></div>
      </div>

      {/* Relatórios prontos */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="h-3 w-14 bg-gray-100 rounded mr-1"></div>
        {[28, 32, 26, 44, 36, 40, 24].map((w, i) => (
          <div key={i} className="h-6 bg-gray-100 rounded-full" style={{ width: `${w * 4}px` }}></div>
        ))}
      </div>

      {/* Critério de avaliação + filtros */}
      <Card>
        <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-gray-100">
          <div className="h-4 w-44 bg-gray-200 rounded"></div>
          <div className="h-8 w-72 bg-gray-100 rounded-lg"></div>
        </div>
        <div className="rounded-xl border border-gray-100 px-3 py-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-16 bg-gray-200 rounded"></div>
            <div className="h-7 w-14 bg-gray-100 rounded-lg"></div>
          </div>
          <div className="flex gap-1.5 mt-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-6 w-20 bg-gray-100 rounded-full"></div>)}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
          <div className="h-4 w-24 bg-gray-100 rounded"></div>
        </div>
      </Card>

      {/* Resultado */}
      <Card padding={false}>
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="h-4 w-24 bg-gray-200 rounded"></div>
        </div>
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex gap-8">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-3 w-20 bg-gray-200 rounded"></div>)}
        </div>
        <div className="divide-y divide-gray-100">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="px-4 py-3 flex gap-8 items-center">
              <div className="h-4 w-48 bg-gray-200 rounded"></div>
              {[1, 2, 3, 4].map((j) => <div key={j} className="h-4 w-20 bg-gray-100 rounded"></div>)}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
