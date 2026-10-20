# Relatório — melhoria do fluxo de etapas e entregáveis

**Data:** 19/10/2026 · **Onde:** somente ambiente LOCAL (nada foi para GitHub, servidor, QA ou allka.store) · **Produto ID 1:** continua **V1 — Rascunho, não publicado**.

## 1. Segurança
- **Banco confirmado:** MySQL local do Docker (`allka-2026-mysql-1`, banco `allka`, porta 3306; frontend em `http://localhost:8082`). Não era o servidor.
- **Backup antes de mexer:** `backups/fluxo-etapas-entregaveis-20261018/` — banco completo (`allka-local-COMPLETO-antes.sql.gz`) + arquivos-modelo de entregáveis.
- **Restauração validada:** o backup foi restaurado num banco descartável (`allka_restore_verify_20261019`) e **todas** as tabelas do cadastro bateram com o banco vivo (produtos 36, versões 36, tarefas 1, etapas 8, entregáveis 3, acessos 8, variações 2, opções 5, questionários 3, usuários 27, projetos 40; soma de verificação igual em todas; a única diferença é a coluna nova de entregáveis, esperada). Detalhes em `LEIA-ME.md` da pasta do backup.
- **Nada publicado, ativado ou enviado.** Nenhuma chamada externa, nenhum dado alterado nos produtos. Nada foi salvo no Produto 1.

## 2. Diagnóstico anterior
- Entregáveis eram cadastrados **numa seção geral da tarefa**, longe das etapas; o vínculo com a etapa era um campo do modal. Quem montava a etapa não via nem criava seus entregáveis ali.
- Aprovação do cliente era **implícita** (etapa visível ao cliente = aprovada por ele) e só aparecia como "Etapa interna" + prazos.
- Campos que dependem de uma escolha (pessoa que qualifica, evidência, condição de acesso…) apareciam **sem aviso**, sem rolar até eles.
- O selo de cada bloco dizia só "Completo/Incompleto" (sem quantas pendências), e a condição do acesso exigia sair da etapa para criar uma variação.
- O modal de entregável era estreito, com tudo aberto, sem rascunho e sem mostrar o que faltava.

## 3. Implementação (vale para TODOS os produtos, antigos e novos)
| Pedido | O que foi feito |
|---|---|
| 1 · Entregáveis na etapa | Novo **bloco 5 "Entregáveis desta etapa"** (o antigo bloco 5 de acessos virou o 6): declarar *tem / não tem*, **Novo**, **Vincular da tarefa** (sem etapa), **Reutilizar de outro produto**, editar, duplicar, ordenar, **Remover só o vínculo**, **Excluir** (confirma; recusado se já usado). "Etapa responsável" vem sozinha. Tudo é rascunho da tela e **grava ao salvar a etapa** (antes dela). Entra no resumo da tarefa. Nunca copia o que já existe. |
| 2 · Seção geral | "Entregáveis da tarefa" vem **depois das etapas**, agrupada por "Etapa N — nome", grupo **"Entregáveis sem etapa responsável"** como pendência, tipo/recorrência/responsável/momento/obrigatoriedade/aprovação/visibilidade, busca, expandir/recolher, editar com contexto e **Ir para a etapa**. É o mesmo registro. |
| 3 · Cartão da etapa | "1 entregável — Plano estratégico inicial de mídia paga — aprovação do cliente — todo ciclo" + completos/incompletos. |
| 4 · Modal de entregável | Largo e responsivo, cabeçalho fixo (contexto + "alterações não salvas" + "faltam N itens"), rodapé sempre à vista (Cancelar / Salvar rascunho / Salvar), **8 blocos recolhíveis** (Identificação · Entrega e formato · Responsável e etapa · Momento e recorrência · Evidência e aprovação · Condições · Arquivo-modelo · Visibilidade e avançado), erro sem perder nada, fechar com alterações pergunta. |
| 5 · Aprovação do cliente | Pergunta explícita **"Esta etapa exige aprovação do cliente?"**: Não · Sim, pela própria etapa · Sim, por um ou mais entregáveis · Apenas ciência. **Etapa interna** desativa as opções com explicação. Prazos, refação, limite de ajustes, quem recebe, silêncio, IA grátis e **resumo em linguagem simples** ("Ao concluir esta etapa, ela será enviada ao cliente. A próxima etapa ficará bloqueada até a aprovação. O cliente terá 16 horas úteis para responder. Se pedir ajuste, o executor terá 8 horas úteis para reenviar."). O **motor** de etapas obedece (Não/ciência liberam a próxima na hora; pela etapa/por entregáveis seguram). |
| 6 · Campos dependentes | Pessoa que qualifica, evidência obrigatória, só na 1ª execução, dispensável, entregável condicional e condição do acesso: o bloco **aparece, a tela rola até ele, destaca por instantes e diz "falta 1 campo / faltam N campos"**. |
| 7 · Acesso condicional | Ao escolher *Condicional* o construtor já abre com a 1ª regra, leva a "Origem da condição" e mostra a frase ao vivo **"Este acesso será necessário quando …"**. Só **concluir** é bloqueado; o rascunho salva e marca incompleto; nada se perde. |
| 8 · Variação na condição | "+ Criar nova variação" (nome + opções) e "Criar opção" usam as **mesmas rotas do cadastro de variações**; a nova variação já fica escolhida; a etapa digitada não se perde. |
| 9 · Status reais | Cada bloco mostra **Completo · Incompleto (N pendências) · Com erro · Opcional · Não se aplica**; o cabeçalho do painel consolida as pendências de todos os blocos (clicar leva ao campo). |
| 10 · Fluxo guiado | **Anterior / Próximo / Salvar rascunho / Concluir e salvar etapa** e um **resumo final** (completa/pendente, entregáveis, acessos, aprovação, qualificação, como a próxima etapa é liberada). |
| 11 · O que já estava certo | Mantido: rascunho da etapa, erro sem perder dados, aviso ao fechar, acessos em rascunho da tela, F5 reabre a etapa, busca no "Adicionar acesso", acordeões, modais abaixo do cabeçalho. |

