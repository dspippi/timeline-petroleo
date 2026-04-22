# Timeline do Petroleo

Aplicacao Next.js para visualizar uma timeline historica do petroleo. O site online usa os arquivos JSON em `data/`; as ferramentas de edicao ficam para uso local.

## O que vai para o site

Arquivos importantes para a aplicacao online:

- `app/`, `components/`, `context/`, `hooks/`, `lib/`, `types/`
- `public/`
- `data/events.json`
- `data/categories.json`
- `data/oil-prices-*.json`
- `package.json`, `package-lock.json`, `next.config.mjs`, `tailwind.config.ts`, `tsconfig.json`

Arquivos locais que nao precisam ir para o servidor:

- `dist/`
- `scripts/`
- `docs/`
- `data/events.xlsx`
- `data/*.bak-*`

Esses arquivos locais ja estao protegidos por `.vercelignore`; `dist/`, `events.xlsx` e backups tambem ficam fora do Git por `.gitignore`.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Editar eventos pelo admin local

```bash
npm run admin
```

O navegador abre em `http://localhost:3000/admin`.

No admin voce pode criar, editar e excluir eventos. As alteracoes sao salvas em `data/events.json` no seu computador.

Importante: o admin online deve ser tratado como somente leitura. Edicoes confiaveis devem ser feitas localmente e publicadas com Git.

## Editar eventos pelo Excel

Exportar significa pegar `data/events.json` e gerar/atualizar `data/events.xlsx` para editar no Excel:

```bash
npm run excel:export
```

Importar significa pegar `data/events.xlsx` e sobrescrever `data/events.json` com as edicoes feitas no Excel:

```bash
npm run excel:import
```

O import pede confirmacao antes de sobrescrever `events.json` e cria backup automaticamente.

Interface simples no terminal:

```bash
npm run excel:ui
```

## Gerar o .exe do editor Excel

```bash
npm run excel:exe
```

O executavel fica em `dist/events-excel.exe`.

Uso:

```bash
.\dist\events-excel.exe
.\dist\events-excel.exe export
.\dist\events-excel.exe import
```

Se executar o `.exe` fora da pasta do projeto, informe a raiz:

```bash
.\dist\events-excel.exe --root "C:\caminho\para\Timeline do Petroleo v2"
```

## Publicar alteracoes

Depois de editar localmente e conferir `data/events.json`:

```bash
git add data/events.json data/categories.json
git commit -m "Update events"
git push
```

O Vercel detecta o `push` e republica o site automaticamente.
