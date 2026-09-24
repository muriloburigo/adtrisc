'use client'

import ConfirmDeleteButton from '@/components/ui/ConfirmDeleteButton'
import { deleteProjeto } from '../../actions'

export default function ProjetoDeleteButton({ id }: { id: string }) {
  return <ConfirmDeleteButton variant="full" title="Excluir projeto" label="Excluir projeto" action={() => deleteProjeto(id)} />
}
