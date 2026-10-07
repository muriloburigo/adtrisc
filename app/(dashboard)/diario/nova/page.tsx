import { redirect } from 'next/navigation'

// O lançamento em lote virou o calendário do diário (+ no dia abre a aula).
export default function NovaDiarioPage() {
  redirect('/diario')
}
