# Site institucional ADTRISC

Página estática pública e independente do sistema de gestão. Um único `index.html`
autocontido (fontes e logos embutidos como base64, sem chamadas externas).

Inclui a apresentação institucional da ADTRISC e o Portal da Transparência.

## Deploy

Projeto Vercel separado (`adtrisc-site`), na mesma conta usada pelo sistema de gestão,
mas com build e deploy independentes do app Next.js na raiz do repositório.

```bash
cd site
vercel --prod
```
