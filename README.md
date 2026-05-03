# Timeline do Petróleo

Aplicação Next.js para visualizar uma timeline histórica do petróleo, com gráfico de preços, filtros, página de fontes e uma área administrativa local para manutenção dos dados.

## Manual principal

O manual completo de uso da aplicação está em:

- [docs/manual-de-uso.html](docs/manual-de-uso.html)

Esse arquivo cobre:

- estrutura do projeto
- funcionamento da timeline e do gráfico
- uso do admin local
- como adicionar e editar eventos
- uso da planilha `data/events.xlsx`
- categorias, fontes, tema e editor bruto
- fluxo de publicação

## Estrutura essencial

Arquivos e pastas centrais do projeto:

- `app/`, `components/`, `context/`, `hooks/`, `lib/`, `types/`
- `public/`
- `data/events.json`
- `data/categories.json`
- `data/sources.json`
- `data/oil-prices-*.json`

Arquivos locais de apoio que normalmente não vão para produção:

- `data/events.xlsx`
- `data/*.bak-*`
- `dist/`
- `docs/`

## Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Admin local

```bash
npm run admin
```

Abra `http://localhost:3000/admin`.

O admin salva localmente em:

- `data/events.json`
- `data/categories.json`
- `data/sources.json`
- `app/globals.css`

Por padrão, `/admin` e `/api/admin/*` ficam bloqueados em produção. Para expor isso online de forma intencional, configure `ALLOW_ADMIN_ONLINE=1`.

## Fluxo com Excel

Exportar `events.json` para `events.xlsx`:

```bash
npm run excel:export
```

Importar `events.xlsx` de volta para `events.json`:

```bash
npm run excel:import
```

Abrir a interface interativa no terminal:

```bash
npm run excel:ui
```

O import pede confirmação e cria backup automático do JSON atual.

## Executável da ferramenta Excel

```bash
npm run excel:exe
```

Saída:

```bash
dist/events-excel.exe
```

Exemplos:

```bash
.\dist\events-excel.exe
.\dist\events-excel.exe export
.\dist\events-excel.exe import
```

## Testes e build

```bash
npm test
npm run build
```

## Publicação

Depois de revisar os arquivos alterados:

```bash
git status
git add data/events.json data/categories.json data/sources.json app/globals.css README.md docs/manual-de-uso.html
git commit -m "Atualiza conteúdo"
git push
```

O deploy da Vercel publica a nova versão após o `push`.
