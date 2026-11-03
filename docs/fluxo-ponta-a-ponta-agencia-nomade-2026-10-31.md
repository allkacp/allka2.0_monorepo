# Fluxo ponta a ponta — Agência / Nômade / Líder (31/10/2026) — SOMENTE LOCAL

> Relatório único deste pedido. Atualizado durante o trabalho. Quem retoma (Claude, Codex, pessoa): leia a seção 0 e depois a seção 9 (ponto exato de retomada).
> Nada aqui autoriza commit, push, deploy, espelho, publicação, compra real, lançamento de tarefa real ou mensagem real.

## 0. Situações — não confundir

| Sigla | Significa |
|---|---|
| **IMP** | Implementação concluída no código local |
| **AUT** | Teste automático aprovado (componente simulado ou banco descartável `allka_test_*`) |
| **VIS** | Teste visual realizado na tela real `http://localhost:8082` |
| **USU** | Aprovação do usuário (só ele marca) |

Nenhum item deste documento está marcado **USU**.

## 1. Pedido e regras consideradas

Pedido de 31/10 (tarde): deixar funcional e integrado, de ponta a ponta, o fluxo cadastro do produto → catálogo → cliente/consultor → projeto → cesta → compra/pagamento de teste → comissão → tarefas para lançamento → lançamento → líder/nômade → entrega → qualificação/aprovação → encerramento → renovação/automações; preparar o roteiro para testarmos juntos depois.

Regras obrigatórias (do usuário, README e documentos):
- Somente local. Sem commit, push, deploy, espelho, QA/allka.store, publicação de produto, pagamento real, mensagem real ou exclusão de dados.
- Preservar o layout inteiro (sidebar, cabeçalhos, abas, fontes, cores, tabelas, Painel Moldura, Janela Moldura, overlay escuro). Correção mínima por trás das telas existentes. Mudança de layout ou de regra de negócio → registrar e pedir aprovação.
- Preservar dados, vínculos e alterações de outros agentes (há trabalho do Claude e do Codex sem commit).
- Nunca inventar horas, tarifas, preços, responsáveis ou promessas. Nunca pedir/guardar/exibir senha.
- Administrador não é Líder. Não criar/promover Líder nem atribuir tarefa real para testar.
- Silêncio de 1 h aceita automaticamente SOMENTE ofertas obrigatórias.
- Desconto por período é compartilhado entre versões (V2 não isola). Autorizado: 5% temporário no Mensal do Produto 2 e restaurar 2% logo depois, sem comprar/publicar.
- Testes destrutivos só em bancos descartáveis.

## 2. Estado inicial registrado (antes de qualquer alteração)

- Docker de pé: frontend :8082, backend :3001, MySQL :3306 (banco real `allka`).
- `git status`: 36 arquivos modificados + 15 novos sem commit (trabalho do Claude e do Codex). Nada foi revertido.
- Produto 2: V1 publicada, V2 rascunho. Descontos por período: Mensal **2%**, bimestral 4%, trimestral 6%, semestral 8%, anual 10% (última alteração 25/10).
- Produto SEO 3: V1 publicada (30/10 14:19), V2 rascunho (31/10 16:29) com o entregável "Checklist final de SEO — validação local" e +1 dia na opção até dez páginas.
- Usuários ativos: 2 admin, 1 company_admin, 3 agency_admin, 1 agency_consultant, 1 nomad_admin. **Zero Líder ativo. Zero registro operacional de Nômade.**
- Projetos: `proj_951` (rascunho), `proj_952` (QA, em andamento), `proj_955` (Agência, em andamento, pago em sandbox R$ 3.162,78 em 28/10; tarefa T015717 **PARA_LANCAMENTO** — não lançada).
- Typecheck frontend (Windows): limpo.

## 3. Plano numerado (escopo, dependências, critérios de aceite)

> Cada item é atualizado com: o que deveria funcionar · o que já existia e foi preservado · o que foi alterado (arquivos) · como foi verificado · o que não foi testado · como o Codex repete pela interface · dados usados e estado final.

| # | Bloco | Depende de | Critério de aceite |
|---|---|---|---|
| P0 | Fechar pendências deixadas pelo Codex (testes de acessos, product-editor-typing, typecheck frontend, "Sem assinatura") | — | Resultados reais registrados; nada declarado sem rodar |
| P1 | Cadastro e matriz do produto | P0 | Salvar/continuar/erros/F5 cobertos; IA só propõe; matriz não reescreve contratação |
| P2 | Agência / Partner / Company no catálogo | P1 | Nômade não compra; só versão publicada/disponível; mesma configuração detalhe = cesta = cotação = checkout |
| P3 | Projeto, cliente e consultor no checkout | P2 | Volta à mesma compra com projeto selecionado; servidor recusa cliente/consultor de outra empresa |
| P4 | Compra e comissão | P3 | Total/por produto; cliente vê só total; split plataforma × agência; retry/webhook sem duplicar |
| P5 | Geração das tarefas após a compra | P4 | Instâncias novas com snapshot; quantidade/agrupamento; nada distribuído antes do lançamento; matriz alterada não muda o contratado |
| P6 | Lançamento e distribuição | P5 | Briefing/acessos/dependências conferidos; regras de destino por etapa; admin ≠ líder; silêncio só em obrigatória |
| P7 | Portal do Nômade e do Líder | P6 | Ofertas/tarefas/prazos corretos; sem senha nem dado de outra empresa; executor ≠ qualificador |
| P8 | Entrega, aprovação e encerramento | P7 | Bloqueio só com requisito obrigatório; mensagem leva ao campo; reprovação mantém histórico |
| P9 | Ciclos, renovações e automações | P5 | Implantação fora da renovação; desconto uma vez; workers idempotentes |
| P10 | Administrativo e auditoria | P4–P9 | Admin vê pedido/projeto/tarefas/pagamentos/comissões; permissões no servidor |

## 4. Mapa de lacunas (evidência)

Método: antes de mexer em código, rodar as suítes que já existem para cada etapa do fluxo (banco descartável) e os testes de tela dos portais; conferir na tela real o que só a tela mostra. Lacuna = falha reproduzida ou regra pedida sem código.

| # | Lacuna | Evidência | Tratamento |
|---|---|---|---|
| L1 | Desconto salvo no painel "Modalidades por período" não atualiza o resumo do mesmo editor (continuava "− 2% = R$ 286,99" com 5% gravado) nem a etiqueta de preço do cabeçalho, até F5 | Reproduzido na tela real (Produto 2, V2) em 31/10 16:33 | **Corrigido** (item P1) |
| L2 | "Nômade específico" como destino da etapa não existe no cadastro. Existem: líder automático da área, líder específico, rodízio de nômades, equipe interna, "mesmo executor da etapa X" e preferência pelo nômade anterior (continuidade) | `Catalog2Step.executor_kind` = nomad/leader/internal; busca no código e nos documentos sem decisão registrada | **Decisão do usuário** (campo novo no editor = mudança de layout/regra). Não implementado |
| L3 | Teste "aceitar oferta leva para Minhas Tarefas" falhava | Expectativa rígida: o componente navega pelo wrapper `@/hooks/use-navigate`, que repassa (destino, opções) | **Teste corrigido** (comportamento já certo) |
| L4 | 16 testes de tela do catálogo do cliente/detalhe do produto falham | Procuram textos de uma versão anterior da tela ("1. Escolha o que você precisa", "3. Contratação", "Todos os pilares", "Pausado"). Já constavam na lista de falhas antigas (RETOMAR-AQUI §6) | **Pendente**: reescrever os 2 arquivos para os rótulos atuais. Catálogo foi conferido pela tela em 30/10 (preço muda com opção/adicional) |
| L5 | Base local sem Líder ativo e sem registro operacional de Nômade | Leitura do banco real em 31/10 | **Bloqueia o teste manual** de distribuição/execução real. Não cadastrar/promover sem pedido |
| L6 | Qualificação por **pessoa específica**: o servidor deixava o próprio executor da etapa conferir a própria entrega (só o grupo de nômades qualificadores excluía o executor) | Leitura de `routes/qualificacoes.ts` (`tipoPermitido` sem checar executor) e `stage-engine.ts` (`seguirParaEspecialistaOuAprovacao`) | **Corrigido** (item P7) |
| L7 | 16 cenários de banco de ciclos mensais e implantação falhavam só porque compravam sem projeto (exigido desde 26/10) — e são justamente as provas de "worker 2× não duplica", "matriz alterada não muda o contratado", "renovação sem implantação" | `catalog2-delivery-cycles` 1/9 e `catalog2-implementation-billing` 5/13 com `422 project_required` | **Testes atualizados** (auxiliar `withCheckoutProject`, sem mudar regra): 9/9 e 13/13 |

## 5. Execução por item

### P0 — Pendências deixadas pelo Codex
1. **Deveria:** confirmar os testes interrompidos e o status "Sem assinatura".
2. **Já existia/preservado:** alterações do Codex em `product-editor.tsx`, `step-row-universal.test.tsx`, `product-editor-typing.test.tsx`, `catalog2-product-draft-ai.ts` (+ teste). Nada revertido.
3. **Alterado:** nada.
4. **Verificação:** typecheck frontend (Windows) limpo; `step-row-universal.test.tsx` + `product-editor-typing.test.tsx` = **59/59**. Tela real: SEO 003 (avulso) → Conferência, preço e publicação → linha "Modalidades por período" mostra **Sem assinatura** (não "Mensal"). → AUT + VIS.
5. **Não testado:** nova chamada real da IA (não autorizada nesta rodada).
6. **Codex repete:** `/admin/cadastro-produtos/3?editor=teste` → passo 3 → linha "Modalidades por período".
7. **Dados:** nenhum.

### P1 — Cadastro e matriz (desconto por período)
1. **Deveria:** com 5% no Mensal do Produto 2, admin e prévia do cliente mostram R$ 292,85 − 5% = R$ 278,21; implantação fora; renovação sem desconto duplicado. Ao salvar, todos os lugares do editor mostram o mesmo valor.
2. **Já existia/preservado:** cálculo do servidor (`catalog2-periods.ts`), painel, faixa e etiqueta; layout e textos iguais.
3. **Alterado (L1):** `app/admin/produtos/novo-catalogo/product-periods-inline.tsx` (aviso `catalog2:periods-changed` + `notifyPeriodsChanged`/`usePeriodsChanged`; a faixa avisa ao salvar e recarrega ao ouvir), `product-editor.tsx` (painel "Modalidades por período" avisa em vez de só recarregar a si mesmo, e ouve), `header-price-tag.tsx` (etiqueta de preço recalcula ao ouvir). Sem mudança visual.
4. **Verificação:** tela real com 5%: API do cliente (V1 publicada) devolveu Mensal `discount_percent 5`, `reference 292,85`, `first_charge 278,21`, `renewal 278,21`, `implementation 0`; após F5 o admin mostrou "R$ 292,85/mês − 5% = R$ 278,21/mês". Restaurado 2% em seguida. Teste novo em `product-periods-inline.test.tsx` (aviso de outro lugar atualiza a faixa; outro produto não; salvar aqui avisa) — 15/15 com `header-status-summary`. Tela real após a correção: disparar o aviso gerou nova leitura de períodos (faixa + etiqueta), sem gravar nada. → IMP + AUT + VIS (parcial: a gravação real de novo valor com a correção não foi repetida para não mexer no desconto outra vez).
5. **Não testado:** salvar um desconto novo e ver a faixa mudar sem F5 na tela real (exige nova alteração do desconto → teste manual nº 2 do roteiro, com autorização).
6. **Codex repete:** ver teste manual nº 2 da seção 10.
7. **Dados:** ver seção 7 (5% por 2 min, restaurado 2%).

### P2 — Agência / Partner / Company no catálogo
1. **Deveria:** Nômade não compra; catálogo só com versão publicada e disponível; configuração igual em detalhe, cesta, cotação e checkout.
2. **Já existia/preservado:** `resolveClientContext` (servidor decide quem vê/contrata pelo usuário real: Nômade → 404; Líder só vê; Admin só pré-visualiza; Agency/Company contratam); cotação congelada e revalidada no checkout.
3. **Alterado:** nada.
4. **Verificação:** `catalog2-checkout` 28/28, `catalog2-e2e-scenarios` 10/10 (cenário 10: cotação, pedido e fatura com a mesma variação/adicional/período), `catalog2-multiple-contracts` 10/10, `catalog2-quantity-rules` 13/13. → AUT. Tela: catálogo da agência conferido pelo Codex em 30/10 (R$ 933,47 → 1.244,62 → 1.400,20). → VIS (anterior).
5. **Não testado:** 16 testes de tela do catálogo (L4) desatualizados; cesta→cotação→checkout pela tela nesta rodada.
6. **Codex repete:** testes 4–7 da seção 10.
7. **Dados:** nenhum.

### P3 — Projeto, cliente e consultor no checkout
1. **Deveria:** criar projeto dentro da compra e voltar a ela com o projeto selecionado; consultor = usuário da própria empresa com essa função (e-mail automático); cliente = cadastro vinculado; servidor recusa IDs de outra empresa.
2. **Já existia/preservado:** `ProjectRegisteredContacts`, `projectOnly`, `422 project_required`, reserva transacional do projeto (26–28/10).
3. **Alterado:** nada.
4. **Verificação:** `project-registered-contacts` 11/11 (inclui recusa de cliente/consultor de outra empresa); `components/catalog2/catalog2-checkout-project.test.tsx` passou (painel de projeto simulado). → AUT.
5. **Não testado:** painel REAL de Novo Projeto no navegador nesta rodada.
6. **Codex repete:** testes 8–10 da seção 10.
7. **Dados:** nenhum.

### P4 — Compra e comissão
1. **Deveria:** agência paga ou gera link; comissão total ou por produto (linha inteira com a taxa da linha); cliente vê só o total; split plataforma × agência após pagamento; retry/link repetido não duplica; recusa/expiração/pedido alterado tratados.
2. **Já existia/preservado:** `confirm-payment.ts` (PENDENTE→PAGO condicional, PaymentItem congelado, fatura única por pagamento, lançamentos de carteira com chave de idempotência), `agency-checkout.ts` (link assinado 24 h, impressão digital do pedido → 409 se mudou, 410 expirado), `agency-payment-link.ts` (só total/itens/modalidade; sandbox bloqueado em produção).
3. **Alterado:** nada.
4. **Verificação:** `catalog2-checkout` 28/28 (comissão, link, split, retry), `payment-gateways` e `financial-billing-security` (ver seção 6). → AUT.
5. **Não testado:** pagamento pela tela do link nesta rodada; gateway real (não autorizado — só sandbox).
6. **Codex repete:** testes 11–14 da seção 10.
7. **Dados:** nenhum.

### P5 — Geração das tarefas após a compra
1. **Deveria:** instâncias novas com snapshot; quantidade e lotes respeitados; nada distribuído antes do lançamento; matriz alterada não muda o contratado.
2. **Já existia/preservado:** `generate-tasks-catalog2.ts` (lotes `delivery_groups`; 1+1+3 = três tarefas; um lote de 3 = uma), estado `PARA_LANCAMENTO`, snapshot de questionário/etapas/executor.
3. **Alterado:** só testes (L7).
4. **Verificação:** `catalog2-quantity-rules` 13/13, `catalog2-first-execution` 15/15, `catalog2-delivery-cycles` 9/9 (cenário 5: alterar cadastro depois da compra não muda ciclos contratados), `catalog2-checkout` (questionário alterado depois não afeta execução; retry não duplica tarefa). → AUT. Banco real: `proj_955` (compra sandbox do usuário em 28/10) tem T015717 em **PARA_LANCAMENTO**, sem distribuição — coerente.
5. **Não testado:** "dez unidades separadas" pela tela.
6. **Codex repete:** teste 15 da seção 10.
7. **Dados:** nenhum.

### P6 — Lançamento e distribuição
1. **Deveria:** conferir briefing/acessos/dependências; destino por etapa conforme snapshot; admin ≠ líder; nominal inativo avisa; silêncio de 1 h só em oferta obrigatória.
2. **Já existia/preservado:** `task-release-service`/`task-release-guard`, `stage-engine.abrirEtapa` (líder específico inativo/não-Líder bloqueia com mensagem), `atribuir-lider` (só `role=lider`), `task-rotation-engine` (oferta normal expira e segue o rodízio; **só `is_mandatory` aceita no silêncio**), `specific-assignee-impact`.
3. **Alterado:** nada.
4. **Verificação:** `task-release-orchestration` 34/34, `task-rotation` 19/19, `catalog2-stage-execution` 11/11, `catalog2-step-flow` 7/7, `catalog2-emergency-offer` 5/5, `specific-assignee-impact` (seção 6). → AUT.
5. **Não testado / lacuna:** "nômade específico" como destino (L2, decisão). Distribuição real depende de Líder/Nômade cadastrados (L5).
6. **Codex repete:** testes 16–18 da seção 10.
7. **Dados:** nenhum.

### P7 — Portal do Nômade e do Líder (qualificação)
1. **Deveria:** ofertas/tarefas/prazos corretos; nada de senha ou outra empresa; **qualificador ≠ executor**.
2. **Já existia/preservado:** tela única `/qualificacoes` (nômade, líder, admin); grupo de qualificadores já excluía o executor; `rejectSecrets` em acessos/entregáveis.
3. **Alterado (L6):** `apps/backend/src/lib/stage-engine.ts` — se a pessoa específica que qualifica é quem executou/entregou, a conferência vai para o **líder** (mesma saída do grupo sem ninguém elegível) com motivo no histórico; no modo líder + pessoa, depois do líder a segunda conferência é **dispensada** e registrada; a resposta da decisão passa a informar o estado real. `apps/backend/src/routes/qualificacoes.ts` — o nômade executor não vê nem decide a própria etapa; a pessoa específica que entregou também não (admin continua podendo). Líder que executa e qualifica a própria etapa **não mudou** (sem decisão registrada).
4. **Verificação:** `qualificacoes.integration.test.ts` 4/4 (QAL03 e QAL04 novos). Typecheck backend limpo. → IMP + AUT.
5. **Não testado:** pela tela (exige nômade e etapa reais). Suítes que usam o motor rodadas de novo — ver seção 6.
6. **Codex repete:** teste 21 da seção 10.
7. **Dados:** nenhum.

### P8 — Entrega, aprovação e encerramento
1. **Deveria:** respeitar tarefa/etapa, etapas internas, modos de aprovação; impedir conclusão só por requisito obrigatório; reprovação mantém histórico e refação.
2. **Já existia/preservado:** evidência obrigatória bloqueia entrega com mensagem; quatro modos de aprovação; refação com prazo próprio; histórico por rodada.
3. **Alterado:** nada.
4. **Verificação:** `task-review` 6/6, `task-deliverables` 6/6, `catalog2-step-approver` 3/3, `catalog2-approval-gates-sla` 13/13, `catalog2-e2e-scenarios` cenário 9 (aprova → cliente reprova → ajuste → aprova). → AUT.
5. **Não testado:** visão de cada portal no mesmo estado, pela tela.
6. **Codex repete:** testes 19–24 da seção 10.
7. **Dados:** nenhum.

### P9 — Ciclos, renovações e automações
1. **Deveria:** implantação separada; renovação sem implantação; desconto uma vez; workers idempotentes.
2. **Já existia/preservado:** `catalog2-subscriptions`, `catalog2-period-renewal`, `catalog2-delivery-cycle-scheduler`, `catalog2-continuity`, workers com guarda (`*Guarded`).
3. **Alterado:** só testes (L7).
4. **Verificação:** `catalog2-implementation-billing` 13/13, `catalog2-delivery-cycles` 9/9, `catalog2-subscriptions` 8/8, `catalog2-period-renewal` 4/4, `catalog2-cycles` 4/4, `catalog2-continuity` 5/5. → AUT.
5. **Não testado:** renovação real ao longo de meses (só simulada com relógio de teste); disparos externos desligados.
6. **Codex repete:** testes 25–27 da seção 10.
7. **Dados:** nenhum.

