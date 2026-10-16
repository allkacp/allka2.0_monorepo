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

## Cadastro de produtos (catalog2) — regras vigentes (atualizado em 2026-10-16)

> O catálogo atual é o módulo **`catalog2`** (editor em 5 passos). O guia campo a campo está em [cadastro-produto-passo-a-passo.md](./cadastro-produto-passo-a-passo.md); esta seção resume as **regras de negócio** decididas pelo usuário e já implementadas. As regras do bloco "Produtos" mais abaixo descrevem o modelo antigo (legado).

1. **Versões.** Produto tem versões; versão publicada é **imutável** (a tela bloqueia e o backend reaplica). Publicar **não ativa** o produto. Mudança = nova versão (rascunho).
2. **Uma tarefa por produto individual.** O restante são **etapas**. Várias tarefas só em **combos**, montados na tela de Combos com produtos prontos.
3. **Horas só nas etapas.** A tarefa soma e mostra o custo estimado (horas × valor/hora, sem taxas/margem). Preço e prazo são calculados **no servidor** a partir das etapas, especialidades (Precificação global), taxas e margem.
4. **Executor da etapa:** humano, IA ou **humano ou IA** (duas opções, cada uma com especialidade/horas/custo; o cliente escolhe). **Quem recebe:** nômade (rodízio por especialidade), líder da área (o com menos abertas) ou específico, ou equipe interna.
5. **Qualificação (conferência interna) x aprovação (cliente).** Qualificação é **opcional por etapa** (desligada por padrão); etapa feita por **IA sempre** é qualificada; em "humano ou IA" há duas configurações (humano: liga/desliga; IA: sempre). Tipos de qualificador: líder da área, pessoa específica, líder e depois pessoa, **nômades qualificadores**.
6. **Nômade qualificador:** marcado no cadastro (`Nomade.is_qualifier`); rodízio por menos conferências pendentes, depois qualificação mais antiga; **só na área habilitada**, **nunca o próprio executor**; sem ninguém disponível → o líder da área. O qualificador **custa 20%** do custo humano da etapa (configurável em Admin → Precificação). Tela única "Etapas para qualificar" (`/nomades/qualificacoes`, `/leader/qualificacoes`, `/admin/qualificacoes`) para nômade, líder e admin.
7. **Execução por etapa** (chave "Esta tarefa executa por etapa", vale para a tarefa): cada etapa passa por entrega → qualificação → aprovação do cliente antes de liberar a próxima. **Etapa interna** = o cliente não vê nem aprova. A próxima etapa pode abrir automaticamente depois de aprovada (senão o líder libera). (O antigo controle "Pagamento do nômade" não existe mais na tela.)
8. **Checklist por etapa em 3 tipos** (execução, aprovação, qualificação) + **orientações** (como fazer) + **evidência** (a prova; tipo, responsável, exemplo). Evidência obrigatória ainda não bloqueia a conclusão no projeto (fase futura).
9. **Variações:** a **opção padrão é o que o produto ORIGINAL já inclui** → sem custo, sem horas, sem efeitos. Só opções **não padrão** somam: horas extras por etapa/tarefa (com **especialidade própria** opcional; sem ela vale a da etapa), prazo, valor, tarefas/entregáveis. Variação pode ser "incluída no produto original" (`base_included`) ou um extra novo. A regra "padrão x extra" será validada com o Gabriel.
10. **Prompt da IA por etapa** é guardado na etapa (`ops.ai_prompt`), vai para a etapa do projeto e para a execução da IA; nunca aparece ao cliente. (Item reprovado na conferência de 15/10 — motivo pendente.)
11. **Alterações por IA grátis** por etapa; o produto soma. Depois das grátis, cada alteração é cobrada da carteira do cliente.
12. **Acessos** são cadastrados **dentro da etapa** (podem ser reaproveitados por outras etapas), com validação/revalidação e lembretes; **nunca se guarda senha**.
13. **Quem vê o produto:** todos, só Company, só Agency (comum), só Agency Partner ou só equipe interna; mais limite por **nível de agência**. Vale para lista, detalhe, cotação, cesta e IA.
14. **Produtos recorrentes:** ciclos, continuidade do executor e revalidação de acessos são configurados na tarefa (ver itens 18–22); a etapa pode ser "só na primeira execução" (implantação) ou "dispensável quando o mesmo executor continua".
15. **Publicação** só passa com tudo válido (lista completa na seção 7 do guia): título, descrição, pilar, categoria, 4F, tarefa(s) com etapas, **cada etapa com especialidade e horas**, fluxo sem ciclo, IA configurada, variações/adicionais/condições válidos, entrega emergencial configurada, **modalidades coerentes (assinatura mensal exige entrega mensal)**, preço calculável.
16. **Fonte da verdade dos produtos = computador local.** O servidor (`allka.store`, QA) só recebe produtos/dados por **espelho** ou importação, com ordem explícita do usuário.
17. **Modalidades de contratação: só duas.** **Avulso** (um único ciclo, sem renovação automática) e **Assinatura mensal** (novo ciclo a cada mês). Podem estar as duas. Não existe mais "implementação inicial" como botão e "somente em pacote" não é campo do produto. Os campos antigos (`has_initial_implementation`, `implementation_rule`, `implementation_blocks_operation`, `sell_mode`, `sale_modes_enforced`) continuam no banco só para contratos/versões antigas: não têm tela, **não bloqueiam a publicação** e não alteram preço nem tarefas.
18. **Implantação = etapas "Só na primeira execução".** Elas entram na **primeira cobrança** e rodam **só no primeiro ciclo daquele produto naquele projeto**; **nunca** entram no preço da renovação. Projeto novo (mesmo cliente) = nova primeira execução; recontratar no mesmo projeto e simples revalidação **não** repetem a implantação; o administrador pode **forçar** a repetição (por API), com justificativa e histórico. Na memória de cálculo aparece separada ("Implantação/primeira execução").
19. **Preço por momento.** *Primeira cobrança* = implantação + 1º ciclo recorrente + variações/adicionais aplicáveis. *Renovação* = só etapas, variações e adicionais **recorrentes** + custos de IA e qualificação do ciclo. *Compra avulsa* = implantação + 1 ciclo, sem renovação. Valores reais e diferentes em simulador, memória de cálculo, cotação, cesta, checkout, contrato, projeto, relatórios, API e histórico. Horas extras de variação numa etapa de primeira execução são cobrança única. Etapa **com horas mas sem especialidade** deixa o preço "a definir" (nunca vira R$ 0,00 em silêncio).
20. **Cobrança mensal ≠ nova entrega mensal.** Assinatura mensal é como o cliente paga; "Este produto gera uma nova entrega todo mês" (Passo 4) é se cada mês pago abre um novo ciclo de tarefas. Assinatura sem entrega mensal **bloqueia a publicação** (o cliente pagaria sem receber). O editor pergunta no mesmo fluxo e o checklist leva ao campo. Produtos já cadastrados não são alterados em silêncio.
21. **Continuidade do executor** (configuração da tarefa, salva na hora): *não permitida / permitida / recomendada / obrigatória*; **prazo de aceite** do executor preferido (ex.: 2 h); **se indisponível** (inativo, bloqueado, sem qualificação) → distribuição normal (avisa o líder) ou líder decide; **depois do prazo** → fila normal ou líder decide; **reutilizar conexões só no mesmo projeto**; **revalidação dos acessos** (primeira vez, mudança do cliente, troca de executor, a cada X dias, todo ciclo). A tarefa é **oferecida** ao preferido (nunca atribuída sem o aceite, exceto "obrigatória"/sem prazo, que vão direto). O cliente pode pedir continuidade em ciclos seguintes quando o plano permitir e o profissional estiver disponível e elegível.
22. **Etapa "dispensável quando o mesmo executor continua".** Se o mesmo executor assume o ciclo, a etapa é dispensada, **não é cobrada** (vira crédito na próxima fatura da assinatura), o motivo fica no histórico do projeto e a simulação lista as etapas dispensáveis. Só vale com continuidade ≠ "não permitida", no **mesmo projeto** (se "reutilizar só no mesmo projeto" estiver ligado) e sem mudança que exija revalidar. O administrador pode **exigir** a etapa mesmo assim (justificativa obrigatória; de antemão ou, se a etapa seguinte ainda não começou, depois de dispensada).
23. **Questionário de contratação = construtor universal (17/10).** 22 tipos de resposta; cada pergunta e cada questionário têm **ID próprio permanente**; configuração por pergunta (obrigatória, ativa/inativa, visibilidade, placeholder, padrão, limites, seção, etapa de destino, anexos, condição por resposta anterior com 9 operadores). **Anexos** com armazenamento seguro (extensão + tipo real + tamanho validados no servidor, autor/data/pergunta registrados, sem caminho interno, permissão do projeto). **Reutilização:** vincular sincronizado ou criar cópia independente; modelo global; duplicar. **Modelo compartilhado nunca é editado em silêncio:** a tela pede escolha (cópia ou editar o modelo com confirmação; bloqueado se versão publicada o usa). O briefing é **congelado** na contratação (com ID/versão): editar o modelo não altera contratos nem respostas. Obrigatórias só bloqueiam o envio final; rascunho nunca bloqueia. **Entregáveis** (bloco abaixo do questionário, largura total): ID permanente, etapa, momento, formato, arquivo-modelo, evidência, qualificação interna, aprovação do cliente, visibilidade, recorrência (todo ciclo ou só na 1ª execução) e condição; reaproveitável entre produtos; vira registro da tarefa/etapa no projeto.
24. **Dependências.** **Produto individual não tem dependência entre tarefas** (a API recusa; a ordem entre etapas fica em "Fluxo das etapas"). Dependência de um produto em relação a outro fica em **Combos / Pacotes e Dependências**.
25. **"Somente em pacote" é decisão do administrador no pacote** ("Impedir venda separada", com aviso claro). Produto dentro de um pacote **continua vendido separadamente** por padrão; só a marca bloqueia a compra fora do pedido que traga os itens exigidos. Campos escondidos nunca bloqueiam a publicação.

---

## Produtos (modelo antigo — legado)

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
