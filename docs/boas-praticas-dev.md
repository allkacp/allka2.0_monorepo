# Boas Práticas para Desenvolvedores

Como mexer na plataforma sem quebrar nada e sem atrapalhar o deploy.

---

## Antes de começar qualquer alteração

1. **Leia** [arquitetura.md](./arquitetura.md) — saber onde está o quê.
2. **Confirme que funciona** antes de mexer:
   ```powershell
   npm run dev:mock
   # OU
   npm run dev     # se precisa do backend
   ```
3. **Crie um branch Git** — nunca trabalhar direto na `main`.

---

## Identificar impacto no deploy

Pergunta antes de sair codando: **isso afeta frontend, backend ou banco?**

| Eu mudei...                                                                      | Afeta                            |
| -------------------------------------------------------------------------------- | -------------------------------- |
| `.tsx` / `.ts` em `app/`, `components/`, `contexts/`, `hooks/`, `lib/`, `types/` | Frontend                         |
| `.css`, `tailwind.config.*`, `postcss.config.*`, `index.html`                    | Frontend                         |
| `.env.production`                                                                | Frontend (rebuild)               |
| `backend/src/routes/*`, `backend/src/middleware/*`, `backend/app.js`             | Backend                          |
| `backend/.env`                                                                   | Backend                          |
| `backend/prisma/schema.prisma`                                                   | Banco + Backend                  |
| `backend/prisma/seed*.ts` / `backend/seed-*.js`                                  | Dados (rodar manual após deploy) |
| `package.json` do front                                                          | Frontend (rebuild com install)   |
| `backend/package.json`                                                           | Backend (instalar deps)          |

Depois, consulte [deploy.md](./deploy.md) para saber o que subir.

---

## Regras de ouro

### 1. Nunca importar de `dev-mocks/` em código de produção

O `lib/api-client-factory.ts` já separa mock e real. Se você escrever `import { mockProducts } from "dev-mocks/..."` em algum componente, ele vai para o bundle de produção.

### 2. Nunca hardcodear URL de API

Use `import.meta.env.VITE_API_URL` ou o `apiClient` pronto.

### 3. Nunca commitar `.env` com credenciais reais

Só `.env.example` vai pro git. `backend/.env` e `dev-mocks/` estão no `.gitignore`.

### 4. Nunca rodar `prisma migrate dev` em produção

Só `prisma migrate deploy`. Ver [banco.md](./banco.md).

### 5. Nunca deletar registros — desativar

`is_active = false` em vez de `DELETE`. Preserva histórico.

### 6. Nunca editar `dist/` manualmente

É gerado pelo `npm run build`. Qualquer alteração ali é perdida no próximo build.

### 7. Nunca misturar bibliotecas de ícones

Só Lucide (`lucide-react`). Importações de outras (Heroicons, Feather) quebram o design system.

### 8. Nunca criar modal centralizado para CRUD

Use drawer lateral (padrão da plataforma). Ver [ui-e-padroes.md](./ui-e-padroes.md).

### 9. Nunca ignorar erro de TypeScript

`npm run build` roda `tsc` — **qualquer** erro quebra o deploy. Se precisar fugir, use `// @ts-expect-error` com comentário do motivo.

### 10. Nunca assumir que o backend está rodando

Componentes devem tratar loading + erro graciosamente.

---

## Como saber onde editar

Roteiro mental:

1. **É uma tela?** → `app/<portal>/<rota>/page.tsx`
2. **É um componente reutilizável?** → `components/<nome>.tsx`
3. **É estado compartilhado?** → `contexts/` ou `lib/contexts/`
4. **É chamada de API?** → `lib/api-client.ts` (frontend) + `backend/src/routes/<dominio>.ts` (backend)
5. **É um campo novo no banco?** → `backend/prisma/schema.prisma`
6. **É regra de negócio de preço?** → `lib/pricing-engine.ts`
7. **É um texto/conteúdo de produto?** → `backend/seed-product-*.js`

Quando em dúvida, **procurar arquivo similar existente** (`grep` no nome). A plataforma já tem ~70 componentes — reusar é mais rápido e mantém consistência.

---

## Criar algo novo

### Tela nova