### P10 — Administrativo e auditoria
1. **Deveria:** admin acompanha pedido/projeto/tarefas/pagamentos/comissões; permissões no servidor; retorno ao link após login.
2. **Já existia/preservado:** retorno pós-login (28/10), listagens Projetos/Tarefas (27/10), decisões em `project_decision_logs`, lançamentos de carteira com referência ao pagamento.
3. **Alterado:** nada.
4. **Verificação:** `financial-billing-security` e `launch-sessions` (seção 6). → AUT.
5. **Não testado:** tela admin de um pedido completo nesta rodada.
6. **Codex repete:** teste 28 da seção 10.
7. **Dados:** nenhum.

## 6. Testes executados e resultados reais

Comando de banco: `TEST_DATABASE_ADMIN_URL=TEST_DATABASE_URL=mysql://root:allka_root_dev@127.0.0.1:3306/allka_test npx tsx scripts/run-db-tests.ts <arquivo>` em `apps/backend` (um banco `allka_test_*` próprio por suíte, apagado no fim; nunca o `allka`).

**Backend — 32 suítes, 316 testes, 0 falhas (estado final).**

| Etapa do fluxo | Suíte | Resultado |
|---|---|---|
| Compra/checkout/comissão/link | catalog2-checkout | 28/28 |
| Ponta a ponta (10 cenários) | catalog2-e2e-scenarios | 10/10 |
| Múltiplas contratações | catalog2-multiple-contracts | 10/10 |
| Quantidade e lotes | catalog2-quantity-rules | 13/13 |
| Primeira execução | catalog2-first-execution | 15/15 |
| Implantação × renovação × desconto | catalog2-implementation-billing | 13/13 (antes 5/13 — L7) |
| Execução por etapa | catalog2-stage-execution | 11/11 |
| Fluxo das etapas | catalog2-step-flow | 7/7 |
| Lançamento/liberação | task-release-orchestration | 34/34 |
| Rodízio/ofertas | task-rotation | 19/19 |
| Oferta emergencial | catalog2-emergency-offer | 5/5 |
| Revisão | task-review | 6/6 |
| Entregáveis | task-deliverables | 6/6 |
| Aprovador da etapa | catalog2-step-approver | 3/3 |
| Portões de aprovação e SLA | catalog2-approval-gates-sla | 13/13 |
| Qualificação (tela única) | qualificacoes | 4/4 (2 novos) |
| Grupo de qualificadores | qualifier-pool | 4/4 |
| Qualificação da tarefa | project-task-qualification | 6/6 |
| Assinaturas | catalog2-subscriptions | 8/8 |
| Renovação de período | catalog2-period-renewal | 4/4 |
| Ciclos | catalog2-cycles | 4/4 |
| Ciclos mensais (worker 2×, matriz alterada) | catalog2-delivery-cycles | 9/9 (antes 1/9 — L7) |
| Continuidade do executor | catalog2-continuity | 5/5 |
| Cliente/consultor do projeto | project-registered-contacts | 11/11 |
| Visibilidade | task-visibility | 4/4 |
| Responsável nominal indisponível | specific-assignee-impact | 11/11 |
| Pagamento por etapa | catalog2-stage-payout | 3/3 |
| Sessões de lançamento | launch-sessions | 12/12 |
| Segurança financeira | financial-billing-security | 21/21 |
| Gateways (sandbox) | payment-gateways | 5/5 |
| Pacotes/dependências | catalog2-packages | 9/9 |
| Seleção de nômade sem duplicar | selecionar-nomade-dedupe | 3/3 |

Regressão depois da correção do motor (`stage-engine.ts`), rodadas de novo: stage-execution 11, step-flow 7, step-approver 3, task-review 6, e2e 10, approval-gates-sla 13, release-orchestration 34, checkout 28 → **112/112**. Typecheck backend limpo.

**Frontend.** Typecheck limpo (antes e depois). Editor de produto inteiro `app/admin/produtos/novo-catalogo` + oferta ao nômade: **71 arquivos, 483/483**. Portais (catálogo, checkout, nômade, líder, agência, company, qualificações, tarefas, projetos): 73 passaram / 17 falharam antes; 1 corrigido (oferta ao nômade, 7/7); **16 continuam falhando** em `components/catalog2/catalog2-store.test.tsx` (9) e `components/catalog2-product-detail.test.tsx` (7) — textos de tela antigos (L4), já listados como falhas antigas.

**Tela real (VIS):** "Sem assinatura" no SEO; desconto 5% conferido no admin (após F5) e na API do cliente; aviso de períodos dispara nova leitura sem gravar.

**Não executado:** nenhum teste de navegador com Líder/Nômade reais (não existem); nenhum pagamento pelo link nesta rodada; IA real.

## 7. Dados locais alterados

| Quando (Brasília) | O quê | Estado final |
|---|---|---|
| 31/10 16:32 → 16:34 | Produto 2, período **Mensal**: desconto 2% → **5%** (teste autorizado), pela tela, na V2 rascunho já existente (Editar → Conferência, preço e publicação → Modalidades por período → Salvar) | **Restaurado para 2%** às 16:34 (`updated_at` 19:34:54 UTC). Bimestral 4%, trimestral 6%, semestral 8%, anual 10% intocados. Nenhuma cotação, compra ou publicação. V1 e V2 continuam publicada/rascunho. |
| 31/10 ~17:05 → 17:10 | SEO 003, **V2 rascunho**: teste manual T01 (seção 10) acrescentou "Teste T01." à descrição curta e depois apagou (Salvar rascunho) | **Texto original exato** (200 caracteres; MD5 da descrição = MD5 da V1, `252e6391…`). Só o `updated_at` da V2 mudou (2026-10-31 20:10:46 UTC). V1 publicada intocada (impressão digital `ad05b3a1…`). |

Nenhum outro dado do banco real `allka` foi alterado (conferido de novo em 01/11, só leitura: a última gravação no banco é a de 20:10:46 UTC de 31/10). Testes de banco usaram bancos descartáveis `allka_test_*` (criados e apagados pelo runner).

## 8. Limitações, decisões pendentes e riscos

- **Decisão (L2):** criar "nômade específico" como destino da etapa? Exige campo novo no editor (mudança de layout/regra). Hoje o mais próximo é "mesmo executor da etapa X" e a preferência pelo nômade anterior.
- **Decisão (L6, parte não alterada):** o Líder que executa uma etapa de Líder e também a qualifica continua podendo (sem regra registrada). Se o usuário quiser separação também aí, falta definir quem qualifica.
- **Pré-requisito (L5):** sem Líder ativo e sem Nômade habilitado, os testes manuais T16–T24 não rodam. O usuário cadastra conscientemente; o assistente não promove admins.
- **Testes de tela desatualizados (L4):** 16 no catálogo/detalhe. Não escondem defeito conhecido, mas reduzem a proteção automática do catálogo — atualizar antes do próximo deploy.
- **Risco do desconto:** é compartilhado entre versões; qualquer teste de desconto mexe no preço da V1 publicada enquanto durar.
- **Teste simulado ≠ tela:** a maior parte desta rodada é AUT. VIS foi feito só no editor. USU: nada.
- **Pagamento real:** só sandbox; o link do cliente recusa simulação em produção.

## 9. Última ação e ponto exato de retomada

- 31/10 noite — **concluído**: mapa de lacunas, 2 correções de código (L1, L6), 3 arquivos de teste atualizados (L3, L7), 32 suítes de banco verdes, editor 483/483, documentação (este relatório, RETOMAR-AQUI §2/§3/§4, deploy-log).
- **Próximo passo exato:** teste manual **T01** da seção 10 (um por vez). Decisões L2 e L5 antes de T16.
- Arquivos alterados nesta rodada: `apps/backend/src/lib/stage-engine.ts`, `apps/backend/src/routes/qualificacoes.ts`, `apps/backend/src/routes/qualificacoes.integration.test.ts`, `apps/backend/src/routes/catalog2-delivery-cycles.integration.test.ts`, `apps/backend/src/routes/catalog2-implementation-billing.integration.test.ts`, `apps/frontend/app/admin/produtos/novo-catalogo/product-periods-inline.tsx`, `.../product-periods-inline.test.tsx`, `.../product-editor.tsx`, `.../header-price-tag.tsx`, `apps/frontend/components/task-offer-prompt.test.tsx`, `docs/fluxo-ponta-a-ponta-agencia-nomade-2026-10-31.md`, `docs/RETOMAR-AQUI.md`, `docs/deploy-log.md`.

## 10. Roteiro de testes manuais (ordem real de uso) — 28 testes; situação atual na seção 11

**01/11 — Codex:** T02 concluído e Mensal restaurado a 2%. T04 aguarda sessão no perfil correto. Pela interface Admin > Usuários foi conferida a conta existente 04 Reynário Nunes (NOMAD ADMIN), ativa, sem vínculo; o perfil foi apenas aberto em leitura. Isso não equivale a estar autenticado como Nômade, nem a um cadastro operacional habilitado para receber etapas. Não criado usuário/Líder/Nômade, não alteradas permissões e não presumida senha. Para T04, o usuário entra nessa conta e o assistente testa o acesso ao catálogo. Para T16+ continua faltando habilitação operacional/Líder.

### Execução (31/10, ~17:10 Brasília) — o usuário pediu: "quero que você teste ponto a ponto"

| Teste | Resultado | Evidência |
|---|---|---|
| **T01** | 🟢 **Passou** (VIS + banco) | V2 do SEO → Editar → "Teste T01." na descrição curta (211 caracteres) → Salvar e continuar → passo 2 sem erro (só o aviso informativo de "Alterações por IA grátis"). Banco: V2 com o texto; V1 com a mesma impressão digital `ad05b3a1…`. F5 → continuou V2/passo 2; Produto mostrou o texto. Apagado, Salvar rascunho, F5 → 200 caracteres; MD5 da descrição da V2 = MD5 da V1 (`252e6391…`), ou seja, texto original exato. V1 intocada. |
| **T02** | 🟢 **Passou pela tela (Codex, 01/11)** | Nova autorização do usuário. Produto 2 V2 existente → Editar → Conferência → Modalidades por período → Mensal 2→5 → Salvar. A faixa do editor mudou para R$292,85 −5% = R$278,21 SEM F5. Prévia da V2: Mensal −5%, primeira cobrança/renovação R$278,21. Cabeçalho R$292,85 é VENDA AVULSA, não mensalidade (não deve acompanhar desconto mensal). Restaurado Mensal=2 pela faixa inline; mensagem de sucesso, F5 manteve 2% e R$286,99. Outros períodos 4/6/8/10 preservados. Edição travada; sem nova versão, publicação, compra ou código. Evidências T02-cliente-5pct.png / T02-restaurado-2pct.png na pasta de visualizações da sessão Codex. |
| **T03** | 🟢 **Passou** (banco real, só leitura) | `proj_955`/T015717: etapas contratadas geradas em 28/10 11:09 ("Análise de Briefing e Acessos" 1ª, "Alteração…" 2ª) e nunca mais alteradas; na V2 do Produto 2 as mesmas etapas foram editadas depois (15:50 e 20:24) e a ordem mudou. A matriz alterada não mexeu no contratado. Observação para conferir: as etapas contratadas estão com `horas_execucao` vazio (não investigado nesta rodada). |
| T04–T28 | ⏸ Parados | Exigem entrar como Agência, Company, Nômade ou Líder. O assistente não tem nem pede senha; Líder e Nômade operacionais não existem (L5). |

Regras: um teste por vez; só avançar depois do "funcionou" do usuário; nenhuma senha escrita aqui (cada pessoa entra com a própria). "Altera dados" = grava no banco local real. Testes marcados **AUTORIZAÇÃO** só rodam com ordem explícita do usuário naquele momento. Endereço base: `http://localhost:8082`.

Contas (sem senha): **Admin** = admin master do usuário · **Agência 1** = administrador da Lamego Academy (agency_admin) · **Consultor** = "Teste" (agency_consultant da Agência 1) · **Company** = conta da empresa 002 · **Líder** e **Nômade** = NÃO existem ativos hoje (L5): os testes 16–24 dependem de o usuário cadastrar conscientemente um Líder e um Nômade habilitados.

### Produto
**T01 — Salvar e continuar no Produto teste.** Admin · `/admin/cadastro-produtos/3?editor=teste` · Pré: V2 rascunho existente. Passos: seletor de versão → v2 → Editar → acrescentar uma palavra na descrição curta → "Salvar e continuar: Configurações da tarefa e etapas" → F5 → voltar a Produto. Esperado: avança sem erro; texto continua após F5; V1 continua publicada. Prova: contador de caracteres e o texto após F5. Recuperar: apagar a palavra e "Salvar rascunho". Altera dados (V2 rascunho).

**T02 — Desconto atualiza o editor inteiro sem F5 (correção L1).** Admin · `/admin/cadastro-produtos/2?editor=teste` · **AUTORIZAÇÃO** (o desconto é compartilhado com a V1 publicada). Passos: v2 → Editar → Conferência, preço e publicação → Modalidades por período → Ver → Mensal 2 → 5 → Salvar → fechar o painel. Esperado: a faixa de períodos e a etiqueta de preço mostram "R$ 292,85/mês − 5% = R$ 278,21/mês" SEM F5. Em seguida voltar a 2 e Salvar. Prova: texto da faixa; F5 mostra o mesmo. Recuperar: Mensal = 2 (bimestral 4, trimestral 6, semestral 8, anual 10 não mudam). Altera dados.

**T03 — Matriz alterada não muda o contratado.** Admin · `/admin/projetos` → `proj_955` · Pré: nenhuma. Passos: abrir o pedido e anotar etapas/valores da T015717; abrir o Produto 2 V2 (sem salvar nada). Esperado: a tarefa contratada mostra o snapshot de 28/10; V2 em rascunho não interfere. Prova: comparar os textos. Não altera dados.

### Catálogo
**T04 — Nômade e Líder não compram.** Conta Nômade (ou Líder, quando existir) · `/nomades/dashboard` e tentar `/agency/catalogo-produtos` · Esperado: Nômade não vê catálogo de compra; Líder vê sem botão de contratar. Não altera dados.

**T05 — Catálogo só com publicada/disponível.** Agência 1 · `/agency/catalogo-produtos` · Esperado: SEO 003 e Produto 2 aparecem com os valores da V1 publicada (V2 rascunho nunca aparece). Não altera dados.

**T06 — Configuração igual em detalhe e cesta.** Agência 1 · `/agency/catalogo-produtos` → SEO · Passos: escolher "até 10 páginas" + adicional concorrentes; anotar preço/prazo; Adicionar à cesta; abrir a cesta. Esperado: mesmos valores e opções na cesta. Recuperar: remover da cesta. Altera dados (cesta).

**T07 — Mensal com desconto no catálogo.** Agência 1 · Produto 2 · selecionar Mensal. Esperado: "Mensalidade sem desconto R$ 292,85", primeira cobrança e renovação R$ 286,99 (2%). Não altera dados.

### Cliente, consultor e projeto
**T08 — Criar projeto dentro da compra e voltar a ela.** Agência 1 · `/agency/catalogo-produtos/checkout` · Pré: item na cesta (T06). Passos: gerar cotação → Criar projeto → nome novo → Consultor: buscar "Teste" → Cliente: buscar o cliente vinculado → Salvar projeto. Esperado: a moldura fecha, a compra continua com o projeto selecionado, cotação e comissão preservadas. Prova: nome do projeto selecionado; `/agency/projetos` lista o projeto como rascunho. Recuperar: arquivar o projeto pelo menu (não excluir). Altera dados.

**T09 — Cadastrar consultor/cliente no meio do projeto.** Agência 1 · mesma moldura · Passos: "Cadastrar consultor" (o usuário digita os dados e a senha dele mesmo) → salvar → volta selecionado com e-mail automático; idem "Cadastrar cliente". Esperado: retorno ao projeto sem perder o que já foi digitado. Altera dados (usuário/cliente reais) — **AUTORIZAÇÃO**.

**T10 — Busca não mostra outra empresa.** Agência 1 · busca de consultor/cliente · Esperado: só cadastros da própria agência. (A recusa por requisição manipulada está provada em `project-registered-contacts` 11/11.) Não altera dados.

### Compra, pagamento de teste e comissão
**T11 — Comissão sobre o total.** Agência 1 · checkout · Passos: "Cliente final paga por link" → Sobre o total → informar o percentual que o usuário decidir. Esperado: total = base + comissão; linhas e resumo coerentes. Não altera dados até confirmar.

**T12 — Comissão por produto.** Mesmo lugar · Por produto → um percentual por linha; linha com quantidade 2 usa a taxa da linha sobre o total da linha. Alternar modos preserva as taxas. Não altera dados até confirmar.

**T13 — Link do cliente e pagamento sandbox.** **AUTORIZAÇÃO** (cria pedido e pagamento de teste). Agência 1 confirma → copia o link → abrir em janela anônima `/pagar/contratacao/<token>`. Esperado: o cliente vê só itens, modalidade e total final (sem comissão, custo ou acessos). Cartão de teste final 0002 → recusa com motivo; final 4242 → pago. Prova: `/admin/projetos` → pedido em andamento; carteira da agência com crédito da comissão uma vez. Recuperar: não há estorno automático — registrar e avisar. Altera dados.

**T14 — Repetir o pagamento não duplica.** Logo após T13, abrir o mesmo link de novo e tentar pagar. Esperado: "já pago"/sem segundo pagamento, sem segunda comissão, sem tarefas duplicadas. Prova: Admin → pedido com 1 pagamento e 1 fatura. Não altera dados.

### Tarefas para lançamento
**T15 — Tarefas geradas e paradas para lançamento.** Admin ou Agência 1 · `/agency/projetos` → pedido de T13 → Tarefas. Esperado: tarefas novas (código próprio, não a matriz) em "Para lançamento", na quantidade/lotes escolhidos; nada distribuído. Não altera dados.

### Lançamento e distribuição (dependem de Líder/Nômade cadastrados — L5)
**T16 — Lançar com conferência.** **AUTORIZAÇÃO** (lança tarefa real). Agência 1 · pedido → Lançar tarefas · Esperado: tela confere briefing, acessos e dependências antes; sem briefing obrigatório, explica o que falta e leva ao campo. Altera dados.

**T17 — Destino por etapa.** Admin · `/admin/tarefas` → tarefa lançada · Esperado: etapa de Líder vai ao Líder da área (nunca a um admin); etapa de nômade vira oferta no rodízio; equipe interna já nasce em andamento. Não altera dados.

**T18 — Oferta normal expira e segue o rodízio; obrigatória aceita no silêncio.** Nômade · `/nomades/tarefasdisponiveis` · Esperado: oferta normal sem resposta passa ao próximo; só a obrigatória vira aceite automático após 1 h. Altera dados (oferta) — **AUTORIZAÇÃO**.

### Nômade, líder, entrega e qualificação
**T19 — O nômade vê o que precisa, sem senha.** Nômade · `/nomades/minhastarefas` → tarefa · Esperado: instruções, checklist, briefing, acessos autorizados (sem senha), entregáveis da instância; nada de outra empresa. Não altera dados.

