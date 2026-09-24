'use client'

import ConfirmDeleteButton from '@/components/ui/ConfirmDeleteButton'
import { deleteLancamento } from '../actions'

export default function NotaDeleteButton({ id }: { id: string }) {
  return <ConfirmDeleteButton title="Excluir nota" action={() => deleteLancamento(id)} />
}
