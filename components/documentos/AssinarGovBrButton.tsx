import { ShieldCheck } from 'lucide-react'

// Atalho para o assinador oficial do gov.br, ao lado de "Imprimir / Salvar PDF".
// A assinatura gov.br não pode ser feita dentro do sistema (a API do gov.br só
// é liberada para órgãos públicos): o treinador salva o PDF, assina lá e envia
// o arquivo assinado em "Documentos assinados".
export default function AssinarGovBrButton({ compacto = false }: { compacto?: boolean }) {
  return (
    <a
      href="https://assinador.iti.br"
      target="_blank"
      rel="noopener noreferrer"
      title="Salve o PDF, abra o assinador do gov.br, arraste o selo para o quadro “Assinatura digital gov.br” do rodapé e depois envie o PDF assinado em Documentos assinados."
      className={`print:hidden flex items-center gap-2 border border-sky-400 text-sky-500 hover:bg-sky-50 font-bold rounded-xl transition-colors ${
        compacto ? 'text-sm px-4 py-2' : 'text-sm px-5 py-2.5'
      }`}
    >
      <ShieldCheck size={16} />
      Assinar no gov.br ↗
    </a>
  )
}