**T20 — Entrega com evidência obrigatória.** Nômade · etapa com evidência · Passos: tentar entregar sem anexo. Esperado: bloqueio com a mensagem "Esta etapa exige evidência…"; com anexo, entrega. Altera dados.

**T21 — Executor não qualifica a própria entrega (correção L6).** Pré: etapa com "Pessoa específica" = o próprio nômade executor. Nômade entrega → `/nomades/qualificacoes`. Esperado: a etapa NÃO aparece para ele; aparece para o Líder em `/leader/qualificacoes` com o motivo no histórico. Altera dados.

**T22 — Qualificação reprova e volta para ajuste.** Líder · `/leader/qualificacoes` · Reprovar exige explicação; a etapa volta ao mesmo executor com histórico. Altera dados.

### Aprovação e encerramento
**T23 — Aprovação do cliente por entregáveis.** Agência 1/Company · pedido → etapa · Esperado: só segue quando todos os entregáveis marcados forem aprovados; reprovar mantém histórico. Altera dados.

**T24 — Mesmo estado em todos os portais.** Admin, Agência, Líder, Nômade abrindo a mesma tarefa. Esperado: status coerentes, sem contradição. Não altera dados.

### Ciclos, renovação e automações
**T25 — Assinatura: primeira cobrança × renovação.** Admin · pedido mensal de teste · Esperado: primeira cobrança = implantação + mensalidade; renovação só mensalidade (desconto uma vez). Não altera dados (leitura).

**T26 — Worker repetido não duplica.** Só automático (relógio de teste): `catalog2-delivery-cycles` cenário 4 e `catalog2-subscriptions`. Não executar manualmente no banco real.

**T27 — Continuidade do executor na renovação.** Depende de ciclo real; hoje só automático (`catalog2-continuity` 5/5).

### Administrativo
**T28 — Admin acompanha tudo e o link volta após login.** Admin · em janela anônima abrir `/admin/projetos` → login → volta ao mesmo endereço; abrir o pedido: projeto, tarefas, etapas, pagamento de teste, comissão e histórico com quem fez o quê. Não altera dados.

## 11. Execução Codex — 01/11/2026, continuação autônoma autorizada

## 02/11 — Reteste Codex da PARTE F: aprovado na interface Admin e Agência (somente local)

- Perfis realmente usados: Admin Vinicius Guardia e Agência Lamego Academy; projeto 956 já existente. Nenhuma compra, pagamento, publicação ou lançamento efetuado.
- Escape real, Admin e Agência, em 390×844 e 768×1024: Mais sobre Faturamento fecha só o menu; URL do projeto e aba selecionada permanecem. No Admin, segundo Escape sem menu voltou à lista como previsto.
- Em ambos os perfis, Mais sobre painel Produtos → Ver tarefas (SEO), e sobre detalhe da tarefa SEO: um Escape preservou o painel/detalhe de trás. Na Agência, Escape com foco na busca do menu também preservou o painel.
- Substatus T015718 “Em lançamento” confirmado nos quatro locais de cada perfil: aba Tarefas Lista/Kanban e painel do produto Lista/Kanban. T015719 continua sem esse substatus, disponível para lançamento. Nenhum botão Lançar/Continuar lançamento foi acionado; não se alterou nem descartou o rascunho.
- Não foi criada tarefa em AGUARDANDO_INFORMACOES para provar esse segundo selo. Os 30/30 testes e typecheck são resultado informado pelo Claude; não foram reexecutados neste reteste visual. X/fundo/arrasto já tinham passado na rodada D/E, não repetidos integralmente agora. Toque físico real não testado.
- Provas locais fora do Git: 02-11-F-admin-escape-preserva.png e 02-11-F-agencia-substatus-seo.png na pasta de evidências do Codex. Viewport temporário restaurado. Sessão final: Agência, projeto 956, painel de tarefas SEO.
- Farol desta rodada: Escape 🟢; selo SEO nos quatro locais 🟢; reteste Admin/Agência 🟢. Farol macro mantido 14/28 concluídos, 14 abertos — não converter correção visual em homologação de segurança ou execução.
- Próxima prioridade: rodada própria das demais rotas ligadas a projeto acessíveis ao Nômade, preservando acesso legítimo à tarefa/etapa atribuída e provando isolamento em testes. Continuam pendentes retorno ao destino pós-login, auditoria das 33 telas, toque físico e selo fixo ALLKOIN 0.00 no painel da empresa. Nada de commit/push/deploy/QA/espelho nesta rodada.

### Correções do Claude — Escape do menu e selo do T015718 (02/11, noite; MAIS RECENTE)

**SOMENTE LOCAL; sem commit/deploy; nenhum dado gravado; nenhuma regra/permissão mudou; desktop igual.** Responde ao reteste D/E logo abaixo. (1) **Escape com o menu "Mais" aberto sobre o projeto** fechava o menu E o projeto. Causa: o menu e a Tela Slide do projeto ouviam o Escape no mesmo lugar (window); a tela do projeto se registrou primeiro, então recebia a tecla antes e fechava. Correção: o menu agora ouve o Escape na fase de captura e consome a tecla (`preventDefault` + `stopPropagation`) — fecha só o menu; o projeto e a aba (Faturamento) ficam; o próximo Escape, já sem menu, fecha o projeto como antes. X, fundo, arrasto, busca e navegação do menu não mudaram. Arquivo: `apps/frontend/components/app-menu-drawer.tsx`. (2) **SEO T015718 "Em lançamento" × "Para lançamento"**: não é erro de estado — o grupo "Para lançamento" da lista, do quadro e do contador junta três estados do servidor: não lançada (PARA_LANCAMENTO), lançamento começado com rascunho salvo (EM_LANCAMENTO) e parado aguardando informações (AGUARDANDO_INFORMACOES); o detalhe mostra o estado exato. O T015718 está em EM_LANCAMENTO desde antes desta rodada (por isso "Continuar lançamento"). Agora, dentro do grupo, aparece um selo com o estado exato ("Em lançamento" ou "Aguard. informações", com explicação no "i") nas duas Listas e nos dois Kanbans do projeto, e o título das colunas "Para lançamento" explica o agrupamento. Só rótulo: estado e rascunho intactos, nada foi lançado. Arquivos: `apps/frontend/components/task-launch-substatus.tsx` (novo), `components/product-task-kanban-card.tsx`, `components/project-management-modal.tsx`.

Testes: `app-menu-drawer.test.tsx` 19/19 (3 novos: menu aberto sobre Tela Slide do projeto e sobre Painel Slide — um Escape fecha só o menu, o projeto/aba ficam, o 2º Escape fecha o projeto; Escape digitado na busca idem; os 2 primeiros FALHAM sem a correção); `product-task-kanban-card.test.tsx` 6/6 (2 novos do selo); `embedded-slide-screen.test.tsx` 5/5; typecheck das telas limpo. Navegador (admin, proj_956, 375 px): Faturamento → Mais → UM Escape (tecla real) → menu fechou, URL /admin/projetos/956 e aba Faturamento mantidas; 2º Escape → voltou à lista. Aba Tarefas: linha do T015718 mostra "Para lançamento" + selo "Em lançamento". Agência não vista pelo Claude.

**Reteste pedido ao Codex (Agência 1 e Admin, 390 e 768):** (a) proj_956 → Faturamento → Mais → esperar a folha parar → UM Escape: fecha só o menu, projeto e aba ficam; 2º Escape fecha o projeto. Repetir com o menu aberto sobre Produtos → Ver tarefas (painel do produto) e sobre o detalhe de uma tarefa; conferir X, fundo, arrasto, busca e navegação do menu. (b) Aba Tarefas e Produtos → Ver tarefas, Lista e Kanban: T015718 em "Para lançamento" com selo "Em lançamento"; o "i" explica; T015719 sem selo (se ainda PARA_LANCAMENTO). NÃO clicar em lançar/continuar. **Continua pendente:** outras rotas do Nômade (rodada própria), retorno pós-login, 33 telas, toque real, selo "ALLKOIN 0.00" do painel de empresa.

### Reteste Codex — partes D/E de 02/11 (MAIS RECENTE)

**UI local, mesmo proj_956, Agência 1 e Admin (usuário autenticou Admin manualmente).** Nenhuma compra, pagamento, ajuste, exclusão, atribuição ou confirmação de lançamento; nenhum código de aplicação alterado, commit/deploy/QA. Somente documentação atualizada. Monitor de rede iniciado antes do reteste Agência: antes da troca manual paraAdmin, as únicas requisições nãoGET/OPTIONS observadas foram POST/presence/heartbeat; não foi enviada operação comercial de lançamento neste reteste.

**Parte E — resultados conferidos:**
1. Agência390 e Admindesktop: em Produtos>Ver tarefas>Kanban, AMBOS produtos têm olho acessível comT015718/T015719; clicar no texto/meio do cartão não abre detalhe nem formulário; olho abre detalhe correto; Escape fecha só detalhe e outro Escape fecha só painel do produto. Botões Lançar/Continuar separados e NÃO acionados. Lista do painel restaurada. A correção de clique indevido passou.
2. Menu Agência390/768: LA/Lamego Academy/Agência·Partner, iguais ao topo. Admin390: identidadeVG/Vinicius/Administrador corrigida. Não aparece mais fallbackAT na Agência.
3. Admin360, Cadastro de Produtos depois do carregamento: cartão por produto com8células legendadas(ID,Imagem,Produto,Categoria,Tarefas,Preço,Pendências,Status)+ações. Linhas~421px; largura360. Menu⋯ do primeiro cartão abriu, foi fechado sem escolher ação.1480mantém tabela. Passou no recorte testado, não representa auditoria funcional de33telas.
4. Admin e Agência: Formas de Pagamento tem só Cartão, CARTEIRA(ALLKOINS), Boleto ePIX. Carteira1.174,46 permanece selecionada; ALLKOIN Novo removido. Não trocou forma, saldo nem cobrança.
5. MenuAgência390: arrasto curto mantém aberto; arrasto longo por mouse fecha, sem seleção de texto; clique na faixa superior fecha; busca conexoes sem acento encontra Conexões. X passou. Toque real continua não testado (ferramenta não suporta).

**FALHA REPRODUZIDA — Escape do menu fecha a origem:** Agência768: abrir proj_956>Faturamento, abrirMais, esperar folha estabilizar, apertar UM Escape. Fecha menu E projeto; URL muda de /agency/projetos/956 para /agency/projetos e abas somem. Repetido duas vezes. Admin390 reproduziu de /admin/projetos/956 para /admin/projetos. Corrigir prioridade de camadas/evento consumido: Escape do Menu fecha apenasMenu, preservando projeto/aba; Escape posterior pode fecharProjeto. Não basta testar Escape comMenu sobreDashboard sempainel. Não houve dado editado/perdido neste reteste.

**Estado SEO — clareza pendente, NÃO reverter automaticamente:** já na PRIMEIRA abertura do cartão nesta rodada havia Continuar lançamento. Detalhe T015718 mostrou Em lançamento e briefing em andamento; T015719 mostrou Para lançamento. Quadros agrupam ambos em Para lançamento. Leitura de project-management-modal.tsx confirmou statusMapEM_LANCAMENTO→Para lançamento; cartãoContinuar usa rawStatusEM_LANCAMENTO/AGUARDANDO_INFORMACOES. Portanto diferença de agrupamento/rótulo, não prova de execução/distribuição. Não afirmar “as duas rawPARA_LANCAMENTO”. Não foi acionado lançar nesta rodada, não alterar status nem apagar rascunho para ocultar. Pedir ao Claude esclarecer rótulo/substatus e origem/efeito da abertura anterior do formulário; não atribuir causa sem evidência. Datas de lançamento/execução continuam—no detalhe.

**Parte D — não regressão de consultas permitidas:** todas9abas do proj_956 abertas comoAgência eAdmin (Dashboard,Dados,Produtos,Tarefas,Arquivos,Documentos,Cofre,Faturamento,Log). /api/projects lista/detalhe e abas que requisitaram backend retornaram200, preflight204; sem403/404 no recorte. Isso NÃO é teste negativo deNômade/Líder. Não entrou/criou/promoveu esses perfis nem tentouDELETE/PUT. Testes9/9/27/27 continuam resultados relatados peloClaude, não reexecutados peloCodex.

| Item do retorno do usuário | Estado após Codex | Limite |
|---|---|---|
|1 Nômade não vê projeto nas rotas /api/projects|🟡|Somente testes relatados, visual negativo não executado|
|2 Líder não apaga projeto|🟡|Somente testes relatados; semDELETEreal|
|3 KanbanVer tarefas, olho/lançar separados|🟢|Ambos produtos e perfis conferidos; semlançar|
|4 IdentidadeMenu|🟢|Admin eAgência conferidos|
|5 CadastroProdutoscartão|🟢|Admin360/depoiscarregar e1480|
|6 ALLKOIN Novo removido|🟢|Admin/Agência, carteira correta preservada|
|7 Menu faixa/arrasto/Escape|🔴|Faixa/arrastoMouse passaram; Escape fecha origem; toque real pendente|
|8 Testes automáticos|🟡|Não reexecutados peloCodex; não declararfalhasantigasirrelevantes|
|9 Continuidade|🟢|Atualizada com resultados e limites|
|10 Reteste/aprovação|🟡|Reteste executado no recorte; usuário ainda não aprovou|
|11 Outras rotas de projeto doNômade|🔴|Pendente reportado peloClaude; segurança geral NÃO concluída|
|12 Retorno apóslogin|⏸|Não testado especificamente;Admin entrou manualmente|
|13 SeloALLKOIN0.00empresa|⏸|Fora desta alteração; não mexido|

**Macro permanece14/28concluídos,14abertos**; T28parcial. Decisões anteriores (comissão recorrente/pagador/faturasagência/centavo/líderinexistente/L5-L2/tablet/slides) preservadas. Nenhum selo verde acima equivale à homologação de segurança global.

**Evidências privadas:** pasta habitual, 02-11-E-menu-agencia-corrigido.png, 02-11-E-menu-admin-corrigido.png, 02-11-E-produto-cartao-corrigido.png, 02-11-E-carteira-allkoins-sem-duplicata.png, 02-11-E-menu-sobre-projeto.png e02-11-E-escape-fechou-projeto.png. Não guardar capturas privadas/tokens/senhas noGit.

**Próximo:** Claude corrigirEscapeMenu e esclareceragrupamentoSEO; fechar pendência de outrasrotasNômade em rodada de segurança comescopopor recurso, sem bloquear acesso legítimo à tarefa/etapa liberada. Codex retesta apósretorno. Origem finalAdmin/projetos/956,Faturamento>Formas de Pagamento; viewport restaurado e monitorrede desativado.

### Correções do Claude — 5 achados do reteste A/B/C (02/11; MAIS RECENTE)

Pedido do usuário (02/11): corrigir nesta sessão os 5 achados do reteste do Codex logo abaixo. **SOMENTE LOCAL**: sem commit/push/deploy/QA; sem compra, pagamento, lançamento, ajuste ou exclusão; nenhum dado gravado; nenhuma permissão nem regra comercial mudou; desktop igual.

| # | Achado do Codex | O que foi feito | Arquivos |
|---|---|---|---|
| 1 | Produtos → Ver tarefas → Kanban sem olho; o clique no cartão abria o LANÇAMENTO | O cartão não é mais clicável. O olho ("Ver detalhes da tarefa T…") abre o mesmo detalhe da Lista; lançar só pelo botão escrito "Lançar tarefa" ("Continuar lançamento" se já começou), que aparece só em "Para lançamento" | `apps/frontend/components/product-task-kanban-card.tsx` (novo), `apps/frontend/components/project-management-modal.tsx` |
| 2 | Menu Mais mostrava "AT/Administrador" para todos | Causa: a reserva do contexto da barra lateral era um admin fixo ("Admin Test", "AT", "Administrador") e o cabeçalho só trocava o nome. Agora a reserva é vazia, o cabeçalho repassa ao menu a MESMA sigla e o MESMO papel do cartão do topo, e o menu mostra o nome para todos os perfis (agência: a pessoa, a sigla da agência e "Agência · Partner") | `apps/frontend/contexts/sidebar-context.tsx`, `apps/frontend/components/header.tsx`, `apps/frontend/components/app-menu-drawer.tsx` |
| 3 | Cadastro de Produtos em 360 px: campos em blocos soltos | Causa: o padrão `tabela-cartao` joga para o rodapé, com divisória, toda célula SEM legenda (pensado para as ações) — e nenhuma célula do produto tinha legenda; a linha tinha altura fixa. Agora cada célula de dado tem legenda (ID, Imagem, Produto, Categoria, Tarefas, Preço, Pendências, Status), só as ações ficam no rodapé do cartão, a altura fixa vale só no desktop e o nome quebra linha no celular em vez de cortar | `apps/frontend/app/admin/produtos/page.tsx` (tela `/admin/cadastro-produtos`) |
| 4 | Formas de Pagamento: "ALLKOIN Novo" com AK$ 0,00 x Carteira AK$ 1.174,46 | Investigado (explicação abaixo) e, por decisão do usuário, a opção duplicada foi **retirada**; a Carteira passou a se chamar "CARTEIRA (ALLKOINS)". Nenhum saldo, cobrança ou regra mudou | `apps/frontend/components/project-management-modal.tsx` |
| 5 | Menu: arrastar com o mouse selecionava texto; a faixa de cima não fechava | O arrasto da alça usa Pointer Events (mouse e dedo pelo mesmo código; começar no X ou com o botão direito não arrasta) e a alça não seleciona texto. A faixa de cima não fechava porque o cabeçalho do topo (camada z-90) ficava ACIMA do fundo do menu (z-50); fundo e folha agora em z-95. X, Escape, busca e navegação iguais | `apps/frontend/components/app-menu-drawer.tsx` |

**Item 4 — fonte e significado:** "Carteira" lê o saldo real (`apps/frontend/lib/project-wallet.ts`: agência/empresa pela mesma fonte do topo, `/api/wallet-topup/summary`; admin pela carteira do dono do projeto). "ALLKOIN Novo" mostra um `useState(0)` fixo no código (`allkoinBalance`, e a cotação "1 AK$ = R$ 1,00" também fixa), que nunca é carregado de lugar nenhum — sobra de antes da decisão de 26/10 que fez do Allkoin a moeda da plataforma: desde então a própria Carteira é mostrada em Allkoins (AK$). No servidor não existe saldo Allkoin separado: pagar "com Allkoins" (`ALLKOINS` em `apps/backend/src/lib/confirm-payment.ts`) debita a MESMA carteira da empresa/agência. A forma escolhida nessa tela também não é salva (só muda a seleção na tela). Nada foi creditado nem alterado. **Decisão do usuário (02/11, respondendo "continuar" à pergunta "Tiro a opção duplicada?", cujo 1º botão era "Sim, tirar"):** a opção "ALLKOIN Novo" saiu da tela (com o `useState(0)` e a cotação fixa) e a Carteira virou "CARTEIRA (ALLKOINS)", o mesmo nome usado no histórico de pagamentos ("Carteira (Allkoins)"). Conferido no navegador (admin, proj_956 → Faturamento → Formas de Pagamento): Cartão de crédito, Carteira (Allkoins) "Saldo: AK$ 1.174,46 (R$ 1.174,46)" marcada como antes, Boleto e PIX; nenhum "ALLKOIN Novo"; a seleção não foi trocada. Depois da retirada: typecheck das telas limpo; `lib/project-wallet` 3/3 (a tela inteira do projeto não monta no ambiente de teste — a prova da retirada é a conferência no navegador). **Visto no código, fora deste pedido (não mexido):** o painel de detalhes de empresa (`apps/frontend/components/company-view-slide-panel.tsx`) mostra um selo "ALLKOIN" com "0.00" também fixo no código.

