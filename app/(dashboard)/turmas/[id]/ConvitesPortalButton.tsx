'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Check, ChevronDown, Link as LinkIcon, MessageCircle, Smartphone, X } from 'lucide-react'
import { gerarConvitesTurma } from '@/app/(dashboard)/alunos/[id]/portal-actions'
import { toWaNumber } from '@/lib/portal'
import type { ConviteTurmaItem } from '@/lib/portalConvite'

const mensagem = (nome: string, url: string) =>
  `Olá! Este é o link para ${nome.split(' ')[0]} criar o acesso ao portal de treinos da ADTRISC (vale por 7 dias, uso único):\n${url}`

function Painel({ itens, comAcesso, copiado, onCopiar, onFechar, onGerar, gerando }: {
  itens: ConviteTurmaItem[]; comAcesso: number; copiado: string | null
  onCopiar: (url: string, id: string) => void; onFechar: () => void; onGerar: () => void; gerando: boolean
}) {
  return (
    <>
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100 gap-2">
        <p className="text-xs font-medium text-gray-600">
          {comAcesso} com acesso · {itens.length} convite{itens.length !== 1 ? 's' : ''} pendente{itens.length !== 1 ? 's' : ''}
        </p>
        <button onClick={onFechar} className="p-1 rounded text-gray-400 hover:text-gray-600"><X size={14} /></button>
      </div>
      {itens.length === 0 ? (
        <p className="px-4 py-4 text-sm text-gray-500">Todos os atletas ativos já têm acesso ao portal.</p>
      ) : (
        <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
          {itens.map((i) => (
            <div key={i.alunoId} className="px-4 py-2.5">
              <div className="flex items-center gap-2">
                {i.novo && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 flex-shrink-0">novo</span>}
                <span className="text-sm text-navy-500 truncate flex-1">{i.nome}</span>
                <button onClick={() => onCopiar(i.url, i.alunoId)} title="Copiar link"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-sky-500 hover:bg-sky-50">
                  {copiado === i.alunoId ? <Check size={14} className="text-green-500" /> : <LinkIcon size={14} />}
                </button>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {i.contatos.map((c) => (
                  <a key={c.telefone} href={`https://wa.me/${toWaNumber(c.telefone)}?text=${encodeURIComponent(mensagem(i.nome, i.url))}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md px-2 py-0.5">
                    <MessageCircle size={11} /> {c.nome}
                  </a>
                ))}
                {i.contatos.length === 0 && <span className="text-[11px] text-gray-400">sem telefone — copie o link</span>}
                <span className="text-[11px] text-gray-400 ml-auto">até {new Date(i.expira).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-2">
        <span className="text-[11px] text-gray-400">Menores: mande ao responsável.</span>
        <button onClick={onGerar} disabled={gerando} className="text-xs font-medium text-sky-600 hover:text-sky-700 disabled:opacity-50">
          {gerando ? 'Atualizando…' : 'Gerar para quem faltar'}
        </button>
      </div>
    </>
  )
}

/** "Convites do portal" na página da turma: gera e lista os convites de quem ainda não tem acesso. */
export default function ConvitesPortalButton({ turmaId, inicial }: { turmaId: string; inicial: { itens: ConviteTurmaItem[]; comAcesso: number } }) {
  const [dados, setDados] = useState<typeof inicial | null>(inicial.itens.length ? inicial : null)
  const [aberto, setAberto] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [copiado, setCopiado] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fora = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false) }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [])

  async function copiar(url: string, id: string) {
    try { await navigator.clipboard.writeText(url) } catch { /* sem permissão: o link segue visível no WhatsApp */ }
    setCopiado(id); setTimeout(() => setCopiado(null), 2000)
  }

  function gerar() {
    setErro(null)
    startTransition(async () => {
      const r = await gerarConvitesTurma(turmaId)
      if (r.error) { setErro(r.error); return }
      setDados({ itens: r.itens ?? [], comAcesso: r.comAcesso ?? 0 })
      setAberto(true)
    })
  }

  const painel = dados && <Painel itens={dados.itens} comAcesso={dados.comAcesso} copiado={copiado} onCopiar={copiar} onFechar={() => setAberto(false)} onGerar={gerar} gerando={pending} />

  return (
    <>
      {dados && aberto && <div className="sm:hidden fixed inset-0 bg-black/30 z-30" onClick={() => setAberto(false)} />}
      <div className="relative" ref={ref}>
        <button onClick={dados ? () => setAberto(!aberto) : gerar} disabled={pending}
          title="Convites para os atletas criarem o acesso ao portal de treinos"
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 hover:border-sky-400 hover:text-sky-500 text-navy-500 transition-colors disabled:opacity-50">
          <Smartphone size={15} />
          {pending && !dados ? 'Gerando...' : dados ? <><span>Portal ({dados.itens.length})</span><ChevronDown size={13} /></> : 'Convites do portal'}
        </button>
        {erro && <p className="absolute left-0 top-full mt-1 text-xs text-red-500 whitespace-nowrap">{erro}</p>}
        {dados && aberto && (
          <>
            <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white rounded-t-2xl shadow-xl overflow-hidden">
              <div className="flex justify-center pt-2.5 pb-1"><div className="w-8 h-1 rounded-full bg-gray-300" /></div>
              {painel}
            </div>
            <div className="hidden sm:block absolute right-0 top-full mt-1 w-96 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">{painel}</div>
          </>
        )}
      </div>
    </>
  )
}
