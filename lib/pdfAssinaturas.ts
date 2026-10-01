// Lê as assinaturas digitais de um PDF (gov.br, ICP-Brasil...) para mostrar
// quem assinou e quando. Roda no navegador (aviso antes de enviar) e no
// servidor (o que fica gravado). Sem dependências.
//
// IMPORTANTE: isto IDENTIFICA a assinatura (nome do certificado, emissor,
// data), não valida a criptografia. A validação oficial é em
// https://validar.iti.gov.br — o link aparece junto do documento.
//
// Como funciona: cada assinatura de PDF é um dicionário com /ByteRange e
// /Contents <hex>, e o hex é um PKCS#7 (DER) com os certificados. Os nomes
// estão nos atributos commonName (OID 2.5.4.3) dos certificados.

export type Provedor = 'gov.br' | 'ICP-Brasil' | 'outro'
export type AssinaturaPdf = {
  nome: string | null     // titular do certificado (sem CPF)
  provedor: Provedor
  emissor: string | null  // AC que emitiu o certificado
  data: string | null     // ISO, do campo /M do PDF (pode faltar)
}

const OID_CN = [0x06, 0x03, 0x55, 0x04, 0x03]

function hexParaBytes(hex: string): Uint8Array {
  const limpo = hex.replace(/[^0-9a-fA-F]/g, '')
  const out = new Uint8Array(limpo.length >> 1)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(limpo.substr(i * 2, 2), 16)
  return out
}

function decodificarString(tag: number, bytes: Uint8Array): string {
  if (tag === 0x1e) { // BMPString (UTF-16BE)
    let s = ''
    for (let i = 0; i + 1 < bytes.length; i += 2) s += String.fromCharCode((bytes[i] << 8) | bytes[i + 1])
    return s
  }
  if (tag === 0x0c) return new TextDecoder('utf-8').decode(bytes)
  return Array.from(bytes, (b) => String.fromCharCode(b)).join('') // Printable / T61 / IA5
}

/** Todos os commonName do DER, na ordem em que aparecem. */
function commonNames(der: Uint8Array): string[] {
  const nomes: string[] = []
  for (let i = 0; i < der.length - OID_CN.length - 2; i++) {
    if (!OID_CN.every((b, j) => der[i + j] === b)) continue
    let p = i + OID_CN.length
    const tag = der[p++]
    if (![0x0c, 0x13, 0x14, 0x16, 0x1e].includes(tag)) continue
    let len = der[p++]
    if (len & 0x80) { // comprimento longo
      const n = len & 0x7f
      len = 0
      for (let k = 0; k < n; k++) len = (len << 8) | der[p++]
    }
    if (len > 0 && p + len <= der.length) nomes.push(decodificarString(tag, der.subarray(p, p + len)).trim())
  }
  return nomes
}

const ehAutoridade = (cn: string) => /^AC\b|Autoridade Certificadora|\bRaiz\b|Root|Intermedi/i.test(cn)

function provedorDe(cns: string[]): Provedor {
  if (cns.some((c) => /Governo Federal|gov\.?br/i.test(c))) return 'gov.br'
  if (cns.some((c) => /ICP-Brasil|AC (SERPRO|Certisign|Soluti|VALID|SAFEWEB|SERASA|Digitalsign|Boa Vista)/i.test(c))) return 'ICP-Brasil'
  return 'outro'
}

// "D:20261001143200-03'00'" → ISO
function dataPdf(m: string | undefined): string | null {
  const r = m?.match(/D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?([+-Z])?(\d{2})?'?(\d{2})?/)
  if (!r) return null
  const [, a, me, d, h = '00', mi = '00', s = '00', sinal, oh, om] = r
  const fuso = !sinal || sinal === 'Z' ? 'Z' : `${sinal}${oh ?? '00'}:${om ?? '00'}`
  const dt = new Date(`${a}-${me}-${d}T${h}:${mi}:${s}${fuso}`)
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString()
}

export function lerAssinaturasPdf(pdf: Uint8Array): AssinaturaPdf[] {
  // latin1: 1 byte = 1 caractere, então as posições batem com o arquivo.
  const texto = new TextDecoder('latin1').decode(pdf)
  const out: AssinaturaPdf[] = []
  const re = /\/ByteRange\s*\[[^\]]*\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(texto))) {
    // O dicionário da assinatura fica em volta do /ByteRange.
    const ini = Math.max(0, texto.lastIndexOf('<<', m.index))
    const fimDict = texto.indexOf('>>', m.index)
    const janela = texto.slice(Math.max(0, ini - 200000), fimDict > 0 ? fimDict + 2 : m.index + 200000)
    const perto = texto.slice(Math.max(0, m.index - 200000), Math.min(texto.length, m.index + 200000))
    const contents = (janela.match(/\/Contents\s*<([0-9A-Fa-f\s]+)>/g) ?? perto.match(/\/Contents\s*<([0-9A-Fa-f\s]+)>/g) ?? [])
      .map((c) => c.replace(/^\/Contents\s*</, '').replace(/>$/, ''))
      .sort((a, b) => b.length - a.length)[0]
    if (!contents) continue
    const cns = commonNames(hexParaBytes(contents))
    if (!cns.length) continue
    const titular = cns.find((c) => !ehAutoridade(c)) ?? null
    const emissor = cns.find((c) => ehAutoridade(c)) ?? null
    const mData = (janela.match(/\/M\s*\((D:[^)]+)\)/) ?? perto.match(/\/M\s*\((D:[^)]+)\)/))?.[1]
    out.push({
      // Certificados de pessoa física costumam trazer ":CPF" no CN — o CPF não é guardado.
      nome: titular ? titular.replace(/[:\s]*\d{11}$/, '').trim() || null : null,
      provedor: provedorDe(cns),
      emissor,
      data: dataPdf(mData),
    })
  }
  // A mesma assinatura pode aparecer duas vezes (atualização incremental do PDF).
  return out.filter((a, i) => out.findIndex((b) => b.nome === a.nome && b.data === a.data) === i)
}

export const rotuloAssinatura = (a: AssinaturaPdf) =>
  `${a.provedor === 'outro' ? 'Assinatura digital' : a.provedor}${a.nome ? ` · ${a.nome}` : ''}`