**Medido pelo Claude (navegador interno, sessão admin já aberta; só abrir/olhar; nenhum lançamento):**
- Item 1: proj_956 → Produtos → Ver tarefas → Kanban: cartão T015719 com olho e botão "Lançar tarefa"; clicar no meio do cartão não abriu nada; o olho abriu o detalhe da tarefa (Dados Gerais, Etapas…), não o formulário de lançamento. "Lançar tarefa" NÃO foi clicado.
- Item 2: menu Mais em 390 px mostra "VG · Vinicius Guardia · Administrador" (antes "AT").
- Item 5: em 390 px, clicar na faixa de cima (sobre o cabeçalho escurecido) fechou o menu; arrastar a alça com o mouse fechou, sem texto selecionado (eventos registrados: pointerdown na alça, pointermove capturado pela alça, pointerup). Uma 1ª tentativa feita durante a animação de abertura começou abaixo da alça — esperar a folha terminar de subir.
- Item 3: `/admin/cadastro-produtos` em 360 px, modo Lista, depois do carregamento real: 10 cartões, cada um com as 9 células dentro do próprio cartão (8 com legenda + ações), largura da página 360. No desktop (1024 px) a tabela segue igual (cabeçalho visível, cada produto numa linha).
- Observação: logo depois de mexer no contexto da barra lateral, a recarga automática do servidor de desenvolvimento mostrou "useSidebar must be used within a SidebarProvider" e a tela ficou em "Carregando…"; recarregando a página tudo abriu normal (efeito da recarga automática ao trocar um contexto do React; não acontece no site publicado).

**Testes (telas):** novo `components/product-task-kanban-card.test.tsx` 4/4; `components/app-menu-drawer.test.tsx` 16/16 (4 novos: identidade da agência, sigla tirada do nome, arrasto com mouse/X/botão direito, camada acima do cabeçalho; o de toque passou a usar Pointer Events com pointerType "touch"); `components/header.test.tsx` 17/17 (2 novos: o cabeçalho repassa sigla e papel da agência Partner e do admin). Rodados juntos todos os arquivos que usam o contexto da barra lateral (48): 529 passam; 42 falham, todas antigas e já listadas no RETOMAR-AQUI (`admin/produtos/page` 35, `admin/usuarios/page` 5, `iallka-floating-icon` 2). Typecheck das telas limpo.

**Limites:** a agência não foi vista pelo Claude no navegador (sem senha) — itens 1 e 2 para ela estão provados por teste; toque real não testado (a ferramenta não envia toque); as "33 telas" da rodada do celular NÃO estão homologadas (o Codex conferiu 8 telas do admin em 360 px e o fluxo Admin/Agência em 768/390/1480); o retorno pós-login para a tela de origem continua pendente (não mexido); tabelas em cartão no tablet seguem decisão do usuário.

**Reteste Codex:** mensagem "PARTE E" no topo de `docs/passagem-codex-2026-11-01.md`.

### Reteste Codex — partes A/B/C de 02/11 (parcial)

**Escopo:** interface local, Admin Master e Agência 1, proj_956 existente. Sem implementação de aplicação, nova contratação, pagamento, ajuste, exclusão, lançamento ou publicação. Não testou mutações de produto pago no banco de desenvolvimento. Não reexecutou as suítes relatadas pelo Claude. Outra sessão do Claude cuida das rotas de projeto: não tocar nesses arquivos nem presumir conclusão. Documentação adicionada sem substituir registros anteriores.

**Parte A aprovada no recorte conferido:**
- Admin em 390 px: Kanban sem rolagem horizontal, T015718/T015719 corretos, Sem executor/Sem líder atribuído. Olho do Kanban principal abriu o detalhe SEO; primeiro Escape fechou só detalhe, segundo fechou projeto.
- Admin e Agência real em 768 px: largura da página 768 px, cabeçalho sem o transbordamento anterior. Kanban em duas colunas sem overflow. Desktop Admin 1480 px mantém colunas e formato anterior (rolagem própria do quadro preservada).
- Agência: olho do Kanban PRINCIPAL abriu detalhe e Escape preservou projeto. Formas de Pagamento mostra carteira principal AK$ 1.174,46, igual topo/Admin. NÃO alterou opção selecionada.

**Parte C: consulta permitida funcionou (não é prova de isolamento):**
- Admin Financeiro: 7 carteiras; Extrato Lamego 1.174,46; Total Créditos e Conciliação carregaram. Rede observada: carteiras, ledger, stats/conciliação no recorte sem recusas 403/404.
- Admin projeto: /api/project-products e /api/wallets retornaram 200 (204 de preflight também observado).
- Agência no projeto: /api/project-products e /api/wallet-topup/summary retornaram 200; nenhuma chamada a /api/wallets no recorte observado. Produtos e tarefas próprios continuam visíveis. Duas tarefas continuam Para lançamento após cancelar abertura inesperada descrita abaixo.
- Não tentou PUT/PATCH/DELETE/ajuste/cancelamento em dado comercial. Não homologar a trava de produto pago nem permissões negativas/Líder/Nômade/Company com base somente nessa consulta; testes 15/15 etc. são resultados relatados pelo Claude, não reexecutados aqui.

**Parte B, cobertura parcial:** menu Admin em 360 px abriu em grade, busca precificacao sem acento encontrou Precificação; busca Especialidades e clique abriram rota correta e fecharam menu; X e Escape passaram. O menu da Agência apresentou links de Agência/Partner, sem links administrativos observados. Conferidas estruturalmente em 360 px as telas Financeiro, Relatórios, Allkademy, Acesso a chamados, Cadastro de Produtos, Pacotes, Dashboards Padrão e Especialidades: página da largura da tela, sem overflow horizontal detectado. Produtos e Dashboards foram medidos depois do carregamento real; não aprovar skeleton como tela. Isso NÃO é auditoria funcional de 33 telas em todos os tamanhos.

**Achados para Claude:**
1. **Produtos > Ver tarefas > Kanban diverge do principal:** não tem olho acessível. Clicar no cartão SEO abriu o formulário de LANÇAMENTO (Preparando lançamento, conexões/briefing), não o detalhe prometido. Cancelei sem preencher/confirmar e confirmei duas Para lançamento. Deve existir ação explícita de detalhe equivalente à Lista; lançar somente por ação claramente identificada, preservando estado e permissões.
2. **Menu Mais da Agência com identidade incorreta:** screenshot mostra AT/Administrador, sem nome Lamego Academy, embora topo seja LA e links de Agência. Admin também mostrou avatar AT apesar de VG. Corrigir fonte do usuário/perfil, sem mudar permissões. Cabeçalho do menu não deve ser hardcoded/admin fallback para todos.
3. **Cadastro de Produtos em 360 px tem UX ruim apesar de largura correta:** ID, imagem, nome e campos aparecem como blocos separados, dificultando identificar uma linha/produto completo. Captura 02-11-produtos-mobile-celulas.png. Rever cartão agrupado por produto com rótulos/ações acessíveis, sem esconder campos nem alterar desktop/dados. Não basta medir scrollWidth.
4. **Formas de Pagamento ainda tem ALLKOIN Novo com AK$0,00**, separado da carteira principal 1.174,46. Investigar fonte/semântica; não afirmar que é o mesmo saldo nem inventar crédito, mudar cobrança ou regra para disfarçar. Carteira principal corrigida, opção extra não homologada.
5. **Gestos do menu pendentes:** arrasto por mouse da alça selecionou texto e não fechou. Código usa apenas onTouchStart/Move/End; a ferramenta de navegador integrado não suporta dispatchTouchEvent, então toque real NÃO foi testado. Clique na faixa superior fora da folha também não fechou na sessão estável. Verificar sobreposição do cabeçalho/fundo e definir suporte ao mouse sem fingir prova de toque. Não tratar o arrasto por mouse sozinho como falha de toque. X/Escape/navegação passaram.

**Interrupção de sessão:** durante menu Admin houve retorno ao login sem causa comprovada (não atribuir automaticamente ao menu). Usuário entrou novamente como Admin; depois Codex saiu normalmente e entrou na Agência autorizada. Login de admin sem senha antiga/reset. Retorno pós-login específico continua pendente.

**Evidências privadas:** pasta habitual de visualizações, 02-11-admin-kanban-desktop.png, 02-11-menu-arrasto-selecao.png, 02-11-produtos-mobile-celulas.png, 02-11-menu-agencia-identidade.png, 02-11-agencia-saldo-tablet.png. Não guardar credenciais/tokens nem capturas privadas no Git.

**Estado final:** Agência autenticada em /agency/projetos/956, Tarefas em Lista, viewport restaurado, nenhum lançamento. Placar macro permanece 14/28 concluídos e 14 abertos. Parte A principal passou; parte B/abertura de tarefa pelo produto e isolamento completo C não encerrados. Tabelas em cartão no tablet e demais decisões comerciais permanecem do usuário. Próximo: Claude corrigir achados e retornar; Codex retesta sem repetir compra.

### Correções do Claude — escopo de projeto do Nômade + Líder não apaga projeto (02/11; ajustado à regra do usuário)

Pedido (02/11): fechar o achado anotado na rodada das carteiras — as rotas de projeto tratavam o Nômade como "vê todos os projetos" e o `DELETE` não barrava o Líder. **SOMENTE LOCAL**: sem commit/push/deploy/QA; nenhum dado do banco real gravado; só o servidor mudou; nenhuma tela mudou; a leitura do Líder (vê todos, decisão antiga) ficou como estava.

**Regra do usuário (02/11, depois da 1ª versão):** "o nômade não vê o projeto, ele vê tarefa só que ele está liberado pra ver". A 1ª versão deixava o Nômade abrir o projeto em que tinha tarefa; foi corrigida: em `/api/projects` ele não vê projeto nenhum, e continua vendo só as tarefas liberadas para ele (Minhas tarefas, Disponíveis e as rotas de tarefa do executor).

**O que estava aberto:** o escopo do Nômade em `/api/projects` era "open", o mesmo "vê tudo" do Líder. Ele listava todos os projetos, abria qualquer um (cliente, valores, faturas, histórico e credenciais), criava projeto com o nome de outra agência e alterava, arquivava e apagava projeto de qualquer conta. O Líder, que já não alterava nem arquivava, ainda apagava.

| Rota (`/api/projects`) | Nômade antes | Nômade agora |
|---|---|---|
| `GET /` (lista) | todos os projetos | lista vazia sempre — nem os projetos em que ele tem tarefa ou etapa; o filtro por cliente não abre nada |
| `GET /:id` e todas as abas (`/files`, `/documents` e download, `/tasks`, `/billing`, `/dashboard`, `/log`, `/credentials`) | qualquer projeto | 403 sempre, nem no projeto em que ele tem tarefa |
| criar (`POST /`), `GET /check-name`, `PUT /:id`, `PATCH /:id/archive`, `DELETE /:id`, documentos (enviar/apagar), credenciais (criar/alterar/arquivar/compartilhar/revogar) | qualquer projeto | 403 sempre; nada muda no banco |
| tarefas dele (`/api/nomades/me/tarefas` e rotas de tarefa do executor) | — | iguais: vê só a tarefa que responde inteira ou da qual tem uma etapa |

| Líder | Antes | Agora |
|---|---|---|
| `DELETE /api/projects/:id` | apagava qualquer projeto | 403 "Permissão insuficiente" — a mesma trava que o `PUT` e o arquivamento já tinham |
| lista, detalhe e abas | vê todos | igual (não mudou) |

Admin, agência e empresa: iguais. O Líder importado da plataforma antiga (role "lider" com account_type "nomades") continua tratado como Líder.

Arquivos: `apps/backend/src/lib/project-scope.ts` (novos `isNomadeUser` e `nomadeWorkTaskWhere` — o critério "tarefa liberada para o Nômade" fica num lugar só), `apps/backend/src/routes/projects.ts` (trava por rota), `apps/backend/src/routes/project-tasks.ts` (as três cópias do mesmo critério — briefing, entregáveis/IA e visão operacional — passam a chamar a função comum; mesmo resultado); teste novo `apps/backend/src/routes/projects-nomade-leader-scope.integration.test.ts`.

**Por que as telas não mudam:** as telas do Nômade (Painel, Minhas tarefas, Disponíveis, Ganhos, Histórico) usam só `/api/nomades/me/...` e as rotas de tarefa do executor; nenhuma chama `/api/projects`, e a busca do cabeçalho não procura projetos no perfil Nômade. A tela Projetos do Líder (`app/lider/projetos`) só lê a lista, que continua igual. Admin, agência e empresa recebem as mesmas respostas de antes.

**Medido pelo Claude (navegador interno, sessão admin já aberta, só abrir/olhar; nada salvo):** Gestão de Projetos (4 projetos) e proj_956 → Dashboard, Dados do Projeto, Produtos, Tarefas, Arquivos, Documentos, Cofre, Faturamento e Log — todas as chamadas 200, sem erro no console.

**Testes (banco descartável, um arquivo por execução):** novo `projects-nomade-leader-scope` 9/9 (versão final) — duas agências, empresa, dois nômades (o 1º responde pela tarefa do projeto A e só por uma etapa no B), nômade sem perfil, Líder, Líder no formato da importação antiga e admin; o Nômade não lista nem abre projeto nenhum, nem onde tem tarefa, e em Minhas tarefas continua vendo só as duas tarefas dele; cada recusa confere no banco que título, arquivamento, documento e credencial ficaram iguais, e a agência dona ainda vê faturamento/painel/histórico/credenciais, altera e apaga o próprio projeto. Depois do ajuste à regra do usuário, rodados de novo: o novo 9/9, `delete-security` 27/27, `agency-link-contract` 6/6 e typecheck limpo — o ajuste só mexeu no caminho do Nômade; os demais abaixo foram rodados na 1ª versão, com o mesmo código para admin, agência, empresa e Líder. Os que já usavam essas rotas ou o critério do Nômade: `delete-security` 27/27, `project-archiving` 15/15, `project-registered-contacts` 11/11, `agency-link-contract` 6/6, `catalog2-checkout` 28/28, `catalog2-e2e-scenarios` 10/10, `catalog2-multiple-contracts` 10/10, `catalog2-briefing-access` 1/1, `task-deliverables` 6/6, `task-ai` 7/7, `catalog2-ops` 6/6, `wallets-project-products-access` 15/15; `project-admin-responsible` 18/21 e `project-edit-admin-responsible` 13/15 — as mesmas 3 + 2 falhas antigas do motor de alertas já registradas em 02/10 e 01/11 (motor não tocado; o PUT do admin não mudou). Typecheck do servidor limpo.

**Limites e fora deste pedido (visto no código, não mexido):** (1) outras rotas que perguntam "esse usuário enxerga o projeto?" (`projectVisibleToUser`) ainda deixam o Nômade passar em projeto de qualquer conta — fluxo da tarefa, portões de aprovação, SLA, Conexões, PLAC, tarefas internas, aditivos, cancelar item, assinaturas, integração Meta, memória/IA do projeto. Não foram fechadas aqui de propósito: nelas o Nômade também entra como **especialista** de etapa (usuário escolhido para qualificar, sem ser o executor — o teste EX-ESP prova esse caminho) e como revisor; a regra "só onde executa" quebraria isso. Pede uma rodada própria. (2) `GET /check-name` ainda responde a agência/empresa se um nome de projeto existe em qualquer conta (só sim/não). (3) Só a sessão admin foi vista no navegador; Nômade, Líder, agência e empresa foram provados pelos testes de servidor (o Claude não entra com senha; não há Líder no banco local).

**Reteste Codex (proj_956 existente; sem criar, alterar, arquivar ou apagar projeto):** (1) como Agência 1: Projetos lista os mesmos projetos da Lamego Academy de antes; proj_956 abre com todas as abas (Dashboard, Dados do Projeto, Produtos, Tarefas, Arquivos, Documentos, Cofre, Faturamento, Log) iguais; (2) como admin: Gestão de Projetos com os 4 projetos; proj_956 com as mesmas abas; (3) nos dois perfis, com a aba Rede aberta: nenhuma chamada a `/api/projects` volta 403/404 nesse roteiro.

### Correções do Claude — permissões de carteiras e de produtos do projeto + trava do produto pago (02/11)

Pedido do usuário (02/11): "Faça esta tarefa aqui: Fechar permissões de /api/wallets e /project-products" — achado de segurança anotado nas rodadas anteriores. **SOMENTE LOCAL**: sem commit/push/deploy/QA; nenhum dado do banco real gravado; nenhuma regra comercial mudou além da trava do produto pago pedida pelo usuário; só o servidor mudou, mais um aviso na tela do projeto ao desvincular produto.

**O que estava aberto:** qualquer conta logada, de qualquer perfil, conseguia ver todas as carteiras (saldos, extratos, painéis do Financeiro, previsão com faturas de outras empresas), **criar carteira com saldo, creditar/debitar qualquer carteira** e suspender carteira; e também listar produtos e tarefas de qualquer projeto (preço ao cliente, comissão, dados do cliente), vincular produto em projeto de outra conta, mudar status/preço/comissão e **apagar** produto de projeto alheio (as tarefas iam junto).

| Rota | Antes | Agora |
|---|---|---|
| `GET /api/wallets` | todas as carteiras | admin: todas (igual). Demais: só a própria — agência (a agência Partner ativa vê também a carteira de Partner), empresa, nômade; os filtros da busca só refinam; sem vínculo = lista vazia |
| `GET /api/wallets/:id` e `/:id/ledger` | qualquer carteira | admin: igual. Demais: só a própria; a de outro dono responde 404 (não confirma que existe) |
| `GET /api/wallets/stats`, `/ledger`, `/projections`, `/conciliation` (painéis do Financeiro) | qualquer conta | só admin; demais: 403 |
| `POST /api/wallets`, `POST /api/wallets/:id/adjustment`, `PUT /api/wallets/:id` | qualquer conta | só admin com perfil de acesso "sistema" (criar = create; ajustar/alterar = edit) — a mesma regra de Faturas; admin sem perfil atribuído ou Master continua podendo |
| `GET /api/project-products` | produtos de todos os projetos | admin: igual (com os nomes de executor/Líder). Agência/empresa: só dos próprios projetos. Líder: só onde tem tarefa visível para ele (a mesma fila de `/api/lider/tasks`). Nômade e outros: lista vazia |
| `POST /api/project-products` (vincular produto) | qualquer projeto | admin ou a agência/empresa dona do projeto; senão 404 "Projeto não encontrado" e nada é criado |
| `PATCH` e `DELETE /api/project-products/:id` | qualquer vínculo | admin ou a dona do projeto; senão 404 "Vínculo não encontrado" e nada muda |
| `GET /api/project-products/tasks` e `/tasks/:id` | tarefas de todos os projetos | o mesmo escopo de `/api/project-tasks` (admin tudo; agência/empresa os próprios projetos; Líder a fila dele; nômade nada); tarefa alheia = 404 |

Arquivos: `apps/backend/src/routes/wallets.ts`, `apps/backend/src/routes/project-products.ts` (o escopo reaproveita `getTaskScopeWhere`/`combinedProjectWhere`, já usados pelas rotas de tarefas e projetos — nenhuma regra nova paralela); teste novo `apps/backend/src/routes/wallets-project-products-access.integration.test.ts`.

