'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { requireStaff } from '@/lib/assert'

export async function updateCandidatoStatus(candidatoId: string, status: string) {
  const actor = await requireStaff()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: before } = await supabase
    .from('candidatos').select('status, nome').eq('id', candidatoId).single()

  await supabase
    .from('candidatos').update({ status }).eq('id', candidatoId)

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'status', resource: 'candidato',
    resourceId: candidatoId,
    resourceLabel: before?.nome ?? null,
    before: { status: before?.status },
    after: { status },
  })

  revalidatePath(`/candidatos/${candidatoId}`)
  revalidatePath('/candidatos')
}