1. Criar pasta `app/<portal>/<rota>/` com `page.tsx`
2. Registrar rota em `App.tsx`
3. Adicionar item na sidebar (`components/sidebar.tsx`)
4. Usar `PageHeader` + layout padrão
5. Listagens com `data-table`, ações via drawer lateral

### Endpoint novo

1. Criar arquivo em `backend/src/routes/<dominio>.ts` (copiar estrutura de `products.ts`)
2. Registrar em `backend/src/app.ts`: `app.use("/api/<dominio>", require("./routes/<dominio>"))`
3. Validar input com **zod**
4. Autenticar com `verifyToken`
5. Adicionar método no `lib/api-client.ts` do frontend

### Campo novo num modelo

1. Editar `backend/prisma/schema.prisma`
2. `npx prisma migrate dev --name <descricao>`
3. Atualizar zod schema na rota
4. Atualizar adapter (`lib/product-adapter.ts` etc.)
5. Atualizar interface no contexto do front
6. Atualizar UI

### Componente novo

1. Procurar primeiro em `components/` e `components/ui/` se já existe algo similar
2. Se não existe: criar com TypeScript, props tipadas, mobile-first
3. Usar primitivos `components/ui/*`
4. Ícones só Lucide
5. Cores via CSS vars ou classes Tailwind semânticas

---

## TypeScript

- **Strict mode** está ligado. Evitar `any` — usar `unknown` + narrowing quando precisar.
- Types globais vão em `types/`.
- Types de contexto vão no próprio arquivo do contexto.
- **Nunca** exportar `any`.

---

## Git e commits

- Branch por feature: `feat/nome-curto`, `fix/descricao`, `docs/o-que`.
- Commits em português, tempo presente: `adiciona campo X`, `corrige cálculo Y`.
- Não commitar: `node_modules/`, `dist/`, `dev-mocks/`, `*.db`, `.env`.

---

## Testar antes de subir

Check rápido:

1. `npm run dev:mock` — UI funciona sem backend?
2. `npm run dev` — integra com backend local?
3. `npm run build` — build passa sem erro?
4. Abrir o build gerado com `npm run preview` e testar o fluxo alterado.

Se tudo OK → ver [checklist-manutencao.md](./checklist-manutencao.md) e fazer deploy.

---

## Manter compatibilidade com cPanel

Considerações específicas do cPanel:

- **SPA**: sempre manter `.htaccess` com rewrite para `index.html`. Sem ele, as rotas do client dão 404 ao dar refresh.
- **Node App**: usa um start file único (`app.js`). Alterações em `src/` precisam funcionar com `tsx` ou ser compiladas antes.
- **Variáveis de ambiente**: configuradas no painel "Setup Node.js App" e/ou `.env` no servidor.
- **Restart**: trocar código no backend não tem efeito até clicar **Restart App** no painel.
- **Permissões de arquivo**: `755` para pastas, `644` para arquivos.
- **Logs**: ver pelo painel cPanel (stderr e stdout ficam em arquivos).

---

## Documentar alterações

Quando fizer algo relevante:

1. **Se mudou arquitetura ou criou padrão novo** → atualize o doc correspondente em `/docs`.
2. **Se adicionou regra de negócio** → atualize `regras-de-negocio.md`.
3. **Se criou tela nova** → adicione em `telas-e-funcionalidades.md`.
4. **Se mudou variável de ambiente ou processo de deploy** → atualize `deploy.md`.
5. **Se criou seed novo** → mencione em `banco.md` e/ou `produtos.md`.

Documentação desatualizada é pior que sem documentação. Gaste 5 minutos atualizando.

---

## Debug e diagnóstico

### Frontend

- DevTools → Network: ver se chamadas à API estão corretas (URL, headers, body).
- DevTools → Application → LocalStorage: confirmar `token` e flags.
- `console.log` é aceitável em dev, mas **remover antes de subir** para produção.

### Backend

- `npx prisma studio` para inspecionar o banco.
- Logs do Express: todo erro passa pelo middleware de erro — adicionar `console.error` temporariamente ajuda.
- `curl` para testar endpoints:
  ```powershell
  curl http://localhost:3001/api/health
  ```

### Banco

- `npx prisma migrate status` — conferir sincronização.
- `sqlite3 prisma/dev.db` para SQL manual.
