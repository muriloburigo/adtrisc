'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { PenLine } from 'lucide-react'

/**
 * Opção "incluir assinatura" dos relatórios (só na tela). Marcada por padrão;
 * desmarcar põe ?assinatura=0 na URL e o rodapé volta a ter só a linha.
 */
export default function IncluirAssinatura({
  temAssinatura,
  incluir,
  nomeTreinador,
  linkCadastro,
}: {
  temAssinatura: boolean
  incluir: boolean
  nomeTreinador: string | null
  linkCadastro: string | null // onde cadastrar (null = este usuário não pode)
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  if (!temAssinatura) {
    return (
      <p className="print:hidden text-xs text-gray-400 flex items-center gap-1.5">
        <PenLine size={13} />
        {nomeTreinador ? `${nomeTreinador} não tem assinatura cadastrada` : 'Sem assinatura cadastrada'}
        {linkCadastro && <> · <Link href={linkCadastro} className="text-sky-500 hover:underline">cadastrar</Link></>}
      </p>
    )
  }

  function mudar(marcado: boolean) {
    const p = new URLSearchParams(sp.toString())
    if (marcado) p.delete('assinatura')
    else p.set('assinatura', '0')
    router.replace(`${pathname}?${p}`, { scroll: false })
  }

  return (
    <label className="print:hidden inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
      <input type="checkbox" checked={incluir} onChange={(e) => mudar(e.target.checked)} />
      Incluir a assinatura de {nomeTreinador ?? 'treinador(a)'} no rodapé
    </label>
  )
}