**Limites honestos (não esconder):** *limite de ajustes*, *quem recebe o pedido* e *ação no silêncio* ficam **registrados** no cadastro, mas o sistema **ainda não os aplica sozinho**. A aprovação "por entregável" vale para o conjunto da etapa (ainda não existe decisão entregável por entregável).

## 4. Compatibilidade
- **Dados existentes preservados:** nenhum produto, versão, tarefa, etapa, questionário, entregável, acesso, variação, preço ou histórico foi alterado. Os mesmos IDs; os vínculos `step_id` que já existiam aparecem dentro das etapas e no resumo.
- **Etapa antiga sem a chave de aprovação** continua com o comportamento de sempre (o cliente aprova) e a tela só escreve a chave quando o usuário escolhe uma opção.
- **Entregável sem etapa** vai para o grupo de pendência e pode ser vinculado a qualquer momento.
- **Migração aditiva** `20261018180000_deliverable_draft` (uma coluna com padrão falso; tem `rollback.sql`), aplicada só no banco local; "Database schema is up to date" ao reaplicar (idempotente). A migração de 18/10 (`20261018120000`) também continua pendente no servidor.

## 5. Produto ID 1
- Continua **V1 — Rascunho** (não publicado). **Nada foi salvo nele** nesta melhoria.
- **Plano estratégico inicial de mídia paga → Etapa 2** (já estava ligado) · **Registro de campanhas e otimizações realizadas → Etapa 7** (já estava ligado) · **Relatório de desempenho e plano do próximo ciclo → sem etapa** (pendência de propósito; dá para vincular à Etapa 8 no bloco "Entregáveis desta etapa" → "Vincular da tarefa").
- Conferido na tela real (modo leitura): cartões da Etapa 2 e da 7 com "1 entregável…", seção "Entregáveis da tarefa" depois das etapas com os três grupos.

## 6. Testes
- **Frontend:** `tsc` limpo. Pasta do cadastro: **39 arquivos / 283 testes passam**. Suíte completa: ver seção 7. Cobre os 30 cenários pedidos (criar/editar na etapa, rascunho, concluir, reabrir/persistência, resumo, editar pelo resumo, trocar etapa, remover só o vínculo, excluir com confirmação e recusa do servidor, entregável sem etapa, aprovação por etapa/por entregável/etapa interna, bloqueio da próxima, condição de acesso, variação criada na condição, status real, erro sem perder dados, produtos antigos/novos, sem duplicar).
- **Backend:** `tsc` limpo. Suíte nova `catalog2-step-deliverables-flow.integration.test.ts` (**14 testes passam**): entregável em rascunho, publicação bloqueada, vínculo/desvínculo/troca de etapa sem copiar, etapa de outra tarefa recusada, exclusão 409 `deliverable_in_use`, ordem, `ops.no_deliverables`/`client_approval`, e os modos do motor (`step`, `deliverables`, `none`, `awareness`, interna).
- **Regressão:** ver seção 7.
- **Visual no navegador real:** conferida a parte de **leitura** do Produto 1. **O painel de edição da etapa NÃO foi visto na tela real**: o navegador embutido bloqueou o clique em "Editar" da página (trava de edição do produto) e eu não contornei. O painel está coberto pelos testes automáticos (jsdom). Peço que você o veja no roteiro abaixo.