**Produto já pago (decisão do usuário em 02/11: "Sim, bloquear"):** produto pago = está num pagamento com status PAGO (só a confirmação de pagamento cria isso; tentativa que falhou não conta). Depois de pago, a agência/empresa dona **não muda mais preço ao cliente, comissão nem pagador e não cancela** o produto — `PATCH` responde 409 (`product_paid_locked`) com o motivo; reenviar o mesmo valor e mudar datas continuam aceitos; **o admin ainda corrige**. **Ninguém, nem o admin, remove** produto pago: o banco já recusava (o pagamento aponta para ele) com erro genérico; agora `DELETE` responde 409 "Este produto já foi pago e não pode ser removido do projeto." e a tela do projeto (Produtos → lixeira → Desvincular) mostra esse aviso — antes a janela só ficava parada, sem mensagem (`apps/frontend/components/project-view-slide-panel.tsx`). **Exceção:** produto do catálogo antigo (`product_id`; nenhum vendido hoje, 1 ainda ativo) continua aceitando preço/comissão/pagador depois de pago, porque a tela antiga de criar projeto (`project-create-new-panel.tsx`, `handleCheckoutComplete`) grava a comissão escolhida no checkout logo DEPOIS de pagar — travar quebraria essa tela; cancelar e remover travam para ele também.

**Por que as telas não mudam:** mapeado quem chama cada rota. As de carteiras só são usadas pelo admin (Financeiro → Carteiras/Conciliação, Usuários → carteira da organização, Projeto → Faturamento → Formas de Pagamento); agência e empresa leem o próprio saldo por `/api/wallet-topup/summary`, que não mudou. Produtos e tarefas do projeto: telas de projeto do admin, da agência e da empresa (sempre o próprio projeto) e o checkout. Nenhuma tela de Líder ou Nômade usa essas rotas.

**Medido pelo Claude (navegador interno, sessão admin, só abrir/olhar; nada salvo):** Financeiro → Carteiras (7 carteiras, totais e previsão), extrato da Lamego Academy, detalhes de créditos e Conciliação — todos responderam 200; proj_956 → Produtos e Tarefas (T015718/T015719) 200; Faturamento → Formas de Pagamento "Saldo: AK$ 1.174,46 (R$ 1.174,46)" 200; Usuários → Lamego Academy → carteira da organização AK$ 1.174,46 (200). Depois da trava, o proj_956 recarregado fez 25 chamadas, todas 200.

**Testes (banco descartável, um arquivo por execução):** novo `wallets-project-products-access` 15/15 — duas agências (a B é Partner ativa), empresa, nômade, Líder com área, admin sem perfil e admin só leitura, mais 4 cenários de produto pago (dona não muda nem cancela, mesmo valor e datas passam, admin corrige, ninguém remove, catálogo antigo grava a comissão); cada recusa confere que saldo, extrato e vínculo ficaram iguais. Telas: novo `apps/frontend/components/project-view-slide-panel.unlink-error.test.tsx` 1/1 e os que já abriam essa tela 9/9. Os que já usavam essas rotas: `agency-link-contract` 6/6 e `task-release-orchestration` 34/34. Typecheck limpo no servidor e nas telas.

**Limites:** só a sessão admin foi vista no navegador; os demais perfis foram provados pelos testes de servidor (o Claude não entra com senha). **Visto no código, fora deste pedido (não testado):** as rotas de projeto tratam Nômade como "vê todos os projetos" (`getProjectScope` = "open"): `GET /api/projects` lista todos para ele e, pela mesma regra, `PUT` e `DELETE /api/projects/:id` aceitam projeto de qualquer conta; o Líder também vê todos (decisão antiga registrada no código) e o `DELETE` não o barra. Virou tarefa separada (outra sessão do Claude).

**Reteste Codex (proj_956 existente; sem compra, pagamento, lançamento ou ajuste de saldo):** (1) como Agência 1: proj_956 → Produtos, Tarefas (Lista e Kanban), olho do produto → tarefas do produto, Faturamento → Formas de Pagamento — tudo igual a antes (T015718/T015719; saldo AK$ 1.174,46, o mesmo do topo); saldo do topo e Meu Perfil iguais; (2) como admin: Financeiro → Carteiras (7 carteiras, extrato), Conciliação, detalhes de créditos; Usuários → abrir um usuário da Lamego Academy → carteira da organização com saldo; proj_956 → Formas de Pagamento com a carteira Lamego; (3) nos dois perfis, com a aba Rede do navegador aberta: nenhuma chamada a `/api/wallets` ou `/api/project-products` volta 403/404 nesse roteiro; (4) produto já pago: NÃO tentar desvincular, cancelar nem mudar preço/comissão no banco real — a trava foi provada pelos testes; só conferir que os dois produtos do proj_956 seguem iguais.

### Correções do Claude — revisão das telas no celular/tablet + menu Mais novo (02/11)

Pedido do usuário (02/11, por áudio, no meio da rodada do Kanban): "dá uma revisada em todas as telas. UX, tamanhos no mobile, em vários tipos de celular, tablet" e refazer o menu "Mais" do celular como menu deslizante — aperta "Mais", abre bonito, uma grade de ícones com o nome de cada coisa ("tudo bem mudado"). **SOMENTE LOCAL**: sem commit/push/deploy/QA, sem compra/pagamento/lançamento/ajuste, nenhum dado gravado; nenhuma regra mudou. As correções de tela usam só variantes de tela estreita (`max-lg:`/`max-md:`/`max-sm:`): **no desktop (≥ 1024 px) nada muda** (conferido em 1480×800). Esta rodada vai junto com a de baixo (cabeçalho 768, Kanban, cartões e saldo): o Codex retesta as duas de uma vez, com a mensagem única do topo da passagem.

**1. Menu "Mais" do celular/tablet (botão "Mais" da barra de baixo)** — `apps/frontend/components/app-menu-drawer.tsx` (reescrito), `apps/frontend/lib/navigation-store.ts` (novo), `apps/frontend/components/sidebar.tsx` (só publica o menu que já monta).

| | Antes | Agora |
|---|---|---|
| Itens | lista própria do celular, desatualizada em relação à barra lateral, com contadores de demonstração | **o mesmo menu da barra lateral** do perfil logado (itens, ordem, permissões, Admin Master, Partner, tarefas internas, navegador seguro, Roadmap); item novo na barra lateral aparece sozinho no menu |
| Organização | grupos em sanfona (itens escondidos até abrir o grupo) | "Principal" com os itens soltos + uma seção por grupo, **todos os subitens à vista** |
| Visual | lista de texto | folha que **sobe de baixo** (cantos arredondados, degradê escuro da plataforma, até 92% da altura, alça no topo) com **grade de ícones coloridos e o nome embaixo** (até 2 linhas): 3 por linha abaixo de 400 px, 4 de 400 a 639 px, 5 de 640 a 767 px, 6 a partir de 768 px; a tela atual fica destacada |
| Busca | — | "Buscar no menu" filtra os ícones pelo nome (sem diferença de acento/maiúscula) |
| Fechar | — | X, Escape, toque no fundo ou **arrastar a alça para baixo**; tocar num ícone abre a tela e fecha o menu; a página de trás não rola com o menu aberto |
| Contadores | números fixos de demonstração | só os contadores reais que a barra lateral já mostra |
| Mantidos | — | perfil no topo, Roadmap e chamados (mesma permissão e mesmo atalho do desktop), Central de Atenções, Aparência (tema e tamanho da fonte) e Sair da Conta |

**2. Revisão das telas no celular e no tablet** — as 33 telas do menu do admin (`/admin/` dashboard, campanhas-indicacao, financeiro, relatorios, allkademy, acesso-chamados, usuarios, clientes, empresas, permissoes, projetos, tarefas, qualificacoes, tarefas-internas, navegador-seguro, cadastro-produtos, produtos, conexoes, precificacao, pedidos-comerciais, modelos-tarefas, combos, pacotes, niveis, niveis-nomades, programa-partner, sistema, disponibilidade, especialidades, onboarding, dashboard-templates, configuracoes, legacy), medidas no navegador interno (sessão admin; só abrir/olhar, nada salvo) em **360×740** (Android pequeno), **390×844** (iPhone 12–15), **412×915** (Android grande — menu), **768×1024** (tablet em pé) e **1480×800** (desktop). Critério: a página não passa da largura da tela e nenhum botão/texto fica cortado fora da área visível.

| Tela | Problema no celular | Correção (só abaixo de 768 px, salvo indicação) | Arquivo |
|---|---|---|---|
| Barras de abas do componente compartilhado (ex.: Sistema, Onboarding, Modelos de dashboard) | abas lado a lado passavam da borda e as últimas ficavam cortadas | quebram em linhas | `apps/frontend/components/ui/tabs.tsx` (`TabsList`) |
| Financeiro (seletor das áreas) | seletor passava da borda | quebra linha | `app/admin/financeiro/page.tsx` |
| Allkademy | tabela larga com rolagem de lado | vira cartão pelo padrão `tabela-cartao` | `app/admin/allkademy/page.tsx` |
| Acesso a chamados (usuários + painel de acesso ao Roadmap) | tabelas com rolagem de lado; filtros e e-mails longos passavam da borda | viram cartão; filtros e ações quebram linha; e-mail longo quebra | `app/admin/acesso-chamados/page.tsx`, `components/central-chamados-access-panel.tsx` |
| Cadastro de Produtos (barra de ferramentas e paginação) | barra cortada (abaixo de 1024 px) | barra e paginação quebram linha; paginação sem recuo no celular | `app/admin/produtos/page.tsx` |
| Pacotes (seletor do cartão) | seletor passava da borda | ocupa a linha inteira (abaixo de 640 px) | `app/admin/pacotes/page.tsx` |
| Modelos de dashboard (cartões) | botões do cartão cortados | conteúdo quebra linha e as ações vão para a linha de baixo (abaixo de 640 px) | `app/admin/dashboard-templates/page.tsx` |
| Relatórios (seletor) e Especialidades | em 360 px: seletor e nome longo da especialidade (7 px de rolagem no cartão) | seletor quebra linha; nome quebra em 2 linhas no celular (no desktop continua com reticências) | `app/admin/relatorios/page.tsx`, `app/admin/especialidades/page.tsx` |

**Resultado medido:** 390×844 e 360×740 — as 33 telas sem rolagem de lado da página e sem elemento cortado. 768×1024 — nenhuma tela passa da largura nem tem elemento cortado; as tabelas largas continuam tabela e rolam DENTRO da própria área, como hoje no tablet: Allkademy (1.275 px numa área de 694), Financeiro (970/694), Cadastro de Produtos (755/705), Usuários (912/690), Disponibilidade (953/694), Especialidades (1.020/694), Acesso a chamados (664/657). 1480×800 — telas alteradas iguais ao aprovado (página 1.480 px; seletores e abas numa linha; tabelas com cabeçalho; nome da especialidade com reticências). Menu "Mais" em 360/390/412/768 — 3/3/4/6 ícones por linha, sem rolagem de lado.
**Limites:** só o perfil admin foi visto pelo Claude (sem sessão de Agência/Empresa/Nômade/Líder/Partner; não se usa nem se pede senha) — o menu novo usa a barra lateral de cada perfil, então os itens mudam por perfil; o Codex confere como Agência 1. No tablet as tabelas largas rolam dentro da própria área (comportamento atual; virar cartão também no tablet é decisão do usuário). Telas fora do menu (detalhes, janelas, cadastros abertos) só foram vistas no caminho do proj_956.

**Testes:** `components/app-menu-drawer` 12/12 (4 novos: mesmo menu da barra lateral com todos os subitens à vista; sem a barra lateral não mostra contadores inventados; busca sem acento/maiúscula; fecha no X, no Escape, no fundo e arrastando a alça). 14 arquivos ligados às duas rodadas (menu, cabeçalho, cesta, barra lateral, abas do projeto, faturas, janela da fatura, carteira, Tela Slide, project-display, project-wallet, wallet-window, acesso a chamados, pacotes) = 107 testes passando. Suíte completa 1.884 ✓ / 74 ✗ nos MESMOS 5 arquivos antigos (admin/produtos 36, admin/catalogo-produtos 29, admin/usuarios 6, iallka-floating-icon 2, user-view-slide-panel-permissions-tab 1); as 2 falhas a mais que na rodada anterior (uma em admin/produtos, uma em admin/usuarios) passam rodando sozinhas, e esses dois arquivos sozinhos dão as contagens antigas (35 e 5) — oscilação por carga, já registrada antes. Typecheck do frontend limpo. Servidor sem mudança nesta rodada. O jsdom não mede layout: os tamanhos reais foram medidos no navegador (acima).

**Reteste Codex (junto com o bloco de baixo; proj_956 e telas do menu; sem compra, pagamento, lançamento ou ajuste), como Agência 1 e admin, em 360×740, 390×844, 768×1024 e 1480×800:** (1) menu "Mais": abre de baixo, grade de ícones com nome, os mesmos itens da barra lateral do perfil (comparar com o desktop), busca, fecha no X/Escape/fundo/arrastando a alça, tocar num ícone abre a tela certa; (2) telas do menu do perfil: página sem rolar de lado, nada cortado, tabelas em cartão abaixo de 768 px, abas e seletores quebrando linha; (3) desktop 1480 igual ao aprovado; (4) roteiro do bloco de baixo (cabeçalho 768, Kanban, cartões, Escape e saldo).

### Correções do Claude — cabeçalho 768, Kanban, cartões e saldo (02/11, madrugada)

Pedido: "Retorno Codex → Claude: responsividade Agência e achados Kanban/saldo" (passagem). **SOMENTE LOCAL**: sem commit/push/deploy/QA, sem compra/pagamento/lançamento/ajuste de saldo, nenhum dado gravado no banco real; nenhuma regra comercial mudou. Desktop (≥ 1024 px) igual ao aprovado.

| Achado | Antes | Agora | Arquivos |
|---|---|---|---|
| 1. Cabeçalho em 768 px | busca com largura mínima de 288 px desde 768 px + saldo + cesta: página 902 px na Agência / 771 px no Admin, perfil cortado | entre 768 e 1023 px: busca vira só o ícone (com nome acessível "Buscar"), saldo mostra só o valor (o rótulo "Saldo em carteira" volta a partir de 1024 px), quem cede espaço é a saudação "Boa noite…" (corta com reticências); todos os controles inteiros. Desktop igual | `apps/frontend/components/header.tsx` |
| 2. Kanban no celular | 6 colunas fixas lado a lado: 1.534 px em 313 px | abaixo de 1024 px vira grade (768 px: 2 colunas; 390 px: 1 coluna), todas as colunas e cartões visíveis, sem rolagem lateral; desktop continua com as 6 colunas | `components/project-management-modal.tsx` (Kanban da aba Tarefas e Kanban das tarefas do produto) |
| 3. Cartões do Kanban | código virtual #1001/#2001; olho sem ação; "Nômade"/"Equipe Allka" sempre, mesmo sem ninguém atribuído | código real T015718/T015719 (número virtual só em dado antigo sem código, igual à Lista); olho abre o mesmo detalhe da Lista; "Sem executor atribuído"/"Sem líder atribuído" quando não há ninguém; com atribuição: admin vê o nome, os demais "Nômade atribuído"/"Equipe Allka" — nomes NÃO saem do servidor para não-admin. O mesmo nas tarefas do produto (lista e Kanban) | modal, `apps/frontend/lib/project-display.ts`, `apps/backend/src/routes/project-products.ts` (ids da atribuição para todos; nomes só para admin) |
| 3b. Escape (achado nesta rodada) | com o detalhe da tarefa aberto sobre o projeto, UM Escape fechava o projeto de trás e deixava o detalhe solto sobre a lista | cada Escape fecha só a tela de cima (detalhe → depois o projeto) | `components/embedded-slide-screen.tsx` |
| 4. Formas de Pagamento | saldo era `useState(0)` fixo | saldo real, só leitura: agência/empresa leem a própria carteira pela MESMA fonte do topo (`/wallet-topup/summary`); admin lê a carteira do dono do projeto (como em Financeiro → Carteiras); sem fonte = "indisponível" | `apps/frontend/lib/project-wallet.ts` (novo), modal |

**Medido no navegador interno** (sessão admin; proj_956; só abrir/fechar): 390×844 — Kanban em 1 coluna, sem rolagem lateral nem corte; cartões T015719/T015718 com "Sem executor atribuído"/"Sem líder atribuído"; olho do SEO abre o detalhe (tar15718); um Escape real fecha só o detalhe e o projeto segue no Kanban; Formas de Pagamento "Saldo: AK$ 1.174,46 (R$ 1.174,46)". 768×1024 — página 768 px (antes 771 no Admin), perfil termina em 738 px, Kanban em 2 colunas sem rolagem; com o saldo (140 px) e a cesta (36 px) da Agência SIMULADOS na mesma barra a página continua em 768 px e o perfil inteiro. 1480×800 — igual ao aprovado (busca 270 px com "Buscar...", Kanban com 6 colunas de 240 px e rolagem própria como antes).
**Limites:** a Agência real não foi vista pelo Claude (sem sessão; cabeçalho conferido por simulação das larguras) — o Codex confere como Agência 1. A rota de lista de carteiras (`GET /api/wallets`) aceita qualquer usuário logado — por isso a tela da Agência NÃO a usa; isso fica registrado como achado de segurança anterior, não mexido.

**Testes:** Servidor (banco descartável, um arquivo por execução): `agency-link-contract` 6/6 — cenário 6 novo: a lista de produtos do projeto manda os ids de quem executa/lidera para todos, e o NOME só para admin (agência não recebe nenhum nome). Typecheck do servidor limpo. Telas: `lib/project-wallet` 3/3 (novo: agência pela fonte do topo, admin pela carteira do dono, sem fonte = indisponível), `lib/project-display` 13/13 (+3: "Sem executor/líder atribuído", nomes só para quem pode ver, código real T015718), `components/embedded-slide-screen` 5/5 (+1: duas Telas Slide — cada Escape fecha só a de cima); vizinhos (header, app-menu-drawer, abas, tabela de faturas, janela da fatura, wallet-window, framed-overlay, project-adapter, task-display, agencia/financeiro, project-admin-responsible-section, task-flow-card, tarefas, company-view-slide-panel) — 18 arquivos/105 testes passando. Suíte completa 1.882 ✓ / 72 ✗: os MESMOS 5 arquivos e as mesmas contagens da rodada anterior (admin/produtos 35, admin/catalogo-produtos 29, admin/usuarios 5, iallka-floating-icon 2, user-view-slide-panel-permissions-tab 1); +7 testes novos passando. Typecheck do frontend limpo.

**Reteste Codex (proj_956; sem compra, pagamento, lançamento ou ajuste), como Agência 1 e admin, em 390×844, 768×1024 e 1480×800:** (1) cabeçalho em 768: sem passar da tela, perfil inteiro, busca (ícone), saldo e cesta clicáveis; (2) Tarefas → Kanban: 1 coluna no celular, 2 no tablet, 6 no desktop; (3) cartões com T015718/T015719 e "Sem executor/líder atribuído"; olho do SEO abre o detalhe; Escape fecha só o detalhe; (4) as mesmas regras em Produtos → olho → tarefas do produto (lista e Kanban); (5) Faturamento → Formas de Pagamento: saldo igual ao do topo da Agência (AK$ 1.174,46) e, como admin, o da carteira Lamego; nada de alterar forma de pagamento.

### Reteste Codex da responsividade — Agência 1 (01/11; MAIS RECENTE)

