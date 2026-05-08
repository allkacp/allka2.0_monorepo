# Regras de Negócio

Regras e comportamentos já definidos que precisam ser respeitados pelo desenvolvimento.

---

## Perfis e acesso

### Tipos de conta (`User.account_type`)

| Tipo       | Portal        | Pode fazer                                          |
| ---------- | ------------- | --------------------------------------------------- |
| `admin`    | `/admin/*`    | Tudo — gestão da plataforma                         |
| `nomade`   | `/nomades/*`  | Pegar tarefas, submeter entregas, receber pagamento |
| `empresa`  | `/empresa/*`  | Contratar produtos, ver projetos, pagar faturas     |
| `agencia`  | `/agencia/*`  | Gerenciar carteira de clientes, MRR                 |
| `parceiro` | `/parceiro/*` | Indicar agências, ver comissões, solicitar saque    |

**Regra**: cada usuário pertence a **exatamente um** `account_type`. Não existe multi-perfil na mesma conta. Se a mesma pessoa é admin e nômade, são dois usuários.

### Permissões granulares (apenas admin)

Admins podem ter **perfis de permissão** diferentes (`AdminProfile` + `AdminPermission`). Nem todo admin vê tudo.

- Tela: `/admin/permissoes`
- Lógica: `apps/frontend/lib/user-permissions.ts`
- Backend: `apps/backend/src/routes/permissions.ts`

---

## Empresas

- Empresa é **obrigatoriamente vinculada a uma agência ou admin** quando criada.
- Desativar ≠ deletar. Empresas inativas não aparecem em listagens públicas mas mantêm histórico.
- Termos de uso devem ser aceitos antes do primeiro projeto (`term-acceptance-gate`).
- CNPJ é único.

---

## Agências

- Uma agência tem um **parceiro responsável** (ou não).
- Têm **nível** (`PartnerLevel`) que define comissão e benefícios.
- Carteira própria de clientes (empresas).
- MRR é calculado no backend com base nas `Invoice` ativas das empresas da carteira.

---

## Parceiros

- Indicam agências → recebem comissão sobre faturamento delas.
- Comissões (`PartnerCommission`) são geradas automaticamente quando `Invoice` da empresa da agência indicada é paga.
- Saques (`WithdrawalRequest`) requerem conta bancária cadastrada (`BankAccount`).
- Só é possível sacar **saldo disponível** (transações com status aprovado).

---

## Nômades

- Nômade precisa estar **habilitado** em uma `Specialty` para pegar tarefas dela.
- Habilitação requer:
  1. Passar nos **testes** do produto (`metadata.tests`)
  2. Cumprir o **checklist de qualificação** do produto (`metadata.qualificationChecklist`)
  3. Aprovação do admin
- Nível (`NomadeLevel`) define multiplicador de ganhos e acesso a tarefas premium.

### Pagamento

- Ao concluir `TaskExecution`, gera-se `WalletTransaction` para o nômade.
- Saque também via `WithdrawalRequest`.

---

## Produtos

Detalhes completos em [produtos.md](./produtos.md). Regras essenciais:

1. **Produto pai carrega o que é compartilhado** (tarefas, etapas, testes, briefing, presentation, baseFeatures).
2. **Variação só carrega o diferencial** (preço, prazo, features específicas).
3. **`presentation.highlights` é genérico** — nunca colocar info de uma variação específica lá.
4. **`code` é imutável** após criar (aparece em faturas, relatórios, integrações).
5. **Desativar** (`is_active = false`) em vez de deletar — mantém histórico.
6. **`itemLimit`** define quantos contratos simultâneos uma mesma empresa pode ter do mesmo produto.

---

## Projetos

- `Project` é criado quando empresa contrata um produto.
- Vinculado a: `company_id`, `product_id`, `variation_id` (se aplicável), `agency_id` (se empresa é de agência).
- Ciclo de vida passa pelas `stages` do produto (`E01 → E07`).
- Cliente preenche o **briefing** logo após contratar.
- Nômades habilitados são alocados nas `TaskExecution` geradas.

---

## Tarefas

- `TaskTemplate` (no produto) = modelo.
- `TaskExecution` = instância real no projeto, feita por um nômade.
- Estados: pendente → em andamento → em revisão → aprovada / recusada → paga.
- Admin/agência pode reatribuir tarefas.
- Prazo (`deadline`) calculado com base no `delivery_days` do produto/variação.

---

## Testes de qualificação (circuito pré-habilitação)

- Definidos em `metadata.tests` do produto.
- Nômade responde e o admin (ou sistema) avalia.
- Só nômades aprovados aparecem no pool de matching para aquele produto.
- Checklist complementar em `metadata.qualificationChecklist` é validado manualmente pelo admin.

---

## Briefing

- `metadata.briefing` do produto define a estrutura do questionário.
- Cliente preenche no próprio projeto (primeiros dias).
- Resposta fica salva como JSON no projeto.
- É **obrigatório** preencher antes das tarefas começarem (regra de frontend — E01).

---

## Financeiro

### Faturas (Invoice)

- Geradas automaticamente conforme recorrência do produto (`Mensal`, `Anual`, `Único`).
- Status: pendente, paga, atrasada, cancelada.
- Pagamento atualiza saldo da agência/parceiro via `PartnerCommission` / carteiras.

### Impostos

- Configurados em `constants/tax-rates.ts`.
- Aplicados no `pricing-engine` no cálculo do valor final.

### Comissões

- **Agência**: % do valor do projeto (conforme `PartnerLevel`).
- **Parceiro**: % sobre MRR das agências que indicou.
- **Nômade**: valor direto da tarefa executada.

Todos geram `WalletTransaction` e podem ser sacados via `WithdrawalRequest`.

---

## Termos de uso

- `Term` tem versão. A versão ativa vira obrigatória.
- `TermAcceptance` registra quem aceitou qual versão.
- Gate de UI: `apps/frontend/components/term-acceptance-gate.tsx` bloqueia o uso da plataforma se tem termo pendente.

---

## Segurança

1. **Todas as rotas** (exceto `/api/auth/login` e `/api/health`) exigem JWT válido.
2. **Senhas** armazenadas com `bcryptjs` (hash, não texto puro).
3. **CORS** configurado via env (`CORS_ORIGIN`).
4. **Dados sensíveis** (CPF, CNPJ, dados bancários) nunca em logs.

---

## Integridade de dados

- **FKs obrigatórias** no Prisma — quando você deleta um registro, verificar cascata.
- **Soft delete** preferido via `is_active = false`.
- **Timestamps** `created_at` / `updated_at` devem ser preenchidos pelo backend — nunca confiar no cliente.

---

## Regras de UI/UX já firmadas

- Drawer lateral para criar/editar, não modal centralizado (exceto confirmações).
- Drawer respeita sidebar (offset `left: sidebarWidth`).
- Footer da plataforma deve ficar visível mesmo com drawer aberto (`h-[calc(100vh-24px)]`).
- Textos de ação: "Adicionar ao **projeto**" (não "pedido").
- Português do Brasil em toda UI.
- Tema segue variáveis CSS do `SidebarContext`.
