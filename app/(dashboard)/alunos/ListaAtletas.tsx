'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRightLeft, Clock } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge, { statusAlunoVariant } from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import AlunoActionsMenu from './AlunoActionsMenu'
import TransferirModal, { type TurmaDestino } from './TransferirModal'
import { calcularIdade, formatTelefone } from '@/lib/utils'

export type AtletaLinha = {
  id: string
  nome: string
  status: string
  foto_url: string | null
  telefone: string | null
  data_nascimento: string | null
  turma_id: string | null
  turma_nome: string | null
  pendente: boolean // já tem transferência aguardando resposta
}

/** Lista "minhas turmas": seleção de vários atletas + transferir. */
export function ListaAtletas({ atletas, turmas }: { atletas: AtletaLinha[]; turmas: TurmaDestino[] }) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [transferindo, setTransferindo] = useState<AtletaLinha[] | null>(null)

  const alternar = (id: string) => setSelecionados((s) => {
    const n = new Set(s)
    if (n.has(id)) n.delete(id); else n.add(id)
    return n
  })
  const elegiveis = atletas.filter((a) => a.turma_id && a.status === 'ativo' && !a.pendente)
  const todos = elegiveis.length > 0 && elegiveis.every((a) => selecionados.has(a.id))
  const escolhidos = atletas.filter((a) => selecionados.has(a.id))
  // Turma atual só é excluída do destino quando todos vêm da mesma turma.
  const turmaComum = escolhidos.length && escolhidos.every((a) => a.turma_id === escolhidos[0].turma_id) ? escolhidos[0].turma_id : null

  return (
    <>
      {selecionados.size > 0 && (
        <div className="sticky top-14 md:top-0 z-20 mb-3 flex items-center gap-3 flex-wrap rounded-xl bg-navy-500 text-white px-4 py-2.5 shadow">
          <span className="text-sm font-medium">{selecionados.size} selecionado{selecionados.size > 1 ? 's' : ''}</span>
          <button
            onClick={() => setTransferindo(escolhidos)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold bg-sky-400 hover:bg-sky-500 rounded-lg px-3 py-1.5"
          >
            <ArrowRightLeft size={14} /> Transferir de turma
          </button>
          <button onClick={() => setSelecionados(new Set())} className="ml-auto text-xs text-white/70 hover:text-white">Limpar seleção</button>
        </div>
      )}

      <Card padding={false}>
        {elegiveis.length > 1 && (
          <label className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 text-xs text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={todos}
              onChange={(e) => setSelecionados(e.target.checked ? new Set(elegiveis.map((a) => a.id)) : new Set())}
            />
            Selecionar todos para transferir
          </label>
        )}
        <div className="divide-y divide-gray-100">
          {atletas.map((a) => {
            const podeTransferir = !!a.turma_id && a.status === 'ativo' && !a.pendente
            return (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  aria-label={`Selecionar ${a.nome}`}
                  disabled={!podeTransferir}
                  checked={selecionados.has(a.id)}
                  onChange={() => alternar(a.id)}
                  className="shrink-0 disabled:opacity-30"
                />
                <Link href={`/alunos/${a.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar name={a.nome} url={a.foto_url} size={42} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-navy-500 truncate">{a.nome}</p>
                      <Badge variant={statusAlunoVariant(a.status)}>{a.status}</Badge>
                      {a.pendente && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-sky-600 bg-sky-50 rounded-full px-2 py-0.5">
                          <Clock size={11} /> transferência pendente
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {a.turma_nome ?? 'Sem turma'}
                      {a.data_nascimento ? ` · ${calcularIdade(a.data_nascimento)} anos` : ''}
                      {a.telefone ? ` · ${formatTelefone(a.telefone)}` : ''}
                    </p>
                  </div>
                </Link>
                <AlunoActionsMenu
                  alunoId={a.id}
                  alunoNome={a.nome}
                  turmaId={a.turma_id}
                  onTransferir={podeTransferir ? () => setTransferindo([a]) : undefined}
                />
              </div>
            )
          })}
        </div>
      </Card>

      {transferindo && (
        <TransferirModal
          modo="transferir"
          alunos={transferindo.map((a) => ({ id: a.id, nome: a.nome }))}
          turmas={turmas}
          turmaAtualId={transferindo.length === 1 ? transferindo[0].turma_id : turmaComum}
          onFechar={() => { setTransferindo(null); setSelecionados(new Set()) }}
        />
      )}
    </>
  )
}

export type AtletaOutraTurma = { id: string; nome: string; idade: number | null; turma_nome: string; pendente: boolean }

/** Aba "Outras turmas": só nome, turma e idade — sem link para a página do atleta. */
export function OutrasTurmas({ atletas, minhasTurmas }: { atletas: AtletaOutraTurma[]; minhasTurmas: TurmaDestino[] }) {
  const [solicitando, setSolicitando] = useState<AtletaOutraTurma | null>(null)
  return (
    <>
      <p className="text-xs text-gray-400 mb-2">
        Atletas de turmas de outros treinadores. Para trazer alguém para a sua turma, clique em Solicitar: o treinador
        da turma atual aceita ou recusa.
      </p>
      <Card padding={false}>
        <div className="divide-y divide-gray-100">
          {atletas.map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={a.nome} url={null} size={36} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-navy-500 truncate">{a.nome}</p>
                <p className="text-xs text-gray-400 mt-0.5">{a.turma_nome}{a.idade != null ? ` · ${a.idade} anos` : ''}</p>
              </div>
              {a.pendente ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-sky-600 bg-sky-50 rounded-full px-2 py-0.5 shrink-0">
                  <Clock size={11} /> transferência pendente
                </span>
              ) : (
                <button
                  disabled={minhasTurmas.length === 0}
                  onClick={() => setSolicitando(a)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-sky-500 border border-sky-200 hover:bg-sky-50 rounded-lg px-3 py-1.5 shrink-0 disabled:opacity-40"
                >
                  <ArrowRightLeft size={13} /> Solicitar
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>
      {solicitando && (
        <TransferirModal
          modo="solicitar"
          alunos={[{ id: solicitando.id, nome: solicitando.nome }]}
          turmas={minhasTurmas}
          onFechar={() => setSolicitando(null)}
        />
      )}
    </>
  )
}
