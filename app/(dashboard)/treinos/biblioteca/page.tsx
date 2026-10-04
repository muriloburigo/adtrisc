import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import GerenciadorBiblioteca from '@/components/treinos/GerenciadorBiblioteca'
import { getConfigAvaliacao } from '@/lib/config-avaliacao'
import type { ModeloView } from '@/components/treinos/MontadorTreino'
import type { Passo } from '@/lib/treinos/tipos'

type Db = any // eslint-disable-line @typescript-eslint/no-explicit-any

// Biblioteca de modelos de treino (porte de training/library do Movelly):
// pastas, modelos, editar no montador, mover entre pastas.
export default async function BibliotecaPage() {
  const db = (await createClient()) as Db
  const { data: { user } } = await db.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (!perfil || !['admin', 'coach'].includes(perfil.role)) redirect('/dashboard')

  const [{ data: pastas }, { data: modelosRaw }, config] = await Promise.all([
    db.from('treino_pastas').select('id, nome').order('ordem'),
    db.from('treino_modelos').select('*, treino_passos(*)').order('titulo'),
    getConfigAvaliacao(db),
  ])
  type Row = ModeloView & { treino_passos: Passo[]; duracao_min: number | null; distancia_km: number | null }
  const modelos = ((modelosRaw ?? []) as Row[]).map(({ treino_passos, ...m }) => ({
    ...m, passos: [...(treino_passos ?? [])].sort((a, b) => a.ordem - b.ordem),
  }))

  return (
    <div className="p-4 sm:p-8 space-y-4">
      <PageHeader title="Biblioteca de treinos" subtitle="Modelos reutilizáveis: arraste-os para o calendário da turma ou do atleta" />
      <GerenciadorBiblioteca pastas={pastas ?? []} modelos={modelos} limites={config.zona_limites} />
    </div>
  )
}
