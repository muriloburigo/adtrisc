// Assinatura cadastrada do treinador, sobre a linha do rodapé dos relatórios.
// Sem assinatura (ou desmarcada no relatório), fica só a linha para assinar à mão.
export default function AssinaturaImpressa({
  assinatura,
  largura,
  espacoSemAssinatura,
}: {
  assinatura: string | null
  largura?: number
  espacoSemAssinatura: number // padding da linha vazia, igual ao rodapé original
}) {
  if (!assinatura) {
    return <div style={{ borderBottom: '1px solid #555', width: largura, paddingBottom: espacoSemAssinatura, marginBottom: 4 }} />
  }
  return (
    <div style={{ borderBottom: '1px solid #555', width: largura, marginBottom: 4, height: 52, position: 'relative' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={assinatura}
        alt="Assinatura"
        style={{ position: 'absolute', left: 0, bottom: -6, height: 56, maxWidth: '100%', objectFit: 'contain', objectPosition: 'left bottom' }}
      />
    </div>
  )
}
