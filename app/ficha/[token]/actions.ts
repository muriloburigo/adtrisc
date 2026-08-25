'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function submitFicha(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const token = String(formData.get('token') ?? '').trim()
  if (!token) return { error: 'Token inválido.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any

  const { data: ficha } = await db
    .from('fichas_inscricao')
    .select('id, status, expires_at')
    .eq('token', token)
    .single()

  if (!ficha) return { error: 'Link inválido.' }
  if (ficha.status !== 'pendente') return { error: 'Esta ficha já foi preenchida.' }
  if (new Date(ficha.expires_at) < new Date()) return { error: 'Este link expirou.' }

  const aceite = formData.get('aceite_termos') === 'true'
  if (!aceite) return { error: 'Você precisa aceitar os termos de autorização.' }

  const responsavelAssina = String(formData.get('responsavel_assina') ?? '').trim()
  if (!responsavelAssina) return { error: 'Informe o nome de quem está assinando.' }

  const assinaturaData = String(formData.get('assinatura_data') ?? '')
  if (!assinaturaData.startsWith('data:image/png;base64,') || assinaturaData.length < 2000) {
    return { error: 'Por favor, assine o formulário antes de enviar.' }
  }

  const str = (key: string) => String(formData.get(key) ?? '').trim() || null
  const yn  = (key: string) => formData.get(key) === 'sim'

  const { error } = await db
    .from('fichas_inscricao')
    .update({
      status:            'preenchida',
      preenchido_em:     new Date().toISOString(),

      // Participante
      p_nome:            str('p_nome'),
      p_telefone:        str('p_telefone'),
      p_sexo:            str('p_sexo'),
      p_data_nascimento: str('p_data_nascimento'),
      p_cpf:             str('p_cpf'),
      p_rua:             str('p_rua'),
      p_numero:          str('p_numero'),
      p_bairro:          str('p_bairro'),
      p_cep:             str('p_cep'),
      p_cidade:          str('p_cidade'),

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
      mae_nome:          str('mae_nome'),
      mae_cpf:           str('mae_cpf'),
      mae_rg:            str('mae_rg'),
      mae_email:         str('mae_email'),
      mae_telefone:      str('mae_telefone'),
      pai_nome:          str('pai_nome'),
      pai_cpf:           str('pai_cpf'),
      pai_rg:            str('pai_rg'),
      pai_email:         str('pai_email'),
      pai_telefone:      str('pai_telefone'),

      // Equipamentos
      tem_bicicleta:    yn('tem_bicicleta'),
      tamanho_camiseta: str('tamanho_camiseta'),

      // Autorização
      responsavel_assina: responsavelAssina,
      aceite_termos:      true,
      assinatura_data:    assinaturaData,
    })
    .eq('id', ficha.id)

  if (error) return { error: `Erro ao salvar: ${error.message}` }
  return { success: true }
}
