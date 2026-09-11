'use client'

import { Newspaper, ExternalLink } from 'lucide-react'
import ConfirmDeleteButton from '@/components/ui/ConfirmDeleteButton'
import { formatDate } from '@/lib/utils'
import { removerMateria } from '@/app/(dashboard)/imprensa/actions'
import type { MateriaImprensaRow } from '@/types/database'

export default function MateriaCard({ materia }: { materia: MateriaImprensaRow }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
      <a
        href={materia.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block aspect-[16/9] bg-gray-100 overflow-hidden"
      >
        {materia.imagem_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={materia.imagem_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Newspaper size={28} className="text-gray-300" />
          </div>
        )}
      </a>

      <div className="p-4 flex-1 flex flex-col">
        <a href={materia.url} target="_blank" rel="noopener noreferrer" className="group">
          <p className="text-sm font-semibold text-navy-500 line-clamp-2 group-hover:text-sky-500 transition-colors">
            {materia.titulo || materia.url}
          </p>
        </a>
        {materia.descricao && (
          <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{materia.descricao}</p>
        )}

        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
          <a
            href={materia.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-sky-500 transition-colors min-w-0"
          >
            <ExternalLink size={11} className="flex-shrink-0" />
            <span className="truncate">{materia.site || 'Abrir link'}</span>
          </a>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-300">{formatDate(materia.created_at)}</span>
            <ConfirmDeleteButton action={removerMateria.bind(null, materia.id)} title="Remover link" />
          </div>
        </div>
      </div>
    </div>
  )
}
