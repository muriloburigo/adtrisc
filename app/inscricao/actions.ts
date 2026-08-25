'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function submitInscricao(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const aceite = formData.get('aceite_termos') === 'true'
  if (!aceite) return { error: 'Você precisa aceitar os termos para continuar.' }

  const turma_id = String(formData.get('turma_id') ?? '').trim()
  const nome     = String(formData.get('p_nome') ?? '').trim()
  if (!turma_id) return { error: 'Selecione uma turma.' }
  if (!nome)     return { error: 'Nome do atleta é obrigatório.' }

  const responsavelAssina = String(formData.get('responsavel_assina') ?? '').trim()
  if (!responsavelAssina) return { error: 'Informe o nome de quem está assinando.' }

  const assinaturaData = String(formData.get('assinatura_data') ?? '')
  if (!assinaturaData.startsWith('data:image/png;base64,') || assinaturaData.length < 2000) {
    return { error: 'Por favor, assine o formulário antes de enviar.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  const { data: turma } = await supabase
    .from('turmas').select('captacao_aberta').eq('id', turma_id).single()
  if (!turma?.captacao_aberta) return { error: 'Esta turma não está aceitando inscrições no momento.' }

  const str = (key: string) => String(formData.get(key) ?? '').trim() || null
  const yn  = (key: string) => formData.get(key) === 'sim'

  const rua = str('p_rua'), numero = str('p_numero'), bairro = str('p_bairro'), cep = str('p_cep'), cidade = str('p_cidade')
  const enderecoCompleto = [rua && numero ? `${rua}, ${numero}` : rua, bairro, cidade, cep].filter(Boolean).join(' — ') || null

  const maeNome = str('mae_nome'), maeTelefone = str('mae_telefone'), maeEmail = str('mae_email')
  const paiNome = str('pai_nome'), paiTelefone = str('pai_telefone'), paiEmail = str('pai_email')

  const { error } = await supabase.from('candidatos').insert({
    turma_id,
    status:             'pendente',
    email_responsavel:  str('email_responsavel'),
    aceite_termos:      true,

    // Participante
    nome,
    data_nascimento:    str('p_data_nascimento'),
    sexo:               str('p_sexo'),
    cpf:                str('p_cpf'),
    telefone:           str('p_telefone'),
    rua, numero, bairro, cep, cidade,
    endereco_completo:  enderecoCompleto,

    // Escola
    escola_nome_endereco: str('escola_nome_endereco'),
    serie_escolar:         str('serie_escolar'),

    // Saúde
    condicao_medica:             yn('condicao_medica'),
    condicao_medica_descricao:   str('condicao_medica_descricao'),
    tratamento_medico:           yn('tratamento_medico'),
    tratamento_medico_descricao: str('tratamento_medico_descricao'),
    alergia:                     yn('alergia'),
    alergia_descricao:           str('alergia_descricao'),
    autorizacao_medica:          yn('autorizacao_medica'),

    // Histórico esportivo
    praticou_modalidade: yn('praticou_modalidade'),
    interesse_eventos:   yn('interesse_eventos'),
    como_soube:          str('como_soube'),

    // Filiação
    mae_nome: maeNome, mae_cpf: str('mae_cpf'), mae_rg: str('mae_rg'), mae_email: maeEmail, mae_telefone: maeTelefone,
    pai_nome: paiNome, pai_cpf: str('pai_cpf'), pai_rg: str('pai_rg'), pai_email: paiEmail, pai_telefone: paiTelefone,
    // Colunas legadas (usadas na listagem/busca) — espelham o responsável principal (mãe, com fallback pai)
    responsavel_nome:     maeNome ?? paiNome,
    responsavel_telefone: maeTelefone ?? paiTelefone,
    responsavel_email:    maeEmail ?? paiEmail,

    // Equipamentos
    tem_bicicleta:     yn('tem_bicicleta'),
    tamanho_camiseta:  str('tamanho_camiseta'),

    // Autorização
    responsavel_assina: responsavelAssina,
    assinatura_data:    assinaturaData,
  })

  if (error) return { error: `Erro ao enviar inscrição: ${error.message}` }
  return { success: true }
}