**Complemento posterior — Admin também retestado após o usuário autenticar manualmente:** Produtos/Lista de Tarefas/Faturamento sem overflow interno390/768/1480; página390e1480corretas, mas768gera771px por cabeçalho global. Fatura390semoverflow, X/Escape fecham só ela e preservam Faturamento. KanbanAdmin reproduziu1534px em313px e códigos#1001/#2001. O pedido abaixo de loginAdmin foi atendido; não permanece como bloqueio. O teste específico de retorno após envio de login NÃO foi exercitado: usuário chegou ao dashboard. Origem final/Admin/projetos/956,Faturamento;Lista eviewport restaurados. Sem gravação comercial/código/deploy. Restantes limites/achados/placar preservados.

Sessão Agência1 Lamego Academy, mesmo proj_956. Navegador controlado pela UI; medições somente do DOM renderizado. Nenhum dado comercial alterado, compra/pagamento/lançamento/ajuste/publicação/deploy. Sidebar não alterada; viewport390×844/768×1024/1480×800 testado e restaurado; Kanban voltou para Lista. Origem mantida em /agency/projetos/956,Faturamento>Faturas.

**Aprovado neste recorte Agência:**390px, todas as9abas em3linhas e sem overflow horizontal; Produtos com nomes/selos/quebra de linhas e ações alcançáveis verticalmente; Tarefas em Lista com status/controles; Faturas em cartão com rótulos/valor2148,66/olho/PDF nomeados; Formas de Pagamento sem overflow interno; janela da fatura sem overflow horizontal, X e Escape fecham só ela e preservam Faturamento. Em768px, abas em2linhas e Produtos/Lista/Faturamento sem overflow interno. Em1480px, abas em1linha e formato desktop preservado no recorte visual. PDF só teve presença/nome conferidos, não foi baixado nesta rodada.

**Pendências encontradas para Claude (sem implementação Codex):**
1. Tablet768px na Agência: largura global902px, perfil ultrapassa atéx902; não são somente3px como no admin relatado pelo Claude. Cabeçalho global corta nome/perfil e causa overflow da página. Corrigir responsividade global preservando desktop, saldo, busca, notificações e acesso ao perfil.
2. Kanban: seis colunas fixas resultam1534px em313px no celular. Roteiro pede acesso sem rolagem lateral; adaptar somente apresentação estreita, sem mudar fluxo/status nem mover tarefas. Se padrão intencional exigir rolagem, não presumir aprovação: explicitar decisão.
3. Kanban usa#1001/#2001, nãoT015718/T015719. Olho do cartão SEO clicado não abriu detalhe nem mudou a tela. Leitura de project-management-modal.tsx confirmou uniqueId=produto.id*1000+tarefa.id e render#{tarefa.uniqueId}; botão Eye desse cartão sem onClick. Corrigir código exibido e abrir o mesmo detalhe da Lista, sem inventar novo ID. Cartões também mostram Nômade/Equipe Allka apesar de tarefas não lançadas; tratar como rótulos de privacidade, não atribuição real (fonte executor/lider vazia e fallback), explicar/exibir não atribuído sem expor identidades protegidas.
4. Faturamento>Formas de Pagamento: carteira mostraAK$0,00/SaldoDisponível0, enquanto topo Agência mostraAK$1174,46. Leitura confirmou const[walletBalance]=useState(0) nesse componente. Usar fonte real autorizada da carteira ou indicar indisponível; nunca mudar saldo de banco nem efetuar ajuste. Não alterar forma de pagamento selecionada/regra de cobrança para corrigir exibição.

**Limites:** reteste novo como Admin ainda não feito; usuário foi solicitado a entrar como administrador, sem tentar senha antiga/reset. Homologação anterior desktop admin preservada, mas não equivale a esta rodada responsiva. Não foram reexecutadas as suítes relatadas pelo Claude. Não classificar automaticamente72falhas/3falhas de alertas como irrelevantes sem investigar.

Evidências privadas na pasta de visualizações desta sessão: T28-mobile-faturas-corrigido.png, T28-mobile-kanban-retorno2.png, T28-tablet-agencia-cabecalho-902.png, T28-saldo-divergente-projeto.png, T28-desktop-faturas-retorno2.png. Não colocar capturas/dados privados no Git.

**Farol macro:**14/28concluídos;14abertos (T09/T10/T25/T28parciais;T04/T16–T24bloqueados). T28 não encerrado: pontos acima, admin responsivo e retorno pós-login específico. Permanecem decisões de comissão recorrente/pagador/faturas agência/centavo/líder inexistente/L5-L2/slides antigos. Próximo: Claude corrigir os achados e devolver testes/continuidade; Codex retesta, sem compra nova.

### Correções do Claude — tela do projeto no celular (01/11, fim da noite)

Pedido: "Retorno Codex → Claude: desktop passou, corrigir mobile" (passagem) — rolagem lateral interna em 390×844. **SOMENTE LOCAL**: sem commit/push/deploy/QA, sem compra/pagamento/lançamento/ajuste, nenhum dado gravado; nenhuma regra comercial mudou. Tudo com variantes `max-lg:` (abaixo de 1024 px) e `max-md:` (abaixo de 768 px): **no desktop (≥ 1024 px) nada muda**. O usuário confere depois do reteste do Codex.

| Onde | Antes (390 px) | Agora | Arquivos |
|---|---|---|---|
| Abas do projeto | grade fixa de 9 colunas, 1.201–1.223 px numa faixa de 348 px (rolagem lateral; em 768 px também não cabia) | abaixo de 1024 px as abas quebram em linhas (390 px: 3×3; 768 px: 2 linhas), margem lateral 12 px no celular; desktop: mesma grade de 9 colunas | `apps/frontend/components/project-tabs-list.tsx` (novo, mesma marcação), `components/project-management-modal.tsx` |
| Produtos | barra "Adicionar Produto · Filtros · Ordem" e linha "Contratação • Entrega" estouravam (552 px em 337 px) | barra e botões quebram linha; nome do produto e selos quebram linha (nome inteiro, sem reticências); "Contratação"/"Entrega" em linhas próprias; separadores "•" (decorativos) somem no celular | modal |
| Faturamento → Faturas | tabela de 6 colunas, 641–676 px em 291–301 px | abaixo de 768 px vira cartão pelo padrão global `tabela-cartao` (`data-rotulo`: Situação, Fatura, Descrição, Vencimento, Valor; ações no rodapé do cartão; descrição inteira); resumo em 1 coluna; botões do olho e do PDF ganharam nome acessível ("Ver detalhes da fatura INV-…", "Baixar PDF da fatura INV-…") | `components/project-invoices-table.tsx` (novo, mesma marcação), modal |
| Tarefas (achado nesta rodada; não estava na lista) | barra de busca/visão/itens/Filtros/paginação e selo do produto passavam da borda e ficavam CORTADOS (inacessíveis); a situação da tarefa ("Para lançamento", que também abre o lançamento) ficava escondida abaixo de 640 px | barra quebra em linhas (busca na linha inteira); linha da tarefa quebra e as ações vão para a linha de baixo; selo do produto quebra; situação visível também no celular | modal |
| Detalhes da Fatura | itens com nome longo: tabela 387 px em 324 px | nome do produto quebra a linha no celular; X e Escape fecham só a janela e o projeto continua em Faturamento (conferido) | `components/project-invoice-details-window.tsx` |

**Medido no navegador interno** (sessão admin já aberta; proj_956; só abrir/fechar): 390×844 — página 390 px e TODAS as 9 abas (Dashboard, Dados do Projeto, Produtos, Tarefas, Arquivos, Documentos, Cofre, Faturamento — inclusive Formas de Pagamento — e Log) com 0 rolagem lateral e 0 elemento cortado; cabeçalho do projeto idem; fatura em cartão; janela da fatura sem rolagem lateral, Escape real e X fechando só ela. 768×1024 — abas em 2 linhas, as 9 abas sem rolagem/corte, tabela de faturas em modo tabela. 1480×800 — igual ao aprovado: abas em grade de 9 colunas (32 px de altura, margem 50 px), barra de Produtos numa linha, tabela com cabeçalho, resumo em 3 colunas.
**Limite conhecido (fora desta tela, não mexido):** em 768 px o botão de perfil do cabeçalho global passa 3 px da tela (página 771 px). Visão Kanban das tarefas não foi medida (fora do roteiro). Conferido como admin; a Agência usa os mesmos componentes — o Codex confere como Agência 1.

**Testes:** Telas: novos `components/project-tabs-list` 2/2 (grade de 9 colunas no desktop + quebra abaixo de 1024 px) e `components/project-invoices-table` 3/3 (padrão `tabela-cartao`: cada célula com a legenda da coluna, descrição inteira no celular, olho/PDF com nome acessível, linha de vazio); `project-invoice-details-window` 3/3 (caso novo: nome longo quebra no celular); vizinhos project-display, wallet-window, embedded-slide-screen, framed-overlay, project-adapter, task-display, agencia/financeiro, project-admin-responsible-section, task-flow-card e tarefas (reference, deep-link) — 14 arquivos/71 testes, todos passando. Suíte completa 1.875 ✓ / 72 ✗: os MESMOS 5 arquivos antigos (admin/produtos, admin/catalogo-produtos, admin/usuarios, iallka-floating-icon, user-view-slide-panel-permissions-tab) — 2 falhas a menos que antes por oscilação em admin/produtos e admin/usuarios, que não usam a tela do projeto. Typecheck do frontend limpo. Servidor sem mudança nesta rodada (nada a rodar). O jsdom não mede layout: o tamanho real foi medido no navegador (acima).

**Reteste Codex (proj_956; sem compra, pagamento, lançamento ou ajuste):** em 390×844, 768×1024 e 1480×800, como admin e Agência 1: (1) abas sem rolagem lateral (celular 3×3, tablet 2 linhas, desktop igual); (2) Produtos: barra, nome, selos, Contratação/Entrega visíveis sem rolar de lado; (3) Tarefas: busca, Lista/Kanban, itens, Filtros, paginação, situação e ações alcançáveis; (4) Faturamento: fatura em cartão com legendas, olho e PDF; resumo em 1 coluna; (5) olho → Detalhes da Fatura: sem rolagem lateral; X e Escape fecham só a janela e o projeto continua em Faturamento; (6) desktop 1480: comparar com o aprovado.

### Reteste Codex após T28 + Janela Moldura (01/11)

**Conferência pela interface, admin e Agência 1; proj_956 existente.** Somente leitura comercial: nenhuma compra/pagamento/lançamento/ajuste/cadastro/publicação. Login/logout normais; sidebar expandida e recolhida de volta; viewport de teste 1480×800 e390×844, override removido no final. Agência permanece autenticada em /agency/projetos/956, Faturamento. Nenhuma aplicação alterada, nenhum deploy. Testes automáticos relatados pelo Claude não foram reexecutados nesta rodada.

**Passou no recorte testado:**
- Comissões é Janela Moldura com1movimentação confirmada174,46, proj_956/Lamego. X fechou e reabriu; clique no fundo não fechou/não acionou Nova Fatura; sidebar expandiu/recolheu mantendo janela; Escape fechou (aguardar atualização da árvore antes de considerar resultado). Cabeçalho global não cobriu janela.
- Outro cartão (Bônus, vazio) e Projeções (Créditos futuros) abriram em Janela Moldura e fecharam pelo X.
- Extrato Lamego mostrou crédito1000+comissão174,46/saldo1174,46. Ajuste abriu por cima; Escape fechou só Ajuste, preservou Extrato. Nenhum campo preenchido nem confirmação financeira.
- Admin e Agência: cabeçalho Avulso + Mensal; Produtos SEO/Performance/Avulso e Manutenção/Soluções Web/Mensal; tarefasT015718/T015719 com4/2etapas, Para lançamento e Lançar até01/12/2026/Lançar em até30d.
- Ambos os perfis: Faturamento Cartão(teste), pago01/11, próxima01/12 e nota de emissão26/11 sem cobrança emitida. INV-2026-0016 paga2148,66; janela de detalhes comLamego/Teste cliente, vencimento—, SEO1540,22+Manutenção608,44. Escape fechou só fatura e projeto continuou em Faturamento.
- Log nos dois perfis: criaçãoLamego; tarefas/faturaSistema; pagamentoCliente final—pelo link; produtos/statusAutoria não registrada. Sem atribuir ao visualizador.

**Pendência nova, responsividade NÃO aprovada:** em390×844, largura da página390 (não há overflow global), mas existem rolagens horizontais internas: navegação das abas1223px em348px; Produtos552px em337px; tabela de Faturamento641px em291px. Conteúdo/ações exigem deslocamento lateral. Corrigir adaptação mobile preservando desktop, campos, dados e funcionalidades; não esconder ações/dados para mascarar. A janela da fatura abriu em tela estreita e Escape preservou o projeto; não foi feita auditoria exaustiva de todos os campos por scroll vertical. Abas com rolagem podem ser padrão existente, mas registrar/adaptar para cumprir roteiro sem rolagem lateral, sem presumir aprovação.

**Farol:** desktop administrativo e Agência aprovados neste recorte; responsividade amarela/pendente. T28 permanece não encerrado (também login com retorno pós-autenticação ainda não foi exercitado como teste específico). Placar macro14/28concluídos,14abertos: T09/T10/T25/T28parciais, T04/T16–T24bloqueados. Decisões comerciais/líder inexistente e falhas automáticas relatadas continuam pendentes; não considerá-las resolvidas por este teste visual.

Evidências privadas (não incluir no Git): pasta de visualizações desta sessão, arquivos T28-reteste-fatura.png, T28-reteste-mobile-log.png, T28-reteste-agencia-mobile-faturamento.png e T28-reteste-agencia-mobile-fatura.png. Próximo: Claude corrigir responsividade e devolver testes/documentação para Codex retestar, sem repetir compra.

### Correções do Claude — auditoria T28 + padrão de abertura (01/11, fim da noite)

Pedido: "Segunda rodada Codex → Claude: auditoria ADMIN T28" (passagem, itens 1–6) + complemento do usuário (Comissões em Janela Moldura e conferir as aberturas das demais telas do fluxo). **SOMENTE LOCAL**: sem commit/push/deploy/QA, sem compra/pagamento/lançamento/ajuste, nenhum dado gravado no banco real (só leitura do proj_956). O usuário ainda vai conferir; T28 só fecha depois do reteste do Codex.

| Item | Antes | Agora | Tipo | Arquivos |
|---|---|---|---|---|
| 4 + complemento — Comissões | Slide lateral (Sheet z-50) por baixo do cabeçalho global (z-90): notificações/perfil por cima do X; clicar em fechar falhava | **Janela Moldura** (`FramedModal`): fundo preto 60%/2px começando depois da sidebar; sidebar e seus botões livres; clique no fundo bloqueado e sem fechar; cabeçalho e X dentro da janela, acima do cabeçalho global; só o corpo rola; X/Escape fecham só a janela; reabre; tela de origem preservada | apresentação | `apps/frontend/app/admin/financeiro/wallet-window.tsx` (novo), `app/admin/financeiro/page.tsx` |
| Mesma tela (Carteiras) | Demais cartões de movimentação, Extrato da carteira e Projeções no mesmo slide; Ajuste manual em SlidePanel sem fundo | Todos em Janela Moldura. O Ajuste aberto de dentro do Extrato fica POR CIMA dele (Escape fecha um de cada vez); aberto pela lista, fica sozinho. Formulário e ação do ajuste iguais | apresentação | idem |
| 1 — Faturamento do projeto | "Carteira", "15/10/2025", "15/11/2025" fixos; card "Plano Mensal" supunha dia 15 e calculava a próxima cobrança a partir de hoje | Forma e data do último pagamento APROVADO; próxima cobrança = vencimento de fatura em aberto ou fim do período de assinatura ATIVA (agenda gravada), com nota; sem dado = "—". proj_956: Cartão (teste) · 01/11/2026 · 01/12/2026 ("fatura emitida em 26/11; nenhuma cobrança emitida ainda"). Nada disparado | apresentação + leitura nova no `GET /api/projects/:id/billing` (agenda das assinaturas sem valores; itens congelados do pagamento) | `components/project-management-modal.tsx`, `lib/project-display.ts` (novo), `apps/backend/src/routes/projects.ts` |
| Faturamento → olho | "Detalhes da Fatura" em slide lateral, montado com campos de demonstração (valor/mês/competência) que a fatura real não tem — abrir quebrava | Janela Moldura com número, valor, situação, vencimento, data do pagamento, forma e itens congelados (SEO R$ 1.540,22 + Manutenção R$ 608,44 = R$ 2.148,66). "Competência" saiu (não é gravada na fatura); IDs internos não aparecem | apresentação | `components/project-invoice-details-window.tsx` (novo) |
| 2 — Produtos | Nome e categoria "—" nos itens do catálogo novo (lia só o produto do catálogo antigo) | Nome/categoria congelados na compra (SEO — Otimização para Buscadores / Performance; Manutenção e Alteração de Site ou Loja Virtual / Soluções Web); catálogo antigo igual. Selo de modalidade por produto (Avulso / Mensal). Filtro "Tipo" (Avulso/Mensal) passa a comparar a modalidade. Data de contratação sem a reserva falsa "01/01/2000" | apresentação | modal + `lib/project-display.ts` |
| 3 — Log | Sem autoria | Autor só pelo que foi registrado: criador do projeto; "Sistema" para tarefas geradas pelo pagamento, fatura nascida do pagamento e cobrança recorrente; "Cliente final — pelo link de pagamento" (o link grava como solicitante o usuário da agência, mas quem pagou foi o cliente); demais "Autoria não registrada". **Nunca** o usuário que está vendo | leitura nova no `GET /api/projects/:id/log` | `apps/backend/src/routes/projects.ts`, `lib/agency-checkout.ts` + `routes/agency-payment-link.ts` (constante com o MESMO texto já gravado no pagamento do link), modal |
| 5 — Prazo na lista de tarefas | "01/12/2026 · Vence em 30d" sem dizer o que era | "Lançar até 01/12/2026 · Lançar em até 30d" + dica "Prazo para lançar a tarefa — não é o prazo de entrega". Data e regra iguais | apresentação | modal + `lib/project-display.ts` |
| 6 — Projeto misto | Cabeçalho "Avulso": vem do campo `lifecycle` do projeto, que a compra do catálogo novo não preenche (fica "avulso" por padrão) | Projeto do catálogo novo: o selo resume as modalidades dos produtos — "Avulso + Mensal" (ⓘ lista por produto). Projeto antigo mantém o tipo cadastrado. `lifecycle` NÃO foi gravado; contrato e recorrência intactos | apresentação | modal + `lib/project-display.ts` |
| Escape | Escape numa janela por cima também fechava a tela do projeto (Tela Slide) atrás | Tela Slide ignora o Escape que a janela de cima já usou | comportamento | `components/embedded-slide-screen.tsx` |

**Conferência das demais aberturas do fluxo testado (corretas, mantidas):** checkout "Criar projeto" = Painel Moldura; "Cadastrar consultor/cliente" = Janela Moldura; cesta do cabeçalho = Tela Slide global (padrão escolhido em 23/09); projeto, detalhe de tarefa e lançar tarefa = Tela Slide dentro do painel (`EmbeddedSlideScreen`); janelas comuns/confirmações com o fundo preto padrão; Nova/Editar fatura = `StandardModalDialog`; acordeões preservados.
**Slides antigos encontrados e NÃO convertidos** (fora do caminho testado; sem conversão indiscriminada — decisão do usuário): Projeto → Cofre → Compartilhar credencial; Tarefas → resumo do projeto → tarefa; detalhes/edição/compartilhar widgets do painel da Agência; Financeiro → Squad → ciclo atual.

