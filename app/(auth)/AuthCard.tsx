import Image from 'next/image'

// Moldura simples das telas públicas de senha (esqueci / redefinir).
export default function AuthCard({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 p-8">
        <Image src="/logo.png" alt="ADTRISC" width={56} height={56} className="mx-auto mb-4 h-14 w-auto" />
        <h1 className="text-lg font-bold text-navy-500 text-center mb-6">{titulo}</h1>
        {children}
      </div>
    </div>
  )
}
