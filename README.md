Como atualizar eventos:

## Como atualizar os eventos da Timeline

---

### 1. Iniciar o servidor local

Abra a pasta do projeto no terminal e rode:

```bash
npm run admin
```

O navegador abre direto no painel de administração.

---

### 2. Editar os eventos

No painel você pode:

- **Criar** → clique em **+ Novo** no topo
- **Editar** → clique em qualquer evento da lista
- **Excluir** → botão de excluir dentro do evento

Preencha os campos e salve. As alterações vão direto para o arquivo `data/events.md` no seu computador.

---

### 3. Publicar na internet

Quando terminar todas as edições, rode no terminal:

```bash
git add data/events.md
git commit -m "Atualiza eventos"
git push
```

O Vercel detecta o `push` e republica o site automaticamente em ~1 minuto.

---

### Resumo

| Etapa | Comando |
|---|---|
| Abrir o admin | `npm run admin` |
| Publicar | `git add data/events.md` → `git commit -m "..."` → `git push` |

> **Importante:** `npm run admin` só funciona no seu computador. O admin no site publicado (Vercel) é somente leitura — edições feitas lá não são salvas.
