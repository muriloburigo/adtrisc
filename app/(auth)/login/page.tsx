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
        style={{ background: '#0C143D' }}
      >
        {/* Bloco azul claro — topo esquerdo (referência ao escudo) */}
        <div
          className="absolute inset-0"
          style={{
            background: '#2AABE1',
            clipPath: 'polygon(0 0, 62% 0, 28% 100%, 0 100%)',
          }}
        />
        {/* Bloco vermelho — base direita */}
        <div
          className="absolute inset-0"
          style={{
            background: '#EB2127',
            clipPath: 'polygon(100% 42%, 100% 100%, 38% 100%)',
          }}
        />
        {/* Faixa navy diagonal central (como no escudo) */}
        <div
          className="absolute inset-0"
          style={{
            background: '#0C143D',
            clipPath: 'polygon(55% 0, 100% 0, 100% 42%, 38% 100%, 28% 100%, 62% 0)',
          }}
        />
        {/* Linhas brancas de separação (como no escudo) */}
        <div className="absolute inset-0 pointer-events-none">
          <svg width="100%" height="100%" viewBox="0 0 400 600" preserveAspectRatio="none">
            <line x1="248" y1="0" x2="112" y2="600" stroke="white" strokeWidth="3" strokeOpacity="0.25" />
            <line x1="220" y1="0" x2="88" y2="600" stroke="white" strokeWidth="1" strokeOpacity="0.12" />
            <line x1="400" y1="252" x2="152" y2="600" stroke="white" strokeWidth="3" strokeOpacity="0.25" />
            <line x1="400" y1="224" x2="124" y2="600" stroke="white" strokeWidth="1" strokeOpacity="0.12" />
          </svg>
        </div>

        {/* Conteúdo */}
        <div className="relative z-10 flex flex-col items-center text-center px-12">
          <div className="rounded-2xl overflow-hidden bg-white p-3 drop-shadow-2xl mb-8">
            <Image
              src="/logo-white.jpg"
              alt="ADTRISC"
              width={160}
              height={160}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-4xl font-black text-white tracking-wider mb-3">
            ADTRISC
          </h1>
          <p className="text-sm font-medium leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Associação Desportiva Triatlética<br />de Santa Catarina
          </p>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 py-12">
        {/* Logo mobile (só aparece em telas pequenas) */}
        <div className="flex flex-col items-center mb-10 lg:hidden">
          <div className="rounded-xl overflow-hidden bg-white mb-3">
            <Image
              src="/logo-white.jpg"
              alt="ADTRISC"
              width={80}
              height={80}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-xl font-black tracking-wider" style={{ color: '#0C143D' }}>ADTRISC</h1>
          <p className="text-xs text-center mt-1" style={{ color: '#2AABE1' }}>
            Associação Desportiva Triatlética de Santa Catarina
          </p>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold" style={{ color: '#0C143D' }}>Bem-vindo(a)</h2>
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
          <p className="text-center mt-2">
            <a
              href="/politica"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-sky-400 underline underline-offset-2 transition-colors"
            >
              Política de Privacidade e LGPD
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
