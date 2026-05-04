'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou senha inválidos.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex">
      {/* Painel esquerdo — identidade visual */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0C143D 0%, #1a2660 60%, #0C143D 100%)' }}
      >
        {/* Círculos decorativos */}
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: '#2AABE1' }}
        />
        <div
          className="absolute -bottom-40 -right-24 w-[28rem] h-[28rem] rounded-full opacity-10"
          style={{ background: '#EB2127' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
          style={{ background: '#2AABE1' }}
        />

        {/* Conteúdo */}
        <div className="relative z-10 flex flex-col items-center text-center px-12">
          <Image
            src="/logo.jpg"
            alt="ADTRISC"
            width={180}
            height={180}
            className="object-contain drop-shadow-2xl mb-8"
            priority
          />
          <h1 className="text-4xl font-black text-white tracking-wider mb-3">
            ADTRISC
          </h1>
          <p className="text-sm font-medium leading-relaxed" style={{ color: '#2AABE1' }}>
            Associação Desportiva Triatlética<br />de Santa Catarina
          </p>
          <div className="mt-10 w-16 h-0.5 rounded-full" style={{ background: '#EB2127' }} />
          <p className="mt-6 text-xs text-white/40 leading-relaxed max-w-xs">
            Sistema de gestão da escolinha de triathlon
          </p>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 py-12">
        {/* Logo mobile (só aparece em telas pequenas) */}
        <div className="flex flex-col items-center mb-10 lg:hidden">
          <Image
            src="/logo.jpg"
            alt="ADTRISC"
            width={80}
            height={80}
            className="object-contain mb-3"
            priority
          />
          <h1 className="text-xl font-black tracking-wider" style={{ color: '#0C143D' }}>ADTRISC</h1>
          <p className="text-xs text-center mt-1" style={{ color: '#2AABE1' }}>
            Associação Desportiva Triatlética de Santa Catarina
          </p>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold" style={{ color: '#0C143D' }}>Bem-vindo</h2>
            <p className="text-sm text-gray-400 mt-1">Acesse sua conta para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#0C143D' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm transition-all outline-none"
                style={{ color: '#0C143D' }}
                onFocus={(e) => { e.target.style.borderColor = '#2AABE1'; e.target.style.boxShadow = '0 0 0 3px rgba(42,171,225,0.12)' }}
                onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none' }}
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#0C143D' }}>
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm transition-all outline-none"
                style={{ color: '#0C143D' }}
                onFocus={(e) => { e.target.style.borderColor = '#2AABE1'; e.target.style.boxShadow = '0 0 0 3px rgba(42,171,225,0.12)' }}
                onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none' }}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(235,33,39,0.07)', color: '#EB2127' }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="#EB2127" strokeWidth="1.5"/>
                  <path d="M8 5v3.5M8 11h.01" stroke="#EB2127" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 mt-2"
              style={{ background: loading ? '#2AABE1' : '#0C143D' }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#2AABE1' }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = '#0C143D' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Entrando...
                </span>
              ) : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-300 mt-10">
            © {new Date().getFullYear()} ADTRISC — Todos os direitos reservados
          </p>
        </div>
      </div>
    </div>
  )
}
