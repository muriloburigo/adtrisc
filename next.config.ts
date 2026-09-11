import type { NextConfig } from 'next'

const securityHeaders = [
  // Impede a página ser embutida em <iframe> de outro site (clickjacking).
  // Não há nenhum uso de iframe no app, self ou de terceiros.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Impede o navegador de "adivinhar" um content-type diferente do declarado.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Não vaza a URL completa (com querystring) como referrer em links pra fora.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Câmera/microfone/geolocalização não são usados em nenhuma página.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
