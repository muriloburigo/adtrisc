import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Destino dos links enviados por e-mail pelo Supabase (redefinição de senha):
// troca o código de uso único por uma sessão e segue para `next`.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  let next = searchParams.get('next') ?? '/dashboard'
  if (!next.startsWith('/') || next.startsWith('//')) next = '/dashboard' // só caminhos internos

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
    console.error('[auth/callback]', error.message)
  }
  return NextResponse.redirect(`${origin}/esqueci-senha?erro=link`)
}
