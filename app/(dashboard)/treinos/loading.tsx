export default function TreinosLoading() {
  return (
    <div className="p-4 sm:p-8 space-y-4 animate-pulse">
      <div>
        <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-32 bg-gray-100 rounded"></div>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-8 w-24 bg-gray-100 rounded-lg"></div>)}
      </div>
      <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_96px] gap-1">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="min-h-[220px] rounded-xl border border-gray-100 bg-white p-2 space-y-2">
            <div className="h-3 w-10 bg-gray-100 rounded"></div>
            {i % 3 === 0 && <div className="h-12 bg-gray-100 rounded-lg"></div>}
          </div>
        ))}
      </div>
    </div>
  )
}