**Testes:** Servidor (banco descartável `allka_test`, um arquivo por execução): `agency-link-contract` 5/5 (cenário 5 novo: agenda e itens reais no /billing; autoria no /log, inclusive "admin que vê nunca vira autor"); `catalog2-checkout` 28/28 rodado sozinho (rodando junto com a suíte de telas, 9 testes estouraram o tempo de transação de 5 s — só carga da máquina); `financial-billing-security` 21/21; `project-registered-contacts` 11/11; `project-archiving` 15/15; `catalog2-subscriptions` 8/8; `catalog2-e2e-scenarios` 10/10. `project-admin-responsible` 18/21: as 3 falhas são do motor de alertas (encerrar a ocorrência ao trocar/desativar o Admin e ao concluir a tarefa), que não foi tocado (sem alteração desde 01/10) — anteriores a esta rodada, não investigadas. Telas: novos/alterados `lib/project-display` 10/10, `wallet-window` 4/4, `project-invoice-details-window` 3/3, `embedded-slide-screen` 4/4 (o caso novo do Escape falha sem a correção); vizinhos framed-overlay, project-adapter, task-display, agencia/financeiro, project-admin-responsible-section e task-flow-card — 10 arquivos/56 testes; suíte completa 1.868 ✓ / 74 ✗ = as MESMAS 74 falhas e os mesmos 5 arquivos da rodada anterior (admin/produtos, admin/catalogo-produtos, admin/usuarios, iallka-floating-icon, user-view-slide-panel-permissions-tab), +18 testes novos passando. Typecheck limpo nos dois apps.

**Conferido no navegador interno** (sessão admin que o usuário já tinha aberto; viewport 1480×800; só abrir/fechar): Comissões com 1 movimentação AK$ 174,46 (proj_956/Lamego); fundo começa em 200 px e acompanha a sidebar recolhida (72 px) com a janela aberta; cabeçalho global coberto pelo fundo; X por cima de tudo; X e Escape fecham; reabre; Extrato da Lamego + Ajuste por cima (sem digitar nem confirmar), Escape fecha um de cada vez; proj_956: "Avulso + Mensal", Produtos, "Lançar até", Faturamento real, Detalhes da Fatura, Log com autoria e Escape REAL fechando só a fatura. A sidebar foi recolhida e expandida de volta ao estado original.

**Dados:** nada gravado. Leitura do proj_956: pagamento PAGO 01/11 (cartão teste) após 1 tentativa FALHOU; INV-2026-0016 paga; assinatura ativa da manutenção (período até 01/12, fatura prevista 26/11).

**Reteste Codex (proj_956 existente; sem compra, pagamento, lançamento ou ajuste):**
1. Admin → `/admin/financeiro` → Carteiras → cartão Comissões: Janela Moldura com 1 movimentação AK$ 174,46. Recolher/expandir a sidebar com a janela aberta; clicar no fundo (não fecha); X fecha; reabrir; Escape fecha. Repetir em outro cartão e em Projeções.
2. Carteiras → linha Lamego Academy → Ver extrato → Ajuste: abre por cima do extrato; Cancelar/Escape fecha só o ajuste. NÃO confirmar ajuste.
3. `/admin/projetos` → proj_956: cabeçalho "Avulso + Mensal" (ⓘ por produto); Produtos com nome/categoria/modalidade; Tarefas "Lançar até 01/12/2026 · Lançar em até 30d" (NÃO lançar).
4. Faturamento: Cartão (teste) · 01/11/2026 · 01/12/2026 + nota; olho da INV-2026-0016: Janela Moldura (Lamego Academy, Teste cliente, Cartão (teste), vencimento —, pago 01/11/2026, 2 itens); Escape fecha só a janela.
5. Log: Projeto criado → Lamego Academy; Tarefas geradas e fatura → Sistema; Pagamento aprovado → Cliente final — pelo link; produtos/status → Autoria não registrada.
6. Repetir 3–5 como Agência 1 (`/agency/projetos`) e em tela estreita/celular.

### Adendo visual solicitado pelo usuário (01/11)

Comissões deve usar **Janela Moldura (`FramedModal`)**, não slide lateral: overlay preto60%/blur2px, sidebar livre e fundo bloqueado, cabeçalho/X sem sobreposição global, somente corpo rolável e origem preservada. Conferir cada abertura durante os testes e registrar divergências para Claude corrigir antes do reteste Codex. Preservar painéis/accordions corretos; sem refatoração indiscriminada. Pedido detalhado na passagem, segunda rodada item4. Este adendo não implementa a correção nem aprova T28.

### Auditoria ADMIN T28 após usuário entrar (01/11; atualização mais recente)

**Usuário autenticou manualmente como Vinicius/Administrador Master.** Não foi testado o envio do formulário de login/retorno pós-login pelo assistente (usuário chegou ao dashboard); redirecionamento sem sessão com returnTo correto já foi conferido antes.

Conferência pela interface:
- /admin/projetos →956: nome do projeto, Teste cliente, Lamego Academy Agency·Partner, EmAndamento, totalR$2148,66 corretos.
- Projeto>Tarefas: duas novas T015718/T015719,4/2etapas, ambas Para lançamento; SEO primeira etapa Pendente e seguintes Bloqueadas/Aguarda anterior. Não lançadas.
- Projeto>Faturamento:1fatura INV-2026-0016, Pago2148,66. /admin/financeiro confirmou a mesma fatura e Pagoem01/11/2026.
- /admin/financeiro>Carteiras>Comissões: **1movimentação,174,46, Confirmado,01/11/2026às18:57, Comissão da contratação proj_956, Agência Lamego Academy**. Carteira1174,46 e carteira de plataforma1974,20 conferidas na lista. Sem ajustes/transferências.
- Log registra projeto criado, produtos adicionados, pagamento aprovado, fatura, tarefas geradas e status do projeto. Não mostra autoria.

**T28 🔴 não homologado; problemas novos para Claude:**
1. Projeto>Faturamento: ÚltimaFormaCarteira/ÚltimoPagamento15/10/2025/PróximaCobrança15/11/2025. São literais fixos em `apps/frontend/components/project-management-modal.tsx` (trecho4737–4754), não valores do pedido. Substituir por fonte real; se não houver informação confiável, mostrar indisponível/—. Não inventar data/modalidade nem disparar renovação.
2. Projeto>Produtos: duas linhas com nome e categoria—. Mesmo componente (mapeamento perto448) lê só pp.product?.name/category; contratação catalog2 precisa snapshot preservado. Não consultar matriz atual para reescrever contratado e não criar/alterar vínculo de banco para disfarçar.
3. Log: não indica quem fez ação; exibir ator registrado e diferenciar automação/Sistema quando a evidência permitir, sem atribuir eventos ao admin que está visualizando.
4. Janela lateral de comissões: cabeçalho global/notificações/perfil aparecem em cima do cabeçalho da janela, conforme captura. Clique emClose não fechou; Escape fechou. Corrigir empilhamento/fechamento preservando padrões existentes e sidebar permitida.
5. Clareza de prazo: tarefas ainda não lançadas exibem01/12/2026/Venceem30d. Fonte lida no código é lancamento_expires_at quandoPARA_LANCAMENTO. Não é prazo comercial de entrega; identificar como prazo para lançamento. NÃO alterar prazo ou iniciar contagem de execução.
6. Cabeçalho do projeto misto dizAvulso, embora haja manutenção mensal. Investigar escopo do badge e representar modalidades por produto sem mudar contrato/recorrência.

Evidências privadas: T28-admin-faturamento.png, T28-admin-produtos-sem-nome.png, T28-admin-tarefas-prazo.png, T28-admin-log.png e T28-admin-comissao.png na pasta de visualizações já registrada. Sem edição de aplicação/cadastro, compra, pagamento, nova credencial ou lançamento. Sessão admin mantida disponível.

**Placar macro continua14concluídos/14abertos:** T28comdefeitos;3parciaisT09/T10/T25;10bloqueadosT04/T16–T24. Correções anteriores do Claude continuam aprovadas no recorte da Agência/pagamento; não foram desfeitas.

### Fechamento T13 — consulta SEM LOGIN após reabrir (01/11; mais recente)

Navegador voltou acessível. Abriu /admin/projetos em aba nova: redirecionou para /login?returnTo=%2Fadmin%2Fprojetos (sem sessão). Recarregou o link de pagamento existente: carregou normalmente com SEOqtd1/dezpáginas+concorrentes/avulso e manutençãoqtd2agrupadas/mensal, total2148,66, pagamento confirmado, sem comissão/custo/acessos ou novo botão de pagar. Captura privada reteste-pagamento-sem-login.png na pasta de visualizações já registrada. Nenhum pedido/link novo criado, nenhuma gravação comercial ou novo pagamento.

**T13 🟢 concluído no escopo previsto; placar14/28concluídos,14nãoencerrados** (T09/T10/T25/T28parciais; T04 e T16–T24bloqueados). T28 validou apenas o pedido de login e destino preservado; falta o usuário entrar como admin para conferir pedido/fatura/auditoria pela tela. Não tentar de novo credencial antiga recusada nem redefinir/criar token. Aba de login deixada para o usuário. Nenhuma regra comercial pendente foi decidida pelo assistente, nenhuma tarefa lançada.

### Reteste Codex DEPOIS das correções do Claude (01/11; atualização mais recente)

- **🟢 Apresentação1/2/4/5:** Agência1 autenticada, ambas T015718/T015719: código operacional correto, Teste cliente presente, Consultor Teste separado de Líder Sem líder atribuído, status Para lançamento e Fluxo: Aguardando lançamento. Recorrência mensal e lote2 na manutenção preservados. Lista com Cliente correto; seletor permitiu mostrar Consultor e Líder separadamente, com Teste/—. Restauradas as duas colunas ocultas como estavam antes.
- **🟢 Apresentação3:** lista de projetos mostra Lamego Academy Agency · Partner, inclusive no proj_956.
- **🟢 Apresentação6 autenticado:** link de pagamento existente abriu com cabeçalho degradê legível, SEOquantidade1/dezpáginas+concorrentes/avulso e manutençãoquantidade2 entregues juntas/assinatura mensal. Total2148,66 e pagamento confirmado. Sem comissão/custo/acessos na página. Não houve clique de pagar nem pedido novo. Captura reteste-claude-pagamento.png.
- **🟢 Aviso7 presente, regra NÃO resolvida:** financeiro mostra nota sobre faturas ainda não listadas para agência, comissão na Carteira; saldo1174,46. Visibilidade de faturas continua decisão do usuário.
- **🟢 Correção9 dentro do Programa Partner:** topo e Métricas do Partner mostram0/Bronze; widget Programa Partner0enviados/pendentes/aceitos/ativos. **🟡 Fora desse recorte:** À receber continua demonstrativo129.674.553,00; dashboard Agency também mostrou127projetos/83tarefas fictícios. Não homologar painel financeiro geral.
- Saiu da agência pelo menu normal e recarregou a página pública para verificar SEM sessão. A primeira leitura estava carregando; na retomada a ferramenta informou **controle de navegador desativado**. Não foi possível concluir essa prova deslogada. Não contornar nem repetir pagamento.
- Sem alterações em código, cadastro, regra ou banco financeiro. Login/logout e preferências de colunas temporárias apenas; preferências restauradas. Sem novas contas, publicação, lançamento, deploy ou QA. Placar macro permanece13/28concluídos,15nãoencerrados.
- Pendências: concluir página pública deslogada; usuário entrar admin paraT28; decidir comissão recorrente/pagador, faturas da agência, centavo e líder inexistente da manutenção contratada. Não publicarV2 para tentar corrigir snapshot já contratado, nem atribuir líder sem decisão. Não lançarT015719.
- Evidências privadas em `C:/Users/Teste/.codex/visualizations/2026/08/12/019ff5b6-bd52-7670-bec9-b64609421f78/`: reteste-claude-T015718.png e reteste-claude-pagamento.png. Não guardar URL/token no Git.

---

Esta seção supera os placares históricos acima. O usuário pediu que o assistente faça os cliques/testes; não precisa aguardar aprovação entre cada teste. Autorizou separadamente o pedido e pagamento **simulados locais** abaixo, sem lançamento. Nenhum código de aplicação alterado nesta rodada; nenhum deploy/QA/publicação/exclusão.

### Resultado e dados criados

- Login normal na Agência 1 Lamego Academy, usando credenciais previamente fornecidas pelo usuário (não registrar senha).
- SEO V1 publicada: padrão R$933,47; até dez páginas R$1.244,62; adicional concorrentes R$1.400,20; prazo cinco dias. V2 com +1 dia não vazou. Cesta/checkout e snapshot contratado mantiveram os valores/impactos.
- Produto 2 V1: Mensal 2%, base R$292,85, primeira cobrança/renovação R$286,99. Quantidade 2: cotação R$574,00 (cálculo parte do valor de precisão interna, não multiplicar o unitário já arredondado).
- Projeto criado pela moldura dentro do checkout: **proj_956 — [TESTE CODEX 01-11] Contratação SEO**. Consultor existente Teste; cliente existente Teste cliente. E-mail do consultor veio automaticamente. Retorno selecionou projeto e preservou cotação/comissão. Reabertura pela lista comprovou persistência e, antes da compra, status Rascunho. Portfólio desmarcado; nenhum novo usuário/cliente criado.
- Dois formulários auxiliares (consultor/cliente) abertos e cancelados; nome do projeto preservado. Consultor tem senha/confirmar e mostrar em ambos. Salvar projeto sem os vínculos explicou o que faltava; formulário de validação descartado.
- Simulação de comissão total 10% sobre R$1.400,20 = R$140,02; total R$1.540,22. Alternar total/por produto preservou taxas independentes. Cenário de duas linhas: SEO 10% = R$140,02; manutenção quantidade 2, base R$574,00, comissão 6% = R$34,44; total do cliente **R$2.148,66**, comissão **R$174,46**, plataforma **R$1.974,20**.
- Após autorização explícita no chat: aceitou termos locais e confirmou pedido no proj_956. Link do cliente testado: final 0002 recusou por saldo; final 4242 aprovou. Gateway confirmado no banco **FAKE_SANDBOX**. Página recarregada mostra pagamento confirmado, sem novo botão de pagar.
- Consulta somente leitura no banco confirmou: duas tentativas (uma FALHOU e uma PAGO), **uma fatura paid**, **um crédito de comissão R$174,46** e um crédito da plataforma R$1.974,20. Carteira da agência passou AK$1.000,00 → **AK$1.174,46**.
- Duas tarefas novas: **T015718** SEO quantidade 1 e **T015719** manutenção quantidade 2 agrupada. Ambas **PARA_LANCAMENTO**. Nenhuma foi lançada/atribuída/distribuída. SEO tem quatro etapas; variação somou duas horas à etapa on-page (5h) e adicional somou uma à auditoria (3h). Contratados usam **V1 publicada** dos dois produtos, não V2.
- Assinatura da manutenção ativa: mensalidade base congelada R$574,00, implantação zero, ciclo 0. Renovação com comissão precisa de investigação descrita abaixo; não disparado worker no banco real.

### Farol completo do roteiro (aprovação do usuário ainda não é homologação geral)

| Testes | Estado | Limite/evidência |
|---|---|---|
| T01–T03 | 🟢 | Registros anteriores preservados; T02 restaurou 2%. |
| T04 | ⏸ | Falta sessão Nômade/Líder; não há Líder nem Nômade operacional habilitado. Não promover/criar sem pedido. |
| T05–T08 | 🟢 | Catálogo V1, opções/cesta, Mensal 2%, projeto dentro do checkout e persistência conferidos. |
| T09 | 🟡 | Abrir/cancelar ambos auxiliares e preservar formulário passou; criação completa de credencial/contato não executada. |
| T10 | 🟡 | UI mostrou consultor Teste e dois clientes próprios; ainda falta cenário negativo com empresa alheia pela tela. |
| T11–T12 | 🟢 | Total e por produto, quantidade 2 e taxas preservadas conferidos; valores no pedido/banco coincidiram. |
| T13 | 🟡 | Recusa/aprovação/split passaram de verdade no sandbox. Faltam detalhes comerciais/contraste da página pública e acesso deslogado (interrompido). |
| T14–T15 | 🟢 | Reabrir pagamento não ofereceu pagar; banco sem segunda fatura/comissão; duas tarefas novas paradas. |
| T16–T24 | ⏸ | Não lançadas; dependem de autorização de lançamento e Líder/Nômade operacionais. Teste automático não equivale a homologação dos portais. |
| T25 | 🟡 | Assinatura gravada; falta tela de renovação/implantação e esclarecer comissão recorrente. |
| T26–T27 | 🟢 AUT | Ciclos 9/9, assinaturas 8/8, continuidade 5/5 em bancos descartáveis, um arquivo por execução. Não rodar worker no allka. |
| T28 | 🟡 | Link sem sessão levou a login?returnTo=/admin/projetos. Credencial antiga de admin documentada foi recusada, sem nova tentativa/alteração. Falta concluir login e auditoria visual admin. |

**Placar: 13/28 concluídos no escopo descrito; 15 ainda não encerrados**: 5 parciais (T09/T10/T13/T25/T28) e 10 bloqueados (T04 e T16–T24). AUT dos ciclos não representa teste de meses reais pela tela.

### Problemas observados para o Claude corrigir sem redesenhar

1. **Consultor não é Líder:** detalhe da nova T015718 mostra LÍDER = Teste e CONSULTOR / LÍDER = Teste, embora Teste seja consultor e não haja Líder ativo. Não alterar papéis nem atribuição; separar rótulos/fontes e mostrar sem Líder quando não houver.
2. **Cliente da tarefa vazio:** lista das duas novas tarefas mostra CLIENTE —, apesar de proj_956 ter Teste cliente selecionado e persistido. Fazer a apresentação resolver o vínculo certo, sem inventar associação e sem mexer na matriz.
3. **Tipo de empresa incorreto:** lista de projetos mostra Lamego Academy Company, enquanto conta responsável é AGENCY. Banco proj_956 agency_id preenchido/company_id nulo. Resolver categoria real para o badge, não só renomear texto fixo.
4. **Estado contraditório na tarefa:** cabeçalho exibiu simultaneamente Para lançamento e Em lançamento; banco/lista estavam PARA_LANCAMENTO. Conferir se a segunda etiqueta vem do estado da etapa e explicar/separar escopos; não marcar tarefa lançada só por comprar.
5. **Página pública de pagamento:** só título dos produtos e total; não informou claramente quantidade 2, modalidade mensal/recorrência nem escolhas SEO. Cabeçalho Pagamento da contratação/Allka ficou branco quase invisível no fundo branco na captura. Preservar privacidade (sem custo/comissão/acessos) e estilo existente, incluir resumo comercial legível.
6. **Identificador inconsistente:** tarefa na URL/lista T015718, detalhe mostra tarefa-127. Priorizar código operacional, deixar referência técnica fora do título comercial.
7. **Financeiro da agência:** carteira correta com crédito; página Financeiro mostrou 0 faturas e total pago 0, embora banco tenha uma fatura paid de proj_956. Investigar escopo agência x company/pagador cliente antes de classificar como erro; explicar corretamente se existe separação de pagador.
8. **RENOVAÇÃO com comissão (investigar, não inventar regra):** manutenção cliente pagou R$608,44; assinatura monthly_amount=574 e cronograma congelado não inclui os 6%. `catalog2-subscription-core.ensureSubscription` prioriza recurring_price_snapshot, `amountForSubscriptionCycle` usa schedule/discount. Criar regressão em banco descartável para renovação mensal via cliente final com comissão por produto, conferir cobrança e split e explicitar decisão pendente se comissão só inicial/recorrente não estiver definida. NÃO disparar renovação no banco real nem cobrar diferença automaticamente.
9. **Dados de demonstração no dashboard Partner:** topo exibe 124 indicações/38 clientes/Diamond, widget abaixo exibe 0/Bronze; já observado na entrada. Fora do pedido específico de checkout, mas não apresentar esses números como resultado real do teste.

