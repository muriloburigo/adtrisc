'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export type InscricaoPayload = {
  turma_id: string
  email_responsavel: string
  aceite_termos: boolean
  nome: string
  data_nascimento: string
  sexo: string
  cpf: string
  endereco_completo: string
  escola_nome_endereco: string
  serie_escolar: string
  condicao_medica: boolean
  condicao_medica_descricao: string
  tratamento_medico: boolean
  tratamento_medico_descricao: string
  alergia: boolean
  alergia_descricao: string
  autorizacao_medica: boolean
  praticou_modalidade: boolean
  interesse_eventos: boolean
  como_soube: string
  responsavel_nome: string
  responsavel_telefone: string
  responsavel_email: string
  tem_bicicleta: boolean
  tamanho_camiseta: string
}

export async function submitInscricao(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const aceite = formData.get('aceite_termos') === 'true'
  if (!aceite) return { error: 'Você precisa aceitar os termos para continuar.' }

  const turma_id = String(formData.get('turma_id') ?? '').trim()
  const nome     = String(formData.get('nome') ?? '').trim()
  if (!turma_id) return { error: 'Selecione uma turma.' }
  if (!nome)     return { error: 'Nome do atleta é obrigatório.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  const { error } = await supabase.from('candidatos').insert({
    turma_id,
    status:                        'pendente',
    email_responsavel:             String(formData.get('email_responsavel') ?? '').trim() || null,
    aceite_termos:                 true,
    nome,
    data_nascimento:               String(formData.get('data_nascimento') ?? '').trim() || null,
    sexo:                          String(formData.get('sexo') ?? '').trim() || null,
    cpf:                           String(formData.get('cpf') ?? '').trim() || null,
    endereco_completo:             String(formData.get('endereco_completo') ?? '').trim() || null,
    escola_nome_endereco:          String(formData.get('escola_nome_endereco') ?? '').trim() || null,
    serie_escolar:                 String(formData.get('serie_escolar') ?? '').trim() || null,
    condicao_medica:               formData.get('condicao_medica') === 'sim',
    condicao_medica_descricao:     String(formData.get('condicao_medica_descricao') ?? '').trim() || null,
    tratamento_medico:             formData.get('tratamento_medico') === 'sim',
    tratamento_medico_descricao:   String(formData.get('tratamento_medico_descricao') ?? '').trim() || null,
    alergia:                       formData.get('alergia') === 'sim',
    alergia_descricao:             String(formData.get('alergia_descricao') ?? '').trim() || null,
    autorizacao_medica:            formData.get('autorizacao_medica') === 'sim',
    praticou_modalidade:           formData.get('praticou_modalidade') === 'sim',
    interesse_eventos:             formData.get('interesse_eventos') === 'sim',
    como_soube:                    String(formData.get('como_soube') ?? '').trim() || null,
    responsavel_nome:              String(formData.get('responsavel_nome') ?? '').trim() || null,
    responsavel_telefone:          String(formData.get('responsavel_telefone') ?? '').trim() || null,
    responsavel_email:             String(formData.get('responsavel_email') ?? '').trim() || null,
    tem_bicicleta:                 formData.get('tem_bicicleta') === 'sim',
    tamanho_camiseta:              String(formData.get('tamanho_camiseta') ?? '').trim() || null,
  })

  if (error) return { error: `Erro ao enviar inscrição: ${error.message}` }
  return { success: true }
}
