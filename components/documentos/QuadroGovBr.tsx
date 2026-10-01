// Espaço no rodapé dos relatórios, ao lado da assinatura do treinador, onde o
// selo da assinatura digital gov.br é posicionado no assinador oficial
// (assinador.iti.br). O PDF final fica com as duas assinaturas lado a lado.
export default function QuadroGovBr({ altura = 56 }: { altura?: number }) {
  return (
    <div
      style={{
        width: 210, height: altura, border: '1px dashed #bbb', borderRadius: 4,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 3,
        breakInside: 'avoid', pageBreakInside: 'avoid', flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 7, color: '#aaa', letterSpacing: 0.3 }}>ASSINATURA DIGITAL GOV.BR</span>
    </div>
  )
}
