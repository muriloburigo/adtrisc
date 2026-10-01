'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, ArrowRightLeft } from 'lucide-react'
import { transferirAlunos, solicitarAluno, type ResultadoTransferencia } from './transferencias-actions'

export type TurmaDestino = { id: string; nome: string; direto: boolean } // direto = muda sem confirmação

const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white'

/**
 * modo "transferir": atletas das minhas turmas → qualquer turma.
 * modo "solicitar": um atleta de outra turma → uma turma minha.
 */
export default function TransferirModal({
  modo, alunos, turmas, turmaAtualId, onFechar,
}: {
  modo: 'transferir' | 'solicitar'
  alunos: { id: string; nome: string }[]
  turmas: TurmaDestino[]
  turmaAtualId?: string | null
  onFechar: () => void
}) {
  const router = useRouter()
  const opcoes = turmas.filter((t) => t.id !== turmaAtualId)
  const [destinoId, setDestinoId] = useState(opcoes.length === 1 ? opcoes[0].id : '')
  const [observacao, setObservacao] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ResultadoTransferencia | { solicitado: boolean; movido: boolean } | null>(null)
  const [pending, startTransition] = useTransition()
  const destino = opcoes.find((t) => t.id === destinoId)

  function enviar() {
    if (!destinoId) return
    setErro(null)
    startTransition(async () => {
      if (modo === 'transferir') {
        const r = await transferirAlunos(alunos.map((a) => a.id), destinoId, observacao)
        if (r.error) { setErro(r.error); return }
        setResultado(r)
      } else {
        const r = await solicitarAluno(alunos[0].id, destinoId, observacao)
        if (r.error) { setErro(r.error); return }
        setResultado({ solicitado: !r.movido, movido: !!r.movido })
      }
      router.refresh()
    })
  }

  const titulo = modo === 'transferir'
    ? alunos.length === 1 ? `Transferir ${alunos[0].nome}` : `Transferir ${alunos.length} atletas`
    : `Solicitar ${alunos[0].nome}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onFechar}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-navy-500 flex items-center gap-2 min-w-0">
            <ArrowRightLeft size={16} className="text-sky-400 shrink-0" /> <span className="truncate">{titulo}</span>
          </h2>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {resultado ? (
          <div className="p-5 space-y-3 text-sm">
            {'movidos' in resultado ? (
              <>
                {resultado.movidos.length > 0 && (
                  <p className="text-green-700 bg-green-50 rounded-xl px-3 py-2">
                    Transferido{resultado.movidos.length > 1 ? 's' : ''}: {resultado.movidos.join(', ')}.
                  </p>
                )}
                {resultado.enviados.length > 0 && (
                  <p className="text-sky-700 bg-sky-50 rounded-xl px-3 py-2">
                    Enviado{resultado.enviados.length > 1 ? 's' : ''} para o treinador de {destino?.nome} confirmar: {resultado.enviados.join(', ')}.
                  </p>
                )}
                {resultado.ignorados.length > 0 && (
                  <ul className="text-amber-700 bg-amber-50 rounded-xl px-3 py-2 space-y-0.5">
                    {resultado.ignorados.map((i) => <li key={i.nome}>{i.nome}: {i.motivo}.</li>)}
                  </ul>
                )}
              </>
            ) : (
              <p className="text-sky-700 bg-sky-50 rounded-xl px-3 py-2">
                {resultado.movido
                  ? `${alunos[0].nome} foi transferido(a) para ${destino?.nome}.`
                  : `Pedido enviado. O treinador da turma atual de ${alunos[0].nome} vai aceitar ou recusar.`}
              </p>
            )}
            <div className="flex justify-end">
              <button onClick={onFechar} className="text-sm font-semibold bg-sky-400 hover:bg-sky-500 text-white rounded-xl px-4 py-2">Fechar</button>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {modo === 'transferir' && alunos.length > 1 && (
              <p className="text-xs text-gray-500">{alunos.map((a) => a.nome).join(', ')}</p>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {modo === 'transferir' ? 'Para a turma' : 'Para a minha turma'}
              </label>
              <select value={destinoId} onChange={(e) => setDestinoId(e.target.value)} className={inputCls}>
                <option value="" disabled>Selecione…</option>
                {opcoes.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
              {destino && modo === 'transferir' && (
                <p className="text-xs text-gray-400 mt-1.5">
                  {destino.direto
                    ? 'Você também é treinador(a) dessa turma: a mudança é feita na hora.'
                    : 'Vai para o treinador dessa turma aceitar. Até lá o atleta continua na turma atual.'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Observação <span className="normal-case font-normal text-gray-400">(opcional)</span>
              </label>
              <textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder={modo === 'transferir' ? 'Ex.: apto pelo 100 m, pronto para a equipe' : 'Ex.: vi no festival, tem perfil para a equipe'}
                className={`${inputCls} resize-none`}
              />
            </div>
            {erro && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}
            <div className="flex gap-3">
              <button onClick={onFechar} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-500 hover:bg-gray-50">Cancelar</button>
              <button
                onClick={enviar}
                disabled={!destinoId || pending}
                className="flex-1 bg-sky-400 hover:bg-sky-500 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                {pending ? 'Enviando…' : modo === 'solicitar' ? 'Solicitar' : destino?.direto ? 'Transferir' : 'Enviar para confirmar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
