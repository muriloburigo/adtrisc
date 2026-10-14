import { celularWhatsappValido, cpfValido, emailValido } from './utils'

export type ResponsavelInput = {
  nome: string
  cpf: string
  email: string
  telefone: string
  rg?: string
}

/**
 * Regra do formulário público de inscrição:
 * - é obrigatório preencher ao menos um responsável (mãe ou pai);
 * - em cada responsável preenchido, CPF, e-mail e telefone/WhatsApp são
 *   obrigatórios e precisam ser válidos (CPF pelos dígitos, e-mail por formato,
 *   telefone como celular brasileiro — o formato que o WhatsApp usa).
 *
 * Usada tanto no cliente (feedback imediato) quanto no servidor (autoritativa).
 * Retorna a mensagem de erro, ou null quando está tudo certo.
 */
export function validarResponsaveis(mae: ResponsavelInput, pai: ResponsavelInput): string | null {
  const preenchido = (r: ResponsavelInput) => !!(r.nome || r.cpf || r.email || r.telefone || r.rg)

  const blocos: { label: string; r: ResponsavelInput }[] = []
  if (preenchido(mae)) blocos.push({ label: 'da mãe', r: mae })
  if (preenchido(pai)) blocos.push({ label: 'do pai', r: pai })

  if (blocos.length === 0) {
    return 'Preencha os dados de ao menos um responsável (mãe ou pai).'
  }

  for (const { label, r } of blocos) {
    if (!r.nome) return `Informe o nome ${label}.`
    if (!r.cpf) return `Informe o CPF ${label}.`
    if (!cpfValido(r.cpf)) return `O CPF ${label} é inválido. Confira os números.`
    if (!r.email) return `Informe o e-mail ${label}.`
    if (!emailValido(r.email)) return `O e-mail ${label} é inválido.`
    if (!r.telefone) return `Informe o telefone/WhatsApp ${label}.`
    if (!celularWhatsappValido(r.telefone)) {
      return `O telefone ${label} não é um celular válido. Use DDD + número (ex: (48) 99999-9999).`
    }
  }

  return null
}

/** Monta um ResponsavelInput a partir de uma função de leitura do formulário. */
export function lerResponsavel(get: (key: string) => string, prefixo: 'mae' | 'pai'): ResponsavelInput {
  return {
    nome: get(`${prefixo}_nome`),
    cpf: get(`${prefixo}_cpf`),
    email: get(`${prefixo}_email`),
    telefone: get(`${prefixo}_telefone`),
    rg: get(`${prefixo}_rg`),
  }
}
