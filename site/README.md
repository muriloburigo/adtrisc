# Site institucional ADTRISC

Página estática pública e independente do sistema de gestão: `index.html` (fontes embutidas
em base64) + imagens em `img/` (WebP, geradas a partir das artes originais da ADTRISC:
banner, cards dos profissionais, fotos e bonequinhos das modalidades, logos dos parceiros).
Publicada em https://www.adtrisc.com.br (`adtrisc.com.br` redireciona para o www).

Inclui a apresentação institucional da ADTRISC e o Portal da Transparência.

## Deploy

Projeto Vercel separado (`adtrisc-site`), na mesma conta usada pelo sistema de gestão,
mas com build e deploy independentes do app Next.js na raiz do repositório.

```bash
cd site
vercel --prod
```