## 7. Arquivos e banco
- **Banco:** coluna `catalog2_task_deliverables.draft_incomplete` (migração `20261018180000_deliverable_draft`).
- **Backend:** `lib/catalog2-ops.ts`, `lib/stage-engine.ts`, `lib/generate-tasks-catalog2.ts`, `lib/catalog2-service.ts`, `lib/task-deliverables.ts`, `routes/catalog2-admin.ts`, `prisma/schema.prisma`.
- **Frontend (pasta `novo-catalogo/`):** novos `catalog2-deliverable-fields.ts`, `deliverable-modal.tsx`, `step-deliverables.ts`, `step-deliverables-editor.tsx`, `client-approval.tsx`, `step-final-summary.tsx`, `reveal.tsx`, `quick-variation.tsx`; reescritos `catalog2-deliverables-ui.tsx`, `step-completeness.ts`; alterados `product-editor.tsx`, `step-blocks.tsx`, `access-condition-builder.tsx`, `catalog2-connections-ui.tsx`, `step-accesses-editor.tsx`.
- **Testes novos/atualizados:** `step-row-universal.test.tsx`, `step-universal-pure.test.ts`, `catalog2-deliverables-ui.test.tsx`, `step-completeness.test.ts`, `step-blocks.test.tsx`, `step-row-draft.test.tsx`, `catalog2-questionnaire-builder.test.tsx`, `routes/catalog2-step-deliverables-flow.integration.test.ts`.
- **Docs:** `docs/RETOMAR-AQUI.md`, `docs/regras-de-negocio.md` (itens 30–35), `docs/cadastro-produto-passo-a-passo.md`, `docs/deploy-log.md` (pendente de deploy), `documentos/registro-continuidade.json` (+ `.docx`/`.md`).

## 8. Estado final e roteiro de teste manual (no Produto 1, SEM salvar nada nele)
Abra `http://localhost:8082/admin/cadastro-produtos/1`, aba **Entrega**, clique em **Editar** (rodapé) e abra a **Etapa 2**.
1. Veja o painel com **6 blocos** fechados, cada um com resumo e selo (Completo / Incompleto com N pendências / Não se aplica). O topo mostra "N pendências para concluir" — clique e ele leva ao campo.
2. Abra o **bloco 5 "Entregáveis desta etapa"**: o "Plano estratégico inicial de mídia paga" já está lá. Clique no lápis: abre o modal largo com 8 blocos e o contexto "Tarefa… · Etapa 2…". Cancele.
3. Clique **Novo entregável**, digite só o nome e use **Salvar rascunho**: aparece "Novo — ainda não salvo". Depois **Concluir e salvar etapa** deve **recusar** citando o entregável pelo nome. (Cancele a etapa e **descarte** para não gravar nada.)
4. Em **Vincular da tarefa**: o "Relatório de desempenho…" aparece para vincular (só teste se for apagar a alteração ao descartar).
5. Bloco **3**: troque **Quem qualifica** para "Pessoa específica" → o campo da pessoa aparece, a tela rola e ele pisca, com "falta 1 campo". Ligue **Evidência obrigatória** (bloco 4) → os detalhes aparecem na hora.
6. Bloco **3**, aprovação do cliente (só aparece se a tarefa executa por etapa): troque entre as 4 opções e leia a **frase em linguagem simples**; marque **Etapa interna** e veja as opções desativadas.
7. Bloco **6**: adicione um acesso, escolha **Condicional**: o construtor abre sozinho, vai para "Origem da condição" e mostra "Este acesso será necessário quando …". Escolha *Variação* para ver as listas. **Atenção:** "+ Criar nova variação" **grava a variação na hora** no cadastro de variações do produto (só a variação; a etapa não é salva). Por isso **não teste esse botão no Produto 1** (nem em produto que você quer manter como está) — use um produto de teste.
8. Use **Anterior / Próximo** até o **Resumo final**.
9. Feche com **Cancelar** → "Descartar alterações". Confirme que o Produto 1 continua igual (3 entregáveis; Plano na Etapa 2, Registro na Etapa 7, Relatório sem etapa; **V1 — Rascunho**).

Concluí a melhoria universal do fluxo de etapas e entregáveis no ambiente local. Os dados existentes foram preservados, o Produto ID 1 continua em V1 não publicada e está pronto para o teste manual do administrador.
