# Checklist de Manutenção

Checklists práticas para cada fase do trabalho.

---

## 1. Criar uma funcionalidade nova

### Planejamento

- [ ] Entendi o requisito e validei com quem pediu
- [ ] Verifiquei se já existe algo parecido na plataforma (componente, rota, contexto)
- [ ] Identifiquei o impacto: frontend / backend / banco
- [ ] Se impacta banco: pensei no nome da migration e nos dados existentes

### Desenvolvimento (frontend)

- [ ] Branch criado (`feat/...`)
- [ ] Tela segue o padrão (PageHeader, data-table, drawer lateral)
- [ ] Usa variáveis CSS do brand, não cor hardcoded
- [ ] Ícones são apenas Lucide
- [ ] Formulário tem validação básica + feedback com `useToast()`
- [ ] Estados de loading, erro e vazio tratados
- [ ] Mobile testado (< 640px)
- [ ] Nenhum `any` não justificado
- [ ] Nenhum `console.log` esquecido

### Desenvolvimento (backend)

- [ ] Rota criada em `apps/backend/src/routes/<dominio>.ts`
- [ ] Registrada em `apps/backend/src/app.ts`
- [ ] Validação zod no input
- [ ] `verifyToken` aplicado
- [ ] Tratamento de erro retorna `{ error: "..." }`
- [ ] Campos sensíveis não vão para logs
- [ ] Performance OK (evitar N+1 — usar `include` do Prisma)

### Desenvolvimento (banco)

- [ ] Schema atualizado em `apps/backend/prisma/schema.prisma`
- [ ] Migration criada com `npx prisma migrate dev --name <descricao>`
- [ ] SQL gerado foi revisado
- [ ] Testei o reset local: `npx prisma migrate reset --force`

---

## 2. Revisar alterações antes de subir

### Código

- [ ] Removi todos os `console.log` e `debugger`
- [ ] Removi imports não utilizados
- [ ] TypeScript sem erros: `npm run build` local
- [ ] Código em português na UI, inglês no código
- [ ] Commits limpos e descritivos

### Validação funcional

- [ ] `npm run dev:mock` — fluxo novo funciona 100% em mock
- [ ] `npm run dev` (com backend) — fluxo novo funciona 100% integrado
- [ ] Fluxos existentes ao redor **não quebraram**
- [ ] Testei com usuário de cada perfil relevante (admin / empresa / nômade / ...)
- [ ] Testei em mobile (DevTools → toggle device toolbar)

### Documentação

- [ ] Atualizei `docs/` se mudei algo estrutural
- [ ] Adicionei comentários em trechos não óbvios (regra de negócio, workaround)

---

## 3. Preparar deploy

### Variáveis de ambiente

- [ ] `.env.production` do frontend está com `VITE_API_URL` correto
- [ ] `.env` do backend em produção está atualizado
- [ ] `JWT_SECRET` é o mesmo entre deploys (não trocar sem motivo)

### Build

- [ ] `npm run build` executa sem erros
- [ ] Pasta `apps/frontend/dist/` foi gerada recente
- [ ] Tamanho do bundle razoável (checar se não incluiu mock por engano)

### Banco

- [ ] Se mudou schema: migration foi gerada, revisada e commitada
- [ ] Backup do banco de produção foi feito (se migration é destrutiva)
- [ ] Seeds necessários estão prontos

### Dependências

- [ ] Se adicionei dependência: `package.json` e `package-lock.json` commitados
- [ ] `node_modules` reinstalado local e build passou

---

## 4. Fazer deploy (cPanel)

### Frontend

- [ ] Backup do `public_html/` (copiar para `public_html_backup_<data>/`)
- [ ] Subir conteúdo de `apps/frontend/dist/` no `public_html/`
- [ ] Confirmar que `.htaccess` está presente
- [ ] Limpar cache do navegador (Ctrl+F5)

### Backend

- [ ] Se mudou `package.json`: rodar **Run NPM Install** no painel
- [ ] Subir arquivos alterados (`src/`, `app.js`, etc.)
- [ ] Se tem migration nova: SSH → `cd ~/backend && npx prisma migrate deploy`
- [ ] **Restart App** no painel "Setup Node.js App"

### Seeds (quando aplicável)

- [ ] Subir arquivo de seed para `/home/<user>/backend/`
- [ ] SSH → `node seed-<nome>.js`
- [ ] Confirmar execução no log

---

## 5. Validar depois do deploy

### Smoke test (em até 5 minutos)

- [ ] `https://app.allka.com.vc` carrega sem tela branca
- [ ] Login funciona com usuário real
- [ ] Uma página principal de cada portal abre (dashboard admin, empresa, nômade, agência, parceiro)
- [ ] `https://api-dev.allka.com.vc/api/health` responde 200
- [ ] Fluxo da feature nova funciona em produção

### Verificações técnicas

- [ ] DevTools → Console: sem erros vermelhos
- [ ] DevTools → Network: todas chamadas à API retornam 200/201
- [ ] Logs do backend no cPanel: sem erro fatal nos últimos minutos
- [ ] Banco de produção: dados novos (se for o caso) foram persistidos

### Rollback rápido (se algo quebrou)

- [ ] Restaurar `public_html_backup_<data>/` para `public_html/`
- [ ] Restaurar backup do banco (se aplicou migration quebrada)
- [ ] Restart do app backend
- [ ] Investigar causa antes de tentar novo deploy

---

## 6. Após concluir

- [ ] Fazer merge do branch
- [ ] Avisar o time o que foi atualizado e em qual ambiente
- [ ] Atualizar documentação pendente em `docs/`
- [ ] Limpar branches antigos

---

## Gabarito "o que subir"

| Alterei...                    |   Subir frontend?    |       Subir backend?       | Rodar migration? | Rodar seed? |
| ----------------------------- | :------------------: | :------------------------: | :--------------: | :---------: |
| Componente/tela React         |          ✅          |             ❌             |        ❌        |     ❌      |
| CSS / texto de UI             |          ✅          |             ❌             |        ❌        |     ❌      |
| Rota `/api/*` (sem schema)    |          ❌          |             ✅             |        ❌        |     ❌      |
| Middleware                    |          ❌          |             ✅             |        ❌        |     ❌      |
| `schema.prisma`               |       depende        |             ✅             |        ✅        |     ❌      |
| `seed-product-*.js`           |          ❌          |        ✅ (arquivo)        |        ❌        |     ✅      |
| `.env.production` (front)     |     ✅ (rebuild)     |             ❌             |        ❌        |     ❌      |
| `.env` backend (produção)     |          ❌          |        ✅ (restart)        |        ❌        |     ❌      |
| `package.json` frontend       | ✅ (rebuild+install) |             ❌             |        ❌        |     ❌      |
| `package.json` backend        |          ❌          | ✅ (NPM Install + restart) |        ❌        |     ❌      |
| Apenas `docs/` ou `README.md` |       opcional       |          opcional          |        ❌        |     ❌      |
