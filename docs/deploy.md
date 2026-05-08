# Deploy

Guia prático de deploy da plataforma Allka 2026 no cPanel.

---

## Visão geral

A plataforma tem **três artefatos** que sobem separadamente:

| Artefato     | O que é                         | Onde fica no cPanel                             | Frequência típica         |
| ------------ | ------------------------------- | ----------------------------------------------- | ------------------------- |
| **Frontend** | Build estático (`apps/frontend/dist/`)        | `public_html/`                                  | A cada mudança de tela/UI |
| **Backend**  | API Node + Prisma Client gerado | `/home/<user>/backend/` (Node app no cPanel)    | A cada mudança de API     |
| **Banco**    | Migrations + seeds              | Aplicado pelo backend (`prisma migrate deploy`) | Só quando o schema muda   |

Cada um pode ser publicado **independentemente**. Mudei só CSS de uma tela? Sobe só frontend.

---

## Como saber o que precisa subir

Use esta checagem mental:

| Eu mudei...                                                            | Sobe frontend? |            Sobe backend?            | Roda migration? |
| ---------------------------------------------------------------------- | :------------: | :---------------------------------: | :-------------: |
| Componente React, página, CSS, texto na tela                           |       ✅       |                 ❌                  |       ❌        |
| Arquivo dentro de `apps/frontend/app/`, `apps/frontend/components/`, `apps/frontend/contexts/`, `apps/frontend/hooks/`, `apps/frontend/lib/` |       ✅       |                 ❌                  |       ❌        |
| `.env.production` (URL da API, flags VITE)                             |  ✅ (rebuild)  |                 ❌                  |       ❌        |
| Rota em `apps/backend/src/routes/*.ts`                                      |       ❌       |                 ✅                  |       ❌        |
| Validação zod, middleware, lógica de handler                           |       ❌       |                 ✅                  |       ❌        |
| `apps/backend/prisma/schema.prisma`                                         |    depende¹    |                 ✅                  |       ✅        |
| Seed (`apps/backend/seed-*.js`, `prisma/seed.ts`)                           |       ❌       | ✅ (subir o arquivo) + rodar manual |       ❌        |
| Tipo compartilhado em `apps/frontend/types/` (frontend)                              |       ✅       |                 ❌                  |       ❌        |

¹ Sobe frontend só se você ajustou interfaces/contextos no front por causa do novo campo.

---

## Estrutura no cPanel

```
/home/<user>/
├── public_html/             ← FRONTEND (conteúdo de dist/)
│   ├── index.html
│   ├── assets/
│   └── .htaccess            ← rewrite SPA (todas as rotas → index.html)
│
└── backend/                 ← BACKEND (Node app gerenciado pelo cPanel)
    ├── app.js               ← entry (configurado no painel "Setup Node.js App")
    ├── package.json
    ├── node_modules/
    ├── prisma/
    │   ├── schema.prisma
    │   ├── migrations/
    │   └── prod.db          ← banco SQLite (se for o caso)
    ├── src/                 ← (opcional, se rodar via tsx)
    └── .env                 ← variáveis de produção
```

> O painel do cPanel "Setup Node.js App" expõe a porta interna; a URL pública (`api-dev.allka.com.vc`) é apontada via DNS / proxy reverso.

---

## Deploy do frontend (passo a passo)

### Build local

```powershell
# Modo produção (usa .env.production)
npm run build
# → gera /dist
```