### Interrupção e próximo passo

- Depois da conferência da carteira, saiu da agência para T28; admin recusou credencial antiga do README. Não pediu senha, não redefiniu, não adivinhou.
- Ao tentar conferir link público após logout, ferramenta informou **Local browser use is disabled in Work settings**. Parar controle do browser; não contornar com outra automação. Habilitar controle e entrar como admin pelo próprio usuário para fechar T28. O link público foi recarregado antes, ainda com sessão, e já estava pago; não declarar teste anônimo concluído.
- Checkout/cesta de teste foram consumidos normalmente ao confirmar. Não apagar proj_956: é evidência de sandbox e não há estorno automático. Preservar V1/V2 e proj_955/T015717.
- Próximo: Claude corrige/apresenta investigação dos itens acima, atualiza os 16 testes de catálogo antigos, registra mudanças neste mesmo documento e RETOMAR-AQUI; Codex retesta a partir de proj_956 sem comprar/lançar de novo automaticamente. Sem commit/push/deploy/espelho.
- Capturas privadas: pasta `C:/Users/Teste/.codex/visualizations/2026/08/12/019ff5b6-bd52-7670-bec9-b64609421f78/`: T08-projeto-retorno-checkout.png, T07-agencia-mensal-2pct.png, T12-comissao-por-produto.png, T13-pagamento-simulado-confirmado.png, T13-carteira-comissao.png, T15-etapas-snapshot.png. A última pegou viewport estreita; não usar como prova de layout desktop. Não salvar link/token de pagamento nem credenciais no Git.
- Rodada inicial das três suítes juntas compartilhou banco e produziu 21/22 (interferência entre arquivos, PLAC/classificações/scheduler); execução correta isolada, um banco por arquivo, confirmou **22/22**. Não é uma correção de produto; não ocultar a tentativa nem classificar como defeito do fluxo sem reprodução isolada.

### Regressão automática final nesta rodada (01/11)

**120/120 passaram**, cada arquivo em banco descartável independente, removido ao final. Nenhum worker executado no banco local de cadastros. Arquivos de teste existentes, sem mudanças:

| Suíte | Resultado |
|---|---|
| catalog2-delivery-cycles | 9/9 |
| catalog2-subscriptions | 8/8 |
| catalog2-continuity | 5/5 |
| catalog2-checkout | 28/28 |
| catalog2-implementation-billing | 13/13 |
| task-release-orchestration | 34/34 |
| task-rotation | 19/19 |
| qualificacoes | 4/4 |

Comando em apps/backend: `node --import tsx scripts/run-db-tests.ts src/routes/<nome>.integration.test.ts`, com TEST_DATABASE_URL e TEST_DATABASE_ADMIN_URL apontando ao **allka_test local**, nunca allka. Rodar um arquivo por chamada. As mensagens de erro esperadas de cenários de rollback/recusa não são falha quando o teste correspondente passa. Estes resultados NÃO cobrem os problemas visuais nem comissão nas renovações da contratação por link (regressão específica ainda necessária).

### Correções e investigações do Claude — 01/11 (noite), sobre o proj_956

> Pedido do usuário: corrigir os 6 problemas e investigar 7–9 sem inventar regra; revisar os 16 testes antigos do catálogo; regressões um arquivo por execução em banco descartável. **Somente local.** Nenhum commit, push, deploy, espelho, QA, publicação, compra, pagamento, lançamento, exclusão, criação/promoção de usuário ou mudança de preço/tarifa/hora/prazo/ID/credencial/papel.
> Situação: IMP + AUT (+ VIS só na página pública). Nada tem aprovação do usuário (USU) — o Codex confere pela tela.

#### O que foi feito, item a item

| # | Problema | Causa encontrada | Tipo | O que mudou (arquivos) | Prova |
|---|---|---|---|---|---|
| 1 | Consultor "Teste" aparecia como LÍDER e "CONSULTOR / LÍDER" | Detalhe e lista liam `project.consultant` (texto do consultor) nos campos de Líder | Apresentação (fonte errada) | Backend `apps/backend/src/routes/project-tasks.ts` (lista e detalhe passam a trazer `project.consultant_user` e `lider_responsavel` da tarefa). Frontend `apps/frontend/lib/task-display.ts` (novo: fontes únicas), `components/tarefa-detail-drawer.tsx` (resumo: **Consultor** e **Líder** separados; sem líder = "Sem líder atribuído"; cartão Projeto: "Consultor"; cartão Responsáveis ganha Líder quando houver), `app/admin/tarefas/page.tsx` (coluna/filtro **Líder** = líder da tarefa; nova coluna **Consultor**, oculta por padrão — o layout padrão não muda). Nenhum papel/atribuição alterado | AUT |
| 2 | CLIENTE "—" nas tarefas novas | Tarefas liam só o cliente legado `project.client_id` (nulo no proj_956); o cliente escolhido fica em `project.client_record_id` ("Teste cliente") | Apresentação (vínculo existente não lido) | `project-tasks.ts` traz `project.client_record`; `task-display.ts` resolve cliente legado OU cadastro do projeto; drawer e lista (coluna, busca, filtro "Empresa", ordenação) usam essa fonte. Nada inventado, matriz intocada | AUT |
| 3 | Lista de projetos mostrava Lamego Academy como "Company" | `lib/project-adapter.ts` caía num `"company"` fixo quando `company_type` é nulo | Apresentação (texto fixo) | `project-adapter.ts`: categoria pelo vínculo real (`agency_id` → Agency; `company_id`/cliente legado → Company; sem vínculo → sem selo); `companyIsPartner` = perfil Partner **ativo** da agência. `apps/backend/src/routes/projects.ts` (lista e detalhe trazem `agency_owner.partner_profile.status`). `app/admin/projetos/page.tsx`: selo "Agency · Partner". `company_type` NÃO foi gravado | AUT |
| 4 | Cabeçalho com "Para lançamento" e "Em lançamento" juntos | O 1º é o status gravado da tarefa; o 2º é a **situação do fluxo** derivada (`lib/task-flow-state.ts`), que tratava PARA_LANCAMENTO como "em lançamento" | Apresentação (estado derivado impreciso). Comprar não lança: status e banco seguem PARA_LANCAMENTO | `task-flow-state.ts`: novo estado derivado `aguardando_lancamento` ("Aguardando lançamento — contratada; nada distribuído"); `components/task-flow-card.tsx`: o chip diz o escopo ("Fluxo: …") | AUT |
| 5 | Detalhe mostrava "tarefa-127" | Chip lia `code_snapshot` (código do modelo do catálogo) | Apresentação | Drawer usa o código da tarefa no **mesmo formato da lista** (`tar15718` = T015718 do endereço; o original aparece ao passar o mouse). `code_snapshot` só para tarefa antiga sem código | AUT |
| 6 | Página pública: cabeçalho branco sobre branco; só título e total | Variável do tema não existe fora do portal logado; a rota só devolvia nome/total/modalidade | Apresentação | `apps/backend/src/lib/agency-checkout.ts` (`publicPaymentItems`: quantidade, lotes, modalidade, meses e opções lidos da cotação congelada e da versão contratada) + `routes/agency-payment-link.ts`; `components/catalog2/agency-client-payment.tsx` (degradê de reserva + texto branco; por linha: quantidade, avulso/assinatura mensal e renovação, opções). Comissão, custo, projeto e acessos **não** saem (teste confere as chaves) | AUT + **VIS** (proj_956 real, já pago, sem clicar em nada) |

**Conferência visual (VIS) da página pública do proj_956:** cabeçalho com degradê e texto branco; SEO "Quantidade: 1 · Avulso — pagamento único… · Opções contratadas: Quantidade de páginas — demonstração: Até 10 páginas — demonstração · Análise comparativa de concorrentes — demonstração"; Manutenção "Quantidade: 2 · entregues juntas · Assinatura mensal — este pagamento cobre o primeiro mês; a assinatura renova a cada mês."; total R$ 2.148,66; "Pagamento confirmado", sem botão de pagar. O link assinado foi gerado só para esta leitura (leitura do banco, nada gravado) e não foi guardado.

#### Investigações (7–9) — sem mudar regra

- **7. Faturas no Financeiro da agência.** A fatura do proj_956 existe (`INV-2026-0016`, paid, R$ 2.148,66), mas nasce com `company_id` nulo (`confirm-payment.ts` grava `project.client_id`) e a rota `GET /billing/invoices` devolve **lista vazia para qualquer agência, de propósito** (comentário no código: "não existe vínculo legítimo entre agência e Invoice.company_id"). Consequência: hoje nem um pedido pago pela PRÓPRIA agência apareceria. **Não mudei a regra** (é permissão financeira). A tela agora explica: "As faturas dos pedidos da agência ainda não aparecem nesta lista… a comissão da agência entra na Carteira, em Allkoins" (`app/agencia/financeiro/page.tsx`). **Decisão pendente** abaixo.
- **8. Comissão na renovação mensal.** Regra documentada (`docs/regras-de-negocio.md`, Comissões, 28/10): comissão do link "só após pagamento confirmado, uma vez por pagamento"; `docs/plano-operacao-coordenada-qa.md` registra que **"cobrança recorrente futura com comissão… não foi implementada"**. Comportamento atual, provado no teste novo: 1ª cobrança = base + comissão por linha, split plataforma × agência correto, crédito único; a assinatura congela só a base (`monthly_amount` = 574); a renovação emite fatura da **base, sem comissão, sem crédito de comissão e sem split**, também sem vínculo com a agência e sem link para o cliente. Cálculo real (função pura, sem tocar o banco) da próxima renovação do proj_956: **R$ 573,99** (1º mês foi R$ 574,00 — arredondamentos em ordens diferentes; os testes antigos aceitam até 3 centavos). Nada disparado no banco real. **Decisões pendentes** abaixo.
- **9. Painel Partner.** Os cartões do topo liam `dashboardData.partnerProgram` (números de demonstração escritos no código: 124 convites, 38 clientes, Diamond, R$ 22,4 mil) e calculavam "a receber"/"pago no mês" com proporções inventadas (28%/45%); o widget de métricas lia a API real (0/Bronze). Agora topo, widget de métricas e widget "Programa Partner" (e o detalhe dele) usam a mesma fonte real — `lib/partner-program-metrics.ts` (ausente = 0; sem dado = "—"). `app/partner/dashboard/page.tsx` alterado só nesses pontos. **Ainda demonstrativos** no painel Partner (fora deste item): receita, CMV, tarefas, usuários, ranking etc. Observação: o widget "Programa Partner" do painel da **agência** usa `GET /agencies/partner-stats`, que soma o programa da plataforma inteira (não só a conta) — não alterado.

#### 16 testes antigos do catálogo — alinhados, sem afrouxar

- `components/catalog2/catalog2-store.test.tsx` (12/12): o teste abria o produto em `/company/catalog2` sem a rota do produto (o detalhe nunca abria) → agora usa o endereço real `/company/catalogo-produtos/:produtoId`; etapas "1/2/3" viraram o painel único "Configure sua contratação"; o seletor "Todos os pilares" virou abas de categoria (pilar do endereço continua indo ao backend). Assinatura nova do configurador (5º argumento). Distribuição 1+1+3 conferida no que vai ao servidor (o texto "Total distribuído" saiu da tela no redesenho).
- `components/catalog2-product-detail.test.tsx` (12/12; 1 cenário novo): título pelo `h1`; simulação agora envia `addon_selections`; regras de 24/09 (commit 6771aba): admin comum bloqueado com aviso exato, Master contrata em nome da conta, produto `ready_for_client=false` nunca contrata; memória de cálculo saiu do detalhe (fica no Catálogo/Cadastro, coberta em `catalog2-pricing-memory-popover.test.tsx`); marcas de provisório atuais (aviso geral, selo do painel, "provisória" nas opções, selo por tarefa).
- **Três defeitos reais de tela achados por esses testes e corrigidos (mudança mínima, sem redesenho):** (a) na lista do catálogo, "Novo" escondia "Pausado"/"Pré-lançamento" — agora o status indisponível vence (`lib/catalog2-status.ts`: "visível com etiqueta própria"); (b) na visão em lista, motivo da indisponibilidade e "Falta: …" (prévia) não apareciam — agora aparecem sob a etiqueta (`components/catalog2/catalog2-store.tsx`); (c) no detalhe do cliente, "Pré-lançamento" aparecia como "Em preparação" — o cabeçalho usa o status real (`components/catalog2-product-detail.tsx`). Também ganharam nome acessível os campos "Unidades da tarefa N" (sem mudança visual).

#### Testes executados (01/11 noite)

**Backend — 16 arquivos, 195 testes, 0 falhas.** Cada arquivo numa execução própria, com banco descartável `allka_test_*` criado e apagado pelo runner (`npx tsx scripts/run-db-tests.ts src/routes/<arquivo>` em `apps/backend`, com TEST_DATABASE_URL/TEST_DATABASE_ADMIN_URL no `allka_test` — linha 78 do README). Typecheck backend limpo.

| Suíte | Resultado | Observação |
|---|---|---|
| **agency-link-contract (NOVA)** | 4/4 | cenário do proj_956: link público (o que mostra e o que não mostra), fontes de cliente/consultor/Líder nas tarefas, fluxo "aguardando lançamento", categoria Agency·Partner, mensal por link com comissão por produto + renovação (comportamento atual) |
| catalog2-packages | 9/9 | asserção do fluxo alinhada: recém-comprada = `aguardando_lancamento`; EM_LANCAMENTO continua `em_lancamento` |
| catalog2-checkout | 28/28 | |
| catalog2-implementation-billing | 13/13 | |
| catalog2-subscriptions | 8/8 | |
| catalog2-delivery-cycles | 9/9 | |
| catalog2-continuity | 5/5 | |
| catalog2-period-renewal | 4/4 | |
| catalog2-e2e-scenarios | 10/10 | |
| task-release-orchestration | 34/34 | |
| task-rotation | 19/19 | |
| qualificacoes | 4/4 | |
| project-registered-contacts | 11/11 | |
| task-visibility | 4/4 | |
| financial-billing-security | 21/21 | |
| launch-sessions | 12/12 | |

**Frontend.** Typecheck limpo. Testes novos/alterados: `lib/task-display.test.ts`, `lib/partner-program-metrics.test.ts`, `lib/project-adapter.test.ts` (+5), `components/catalog2/agency-client-payment.test.tsx` (+1), `components/task-flow-card.test.tsx` (novo), `app/agencia/financeiro/page.test.tsx` (novo) = **25/25**. Catálogo antigo: `catalog2-store.test.tsx` **12/12** e `catalog2-product-detail.test.tsx` **12/12** (eram 16 falhas). **Suíte completa: 210 arquivos — 1.850 passam / 74 falham**, todas em arquivos que não usam nada desta rodada: `app/admin/produtos/page.test.tsx` (35 rodando sozinho; 36 na rodada cheia por tempo), `app/admin/catalogo-produtos/page.test.tsx` (29), `components/iallka-floating-icon.test.tsx` (2), `components/user-view-slide-panel-permissions-tab.test.tsx` (1) — da lista de falhas antigas — e `app/admin/usuarios/page.test.tsx` (5 sozinho; 6 na rodada cheia): página e teste iguais ao commit de 28/10, sem import de nada alterado aqui; fica fora da lista antiga porque o comando de referência não roda essa pasta. **Não investigado nesta rodada.**

#### Dados alterados

**Nenhum dado do banco real `allka` foi alterado.** Só leituras (proj_956, tarefas, etapas, cotações, assinatura, faturas, Produto 2). A renovação foi calculada com a função pura sobre uma cópia dos valores congelados (arquivo temporário apagado). Testes de banco: cada arquivo no próprio `allka_test_*`, criado e apagado pelo runner. Nenhum worker/scheduler no banco real.

#### Achados novos (não corrigidos — dependem de decisão)

- **Produto 2 V1 (publicada):** a etapa "Análise de Briefing e Acessos" tem Líder **específico** `qa-user-leader`, id que **não existe** no banco local (veio do ambiente QA). A T015719 herdou esse líder na etapa 1 → ao lançar, a etapa vai **travar** com o aviso de líder indisponível. Na V2 (rascunho) essa etapa já está com líder automático. Não alterei V1 (publicada) nem a tarefa contratada.
- **Renovação R$ 573,99 × 1º mês R$ 574,00** (item 8).

#### Decisões que dependem do usuário

1. **Comissão na renovação:** só na 1ª cobrança ou também em cada mês? Se recorrente: quem paga a renovação (cliente final por novo link mensal, ou a agência) e se a mensalidade do cliente é base + %.
2. **Faturas da agência:** a agência deve ver (só leitura) as faturas dos pedidos dos projetos dela — inclusive as pagas pelo cliente final, marcadas "paga pelo cliente"? (Hoje ela não vê nenhuma, nem as que ela mesma paga.)
3. **Líder `qa-user-leader` na V1 do Produto 2:** publicar a V2 (líder automático), escolher um Líder real no lançamento, ou outra saída — antes de lançar a T015719.
4. **Arredondamento da renovação** (1 centavo): manter o cálculo do cronograma ou cobrar exatamente a mensalidade congelada.
5. Pendentes de antes: Líder/Nômade operacionais (L5), "nômade específico" (L2), Líder que executa e qualifica a própria etapa.

#### Próximo clique e roteiro para o Codex retestar no proj_956 (sem comprar, pagar ou lançar)

1. Admin ou Agência 1 → `/agency/tarefas` (ou `/admin/tarefas`) → abrir **T015718**: chip do código `tar15718` (passar o mouse: "original: T015718"); "Para lançamento" + chip "Fluxo: Aguardando lançamento" (nunca "Em lançamento"); resumo com **Cliente = Teste cliente**, **Consultor = Teste**, **Líder = Sem líder atribuído**; cartão Projeto com "Consultor" (não "Consultor / Líder").
2. Mesma lista: coluna **Cliente** = "Teste cliente" nas duas tarefas; ativar a coluna **Consultor** no seletor de colunas → "Teste"; coluna **Líder** (se ativa) vazia.
3. Abrir **T015719**: mesmas conferências; aba Etapas mostra a etapa 1 com líder específico (achado acima) — **não lançar**.
4. `/agency/projetos` → linha do proj_956: coluna Empresa com selo **"Agency · Partner"**.
5. Página pública do proj_956: a tela só oferece o link para pedido **não pago** (o checkout diz "Este pedido já foi pago…"); o link usado no pagamento de 01/11 vale 24 h (até ~21:55 de 02/11) — se ainda estiver no histórico do navegador, abrir em janela anônima e conferir: cabeçalho legível; quantidade/modalidade/opções; total R$ 2.148,66; "Pagamento confirmado"; nenhuma comissão/custo. Sem o link, não gerar outro pedido para isso: a conferência visual já foi feita pelo Claude (acima) e o teste automático cobre o conteúdo.
6. Agência 1 → `/agency/financeiro`: nota explicando por que não há faturas e onde está a comissão (Carteira AK$ 1.174,46).
7. Agência 1 (Partner) → `/partner/dashboard`: topo e widgets com os mesmos números reais (sem 124/38/Diamond).
8. Catálogo da agência: um produto pausado/pré-lançamento (se houver) mostra a etiqueta e o motivo; nada a alterar no cadastro para isso.
Depois: T28 (admin/auditoria, com o usuário entrando como admin), T09/T10/T13/T25 parciais; T04 e T16–T24 continuam dependendo de Líder/Nômade operacionais e de autorização de lançamento.
