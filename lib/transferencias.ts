// Leitura das transferências de atletas entre turmas (as escritas ficam em
// app/(dashboard)/alunos/transferencias-actions.ts). Recebe o client de
// service role e filtra pelo usuário — titular e auxiliar contam igual.
import { getTurmaIdsForCoach } from '@/lib/turmas'

type Db = any // eslint-disable-line @typescript-eslint/no-explicit-any

export type TransferenciaPendente = {
  id: string
  tipo: 'envio' | 'solicitacao'
  alunoId: string
  alunoNome: string
  origemId: string | null
  origemNome: string | null
  destinoId: string
  destinoNome: string
  observacao: string | null
  criadoPorNome: string | null
  criadoEm: string
  expiraEm: string
}

/** Quem responde: envio → lado do destino; solicitação → lado da origem. */
export const ladoQueResponde = (t: { tipo: string; turma_origem_id: string | null; turma_destino_id: string }) =>
  t.tipo === 'envio' ? t.turma_destino_id : t.turma_origem_id

export async function pendenciasDoUsuario(admin: Db, userId: string, ehAdmin: boolean): Promise<{
  paraResponder: TransferenciaPendente[]
  enviadas: TransferenciaPendente[]
}> {
  const { data, error } = await admin
    .from('transferencias')
    .select(`id, tipo, turma_origem_id, turma_destino_id, observacao, criado_por, criado_em, expira_em,
             aluno:aluno_id ( id, nome ), origem:turma_origem_id ( nome ), destino:turma_destino_id ( nome ),
             autor:criado_por ( full_name )`)
    .eq('status', 'pendente')
    .gt('expira_em', new Date().toISOString())
    .order('criado_em')
  if (error) return { paraResponder: [], enviadas: [] } // tabela ainda não criada

  const minhas = ehAdmin ? null : new Set(await getTurmaIdsForCoach(admin, userId))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const montar = (t: any): TransferenciaPendente => ({
    id: t.id, tipo: t.tipo,
    alunoId: t.aluno?.id, alunoNome: t.aluno?.nome ?? '',
    origemId: t.turma_origem_id, origemNome: t.origem?.nome ?? null,
    destinoId: t.turma_destino_id, destinoNome: t.destino?.nome ?? '',
    observacao: t.observacao, criadoPorNome: t.autor?.full_name ?? null,
    criadoEm: t.criado_em, expiraEm: t.expira_em,
  })

  const paraResponder: TransferenciaPendente[] = []
  const enviadas: TransferenciaPendente[] = []
  for (const t of data ?? []) {
    const lado = ladoQueResponde(t)
    if (t.criado_por === userId) enviadas.push(montar(t))
    else if (ehAdmin || (lado && minhas!.has(lado))) paraResponder.push(montar(t))
  }
  return { paraResponder, enviadas }
}
