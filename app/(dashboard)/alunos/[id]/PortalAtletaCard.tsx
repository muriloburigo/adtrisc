'use client'

import { useState, useTransition } from 'react'
import { Check, Copy, KeyRound, MessageCircle, Smartphone, UserPlus } from 'lucide-react'
import ConfirmDeleteButton from '@/components/ui/ConfirmDeleteButton'
import { gerarConvitePortal, removerAcessoPortal } from './portal-actions'
import { toWaNumber } from '@/lib/portal'

type Contato = { nome: string; telefone: string }

/** Card "Portal do atleta" na página do atleta: convite pelo WhatsApp, nova senha, remover acesso. */
export default function PortalAtletaCard({ alunoId, nomeAtleta, login, ultimoAcesso, conviteAberto, contatos }: {
  alunoId: string
  nomeAtleta: string
  login: string | null                 // e-mail ou usuário da conta; null = sem conta
  ultimoAcesso: string | null
  conviteAberto: { url: string; tipo: 'criar' | 'senha'; expira: string } | null
  contatos: Contato[]
}) {
  const [pending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const [link, setLink] = useState(conviteAberto)
  const [copiado, setCopiado] = useState(false)
  const primeiro = nomeAtleta.split(' ')[0]

  function gerar() {
    setErro(null)
    startTransition(async () => {
      const r = await gerarConvitePortal(alunoId)
      if (r.error || !r.url) { setErro(r.error ?? 'Erro ao gerar o link.'); return }
      setLink({ url: r.url, tipo: r.tipo!, expira: new Date(Date.now() + 7 * 86_400_000).toISOString() })
    })
  }

  const mensagem = (url: string, tipo: 'criar' | 'senha') => tipo === 'criar'
    ? `Olá! Este é o link para ${primeiro} criar o acesso ao portal de treinos da ADTRISC (vale por 7 dias, uso único):\n${url}`
    : `Olá! Este é o link para ${primeiro} definir uma nova senha no portal de treinos da ADTRISC (vale por 7 dias, uso único):\n${url}`

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Smartphone size={16} className="text-sky-400" />
        <h2 className="text-sm font-semibold text-navy-500">Portal do atleta</h2>
      </div>
      {login ? (
        <div className="text-sm">
          <p className="text-gray-700">Acesso ativo · <strong>{login}</strong></p>
          <p className="text-xs text-gray-400">{ultimoAcesso ? `Último acesso em ${new Date(ultimoAcesso).toLocaleDateString('pt-BR')}` : 'Ainda não entrou'}</p>
        </div>
      ) : (
        <p className="text-sm text-gray-500">{primeiro} ainda não tem acesso. Gere o convite e mande pelo WhatsApp.</p>
      )}

      {link && (
        <div className="rounded-lg bg-sky-50 p-3 space-y-2">
          <p className="text-xs text-sky-800">{link.tipo === 'criar' ? 'Convite' : 'Link de nova senha'} válido até {new Date(link.expira).toLocaleDateString('pt-BR')}</p>
          <div className="flex gap-1.5">
            <input readOnly value={link.url} className="flex-1 min-w-0 text-xs border border-sky-200 rounded px-2 py-1 bg-white" />
            <button onClick={() => { navigator.clipboard.writeText(link.url); setCopiado(true); setTimeout(() => setCopiado(false), 2000) }}
              className="p-1.5 rounded border border-sky-200 bg-white text-sky-600" title="Copiar">{copiado ? <Check size={14} /> : <Copy size={14} />}</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {contatos.map((c) => (
              <a key={c.telefone} href={`https://wa.me/${toWaNumber(c.telefone)}?text=${encodeURIComponent(mensagem(link.url, link.tipo))}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium bg-green-500 hover:bg-green-600 text-white rounded-lg px-2.5 py-1.5">
                <MessageCircle size={12} /> {c.nome}
              </a>
            ))}
            {contatos.length === 0 && <p className="text-xs text-gray-500">Sem telefone cadastrado: copie o link.</p>}
          </div>
        </div>
      )}

      {erro && <p className="text-xs text-red-500">{erro}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} onClick={gerar}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-600 hover:text-sky-700 disabled:opacity-50">
          {login ? <><KeyRound size={14} /> Gerar link de nova senha</> : <><UserPlus size={14} /> {link ? 'Gerar novo convite' : 'Gerar convite'}</>}
        </button>
        {login && (
          <ConfirmDeleteButton variant="full" label="Remover acesso" confirmLabel="Remover a conta de login?" size={13}
            action={async () => { const r = await removerAcessoPortal(alunoId); if (!r.error) setLink(null); return r }} />
        )}
      </div>
      <p className="text-[11px] text-gray-400">Para atletas menores, mande o link ao responsável.</p>
    </div>
  )
}