> Se rebuild falhar com erro de TS, ver [boas-praticas-dev.md](./boas-praticas-dev.md#typescript). O comando `npm run build` roda `tsc && vite build` — uma falha de tipo trava o deploy.

### Subida via cPanel

1. Acessar **File Manager** → `public_html/`
2. **Apagar** o conteúdo antigo (ou mover para `public_html_backup_<data>/`)
3. Subir o conteúdo de `apps/frontend/dist/` (não a pasta, **o conteúdo dela**)
4. Garantir que o `.htaccess` está presente:
   ```apacheconf
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```
5. Limpar cache do browser (Ctrl+F5) e validar.

### Variáveis de build (frontend)

Configuradas em `.env.production` antes do `npm run build`:

| Variável         | Valor produção                     |
| ---------------- | ---------------------------------- |
| `VITE_USE_MOCKS` | `false`                            |
| `VITE_API_URL`   | `https://api-dev.allka.com.vc/api` |

---

## Deploy do backend (passo a passo)

1. Garantir que mudanças foram **testadas localmente** com `node app.js`.
2. Subir os arquivos alterados via File Manager para `/home/<user>/backend/`:
   - `app.js`
   - `src/` (se rodar TS direto via `tsx`)
   - `prisma/schema.prisma` (se mudou)
   - `package.json` (se adicionou dependência)
3. Se `package.json` mudou: no painel "Setup Node.js App" → **Run NPM Install**.
4. Se schema mudou: rodar `npx prisma migrate deploy` no terminal SSH (ver [banco.md](./banco.md)).
5. **Restart App** no painel "Setup Node.js App".
6. Validar com `curl https://api-dev.allka.com.vc/api/health` (deve responder 200).

### Variáveis críticas do backend (`.env` em produção)

| Variável       | Exemplo                                                     | Função                |
| -------------- | ----------------------------------------------------------- | --------------------- |
| `DATABASE_URL` | `file:./prisma/prod.db` ou `postgresql://user:pass@host/db` | Conexão Prisma        |
| `JWT_SECRET`   | string longa aleatória                                      | Assinatura dos tokens |
| `PORT`         | `3001` (ou o que o cPanel atribuir)                         | Porta interna         |
| `CORS_ORIGIN`  | `https://app.allka.com.vc`                                  | Origin permitida      |

> **Nunca commitar** `.env` real. O template é `apps/backend/.env.production.example`.

---

## Deploy só de banco

Quando você adicionou ou alterou um modelo em `schema.prisma`:

1. **Localmente**: criar a migration nomeada
   ```powershell
   cd apps/backend
   npx prisma migrate dev --name add_campo_x
   ```
2. Verificar que `apps/backend/prisma/migrations/<timestamp>_add_campo_x/migration.sql` foi gerado e está correto.
3. Subir a pasta `migrations/` inteira para o servidor.
4. SSH no servidor → `cd ~/backend && npx prisma migrate deploy`.
5. **Restart** do app Node (Prisma Client é regenerado).

> **Atenção**: `migrate dev` em produção é proibido — ele pode dropar dados. Usar **sempre** `migrate deploy`.

Mais detalhes em [banco.md](./banco.md#migrations).

---

## Cenários comuns

### "Mudei só um texto numa tela"

→ `npm run build` → subir `apps/frontend/dist/` no `public_html/`. Pronto.

### "Adicionei rota nova no backend"

→ Subir `apps/backend/src/routes/...` + restart app Node. Frontend só sobe se você criou tela que consome essa rota.

### "Adicionei campo novo no produto"

→ `schema.prisma` + migration + rota + adapter + contexto. Sobe frontend, backend e roda migration. Ordem: backend primeiro (com migration aplicada), frontend depois.

### "Re-seedar produto PA0001 em produção"

→ SSH → `cd ~/backend && node seed-product-PA0001.js`. Não precisa rebuild de nada.

### "Trocar logo"

→ Substituir arquivo em `apps/frontend/public/` → `npm run build` → subir `apps/frontend/dist/`.

---

## Erros comuns

| Sintoma                                              | Causa                                              | Solução                                       |
| ---------------------------------------------------- | -------------------------------------------------- | --------------------------------------------- |
| Tela em branco após deploy                           | falta `.htaccess` ou cache do browser              | restaurar `.htaccess`, Ctrl+F5                |
| `Cannot read properties of undefined` em produção    | API mudou, frontend antigo                         | rebuild + redeploy frontend                   |
| `PrismaClientInitializationError`                    | `DATABASE_URL` incorreta ou DB inacessível         | conferir `.env` e permissões                  |
| `502 Bad Gateway` na API                             | app Node parado/crash                              | logs no painel cPanel → restart               |
| Login OK mas todas as APIs retornam 401              | `JWT_SECRET` mudou entre deploys                   | usar mesmo `JWT_SECRET` em todos os ambientes |
| Migration aplicada mas API responde com campo `null` | esqueceu de restart do Node (Prisma Client antigo) | restart app                                   |
| Frontend mostra `Até 2 campanhas` mesmo após re-seed | cache do browser ou state React                    | Ctrl+F5; se for state, fechar/reabrir drawer  |

---

## Checklist antes do deploy

- [ ] Funciona local em `npm run dev:mock`?
- [ ] Funciona local em `npm run dev` (com backend real)?
- [ ] `npm run build` sobe sem erro de TS?
- [ ] Variáveis de ambiente estão corretas em `.env.production`?
- [ ] Schema mudou? Migration foi gerada e revisada?
- [ ] Tem dependência nova? `package.json` está atualizado?

## Checklist depois do deploy

- [ ] `https://app.allka.com.vc` carrega?
- [ ] Login funciona?
- [ ] Uma página principal de cada portal abre?
- [ ] `https://api-dev.allka.com.vc/api/health` retorna 200?
- [ ] Logs do backend no cPanel sem erro nos últimos 5 minutos?
- [ ] Avisar o time o que foi atualizado.

