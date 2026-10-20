# Relatório — Rascunho da etapa, acordeões, condição dos acessos e entregáveis compactos (18/10/2026)

Tudo **só local**. Nada foi publicado, nada subiu para GitHub/servidor, o **Produto ID 1 continua "V1 — Rascunho"** e nenhum dado existente foi alterado ou apagado.

## 1. O que foi corrigido
- A etapa agora tem **"Salvar rascunho da etapa"** (guarda tudo, mesmo incompleto) separado de **"Concluir e salvar etapa"** (valida o obrigatório).
- **Erro nunca fecha a tela nem apaga o preenchimento** (antes, falha de validação fechava o painel e perdia tudo).
- Os **5 blocos da etapa viraram acordeões** independentes, com resumo, status e "Expandir/Recolher todos".
- Acesso **condicional** tem um **construtor de condição** (sem código), com E/OU e várias opções na mesma regra.
- **Acessos da etapa só gravam ao salvar a etapa** (adicionar/alterar/remover ficam em rascunho da tela; cancelar não deixa nada parcial).
- **Entregáveis compactos:** resumo, expandir/recolher todos, duplicar, ordenar, editar, excluir.
- Os painéis (modais) agora ficam **abaixo do cabeçalho do app** (antes o topo do painel ficava coberto).

## 2. Como funciona "Salvar rascunho da etapa"
Botão no rodapé do painel de edição (e também no modal "Nova etapa"). Grava **todos os campos já preenchidos**, sem exigir nada; marca a etapa **"Rascunho incompleto"** (selo no cartão e no painel); **mantém o ID**; preserva checklist, orientações, evidência, prazos, conexões e condições incompletas; **nunca altera o modelo global**; **não libera para execução e não publica** (a publicação do produto fica bloqueada enquanto houver etapa em rascunho). A tela continua aberta ("Rascunho salvo às HH:MM") e dá para fechar e continuar depois do mesmo ponto. Etapa completamente vazia é aceita ao editar (nome em branco mantém o nome atual). Ao **criar** uma etapa nova, o rascunho exige ao menos um nome.

## 3. Como funciona "Concluir e salvar etapa"
Valida antes de gravar: nome, descrição, especialidade (da etapa ou da tarefa), horas > 0 (nas duas opções se for "Humano ou IA"), líder específico escolhido, critério de conclusão, pessoa que qualifica (quando específica), prazos inteiros ≥ 1 (execução por etapa), "precisa de acesso" com ao menos um acesso e **cada acesso completo**. Passando, grava, tira a marca de rascunho e fecha. Se a etapa veio de um modelo global, continua perguntando se vale só para este produto ou para o modelo.

## 4. Como os erros aparecem sem perder dados
Ao tentar concluir com problema: a tela **permanece aberta**; **nenhum campo é apagado**; os blocos com problema **abrem sozinhos**; a tela **rola até o primeiro campo com erro**, que fica **destacado em vermelho** com a mensagem do que falta; no topo aparece um **resumo clicável com todas as pendências**; o cabeçalho do bloco passa a **"Com erro"**. Erro do servidor também mantém tudo e mostra o motivo. **Fechar/cancelar com alterações** pergunta: *Continuar editando · Salvar como rascunho e fechar · Descartar alterações*.

## 5. Como funciona o construtor de condições dos acessos
Ao marcar o acesso como **Condicional**, aparece na hora **"Condição quando este acesso passa a ser necessário"**. Cada regra: **Origem** (Variação, Opção da variação, Adicional, Resposta do questionário, Outra conexão, Etapa, Modalidade de contratação, Primeira execução, Renovação, Regra comercial) → **Referência** pelo **nome e ID** → **Operador** (É igual a, É diferente de, Está selecionado, Não está selecionado, Contém, Existe, Não existe — cada origem só oferece os que fazem sentido) → **Valor(es)** (**mais de uma opção válida na mesma regra = OU**). Várias regras combinam com **E** ou **OU**. Mostra a frase final. Exemplo do Produto 1: *Google Ads* → Plataforma é igual a **Google Ads OU Ambas**; *acessos da Meta* → Plataforma é igual a **Meta Ads OU Ambas**. Sem condição completa o acesso **não conclui** (mas salva como rascunho; a mensagem cita o acesso pelo nome). A condição vale sozinha na contratação (reaproveita e amplia o motor de gatilhos que já existia). Condição antiga em texto livre continua guardada e à vista.

## 6. Como funcionam os acordeões
Os blocos 1–5 abrem/fecham **separadamente**; fechado mostra **resumo compacto**; o cabeçalho diz **Completo / Incompleto / Com erro / Opcional** (bloco 4 é opcional); fechar **não apaga** o que foi digitado (o conteúdo continua montado); **Expandir todos / Recolher todos**; bloco com erro abre sozinho; botão de cabeçalho acessível por teclado (`aria-expanded`); em **tela estreita só um bloco fica aberto por vez**. Ao clicar em Editar, todos os blocos vêm fechados; F5/Ctrl+R reabre o painel da mesma etapa com os mesmos blocos abertos (o navegador avisa antes de recarregar se houver alteração não salva).

## 7. Como ficaram os entregáveis compactos
Cada entregável é uma linha com **nome, tipo, recorrência, responsável, etapa e situação** (completo = nome e descrição preenchidos); clicar abre/fecha os detalhes; **editar, duplicar, subir/descer e excluir** sempre à vista; **Expandir todos / Recolher todos**; "+ Adicionar" abre modal e só cria ao salvar. Dez entregáveis = dez linhas pequenas, todas fechadas. Os três entregáveis do Produto 1 **não foram tocados**.

## 8. Como ficou o salvamento dos acessos
Adicionar/alterar/remover acesso **só muda a lista da tela** até salvar a etapa. Cada acesso mostra o estado: *Novo — ainda não salvo · Salvo no servidor · Alterado — salva com a etapa · Será removido ao salvar a etapa (com "Desfazer") · Rascunho incompleto*. Cancelar/descartar **não deixa conexão parcial gravada**. O contador **"N acessos configurados" conta só acessos completos**; incompletos aparecem à parte e **não entram em contagens, resumos, cotação, contratação nem publicação**. Ao salvar, a ordem é: remoções (ou passagem para outra etapa) → novos/alterados → a etapa. Se algo falhar no meio, o que já foi gravado fica registrado na tela e o erro aparece sem fechar.

## 9. Arquivos e banco alterados
- **Banco (migração ADITIVA, só local):** `20261018120000_step_draft_and_access_conditions` — `catalog2_task_steps.draft_incomplete` (padrão falso) e `draft_saved_at`; `catalog2_connection_requirements.draft_incomplete` (padrão falso). Tem `rollback.sql`. **Backup antes:** `backups/etapas-rascunho-20261018/` (dump completo + contagens).
- **Backend:** `prisma/schema.prisma`; `lib/connections/triggers.ts` (novas origens/operadores/valores múltiplos), `requirements.ts`, `flow.ts`, `quote.ts`; `lib/catalog2-service.ts` (publicação bloqueia rascunho; serialização); `routes/catalog2-admin.ts` (`PUT /steps/:id` com `draft`, `POST /tasks/:id/steps` com `draft`, acessos com `draft`/`require_complete`, `PUT /tasks/:id/deliverables/order`).
- **Frontend** (`apps/frontend/app/admin/produtos/novo-catalogo/`): novos `step-blocks.tsx`, `step-completeness.ts`, `step-accesses.ts`, `step-accesses-editor.tsx`, `access-condition.ts`, `access-condition-builder.tsx`; alterados `product-editor.tsx`, `catalog2-connections-ui.tsx`, `catalog2-deliverables-ui.tsx`; `lib/api-client.ts` (`reorderCatalog2Deliverables`).
- **Docs:** `cadastro-produto-passo-a-passo.md`, `regras-de-negocio.md` (itens 27–29), `deploy-log.md` (pendente de deploy), `RETOMAR-AQUI.md`, registro de continuidade.

## 10. Testes realizados e resultados
- **Novos — frontend:** `step-row-draft` (18), `step-blocks` (7), `step-completeness` (7), `step-accesses` (13), `access-condition` (8), `access-condition-builder` (9), `catalog2-deliverables-ui` (15) — todos verdes.
- **Novos — backend:** `catalog2-step-draft.integration` (15, banco descartável) e `triggers-conditions` (11, puro) — todos verdes.
- **Cobrem os 14 testes pedidos:** rascunho de etapa vazia; parcial; fechar e reabrir; concluir faltando campos; concluir com acesso condicional sem condição; tela permanece e preserva tudo; corrigir e concluir; cancelar com alterações (3 opções); abrir/fechar cada acordeão; expandir/recolher todos; dez entregáveis compactos; responsividade; conexão parcial **não** gravada silenciosamente; regressão.
- **Conferido no navegador real (Produto 1, só leitura):** etapa vem fechada com "Editar" visível; painel abre abaixo do cabeçalho; blocos com status/resumo; concluir com pendências **não grava**, destaca o campo e abre o bloco; construtor de condição lista as origens e a variação real do Produto 1; cancelar com alteração pergunta as 3 opções e "Descartar" não grava; em tela de celular só 1 bloco aberto e sem rolagem lateral. Conferido no banco: nada do Produto 1 mudou.
- **Regressão — frontend:** `tsc` limpo; 864 passam; **85 falham = exatamente as 85 falhas antigas** (mesmas 7 telas, provadas iguais na base limpa).
- **Regressão — backend (banco descartável, uma suíte por vez, 46 suítes de tarefas, etapas, preços, recorrência, primeira execução, continuidade, pacotes, questionário, conexões, checkout, publicação etc.):** **43 suítes 100% verdes**; falham só as 3 **antigas conhecidas** (`catalog2-catalog` 1 teste, `catalog2-import` 2 testes, `catalog2-product-history` 1 teste), as mesmas de antes desta leva. Nenhuma falha nova.

## 11. Roteiro manual para homologação
1. Abra `http://localhost:8082/admin/cadastro-produtos/<um produto de teste>` → tarefa → etapas. **Confirme:** etapas fechadas, botão **Editar** no cabeçalho de cada uma (aberta ou fechada).
2. **Editar** → confira os 5 blocos com status/resumo; clique em **Expandir todos** e **Recolher todos**; abra e feche cada bloco.
3. Apague a descrição e o critério de conclusão → **Concluir e salvar etapa**: a tela **não fecha**, rola até o primeiro erro, destaca, mostra o resumo no topo; o que você digitou continua lá.
4. Clique **Salvar rascunho da etapa**: aparece "Rascunho salvo às…"; feche (Cancelar) e reabra: está tudo igual; o cartão mostra o selo **Rascunho incompleto**.
5. Tente **publicar** o produto: deve ser bloqueado citando a etapa em rascunho. Preencha tudo e **Concluir e salvar etapa**: o selo some.
6. Mude o nome sem salvar e clique **Cancelar**: aparecem *Continuar editando / Salvar como rascunho e fechar / Descartar alterações*.
7. Bloco 5: ligue "precisa de acesso" → **Adicionar acesso** → o acesso aparece como **Novo — ainda não salvo**. **Cancele** → descarte → reabra: nada ficou gravado.
8. Adicione um acesso, deixe **Obrigatoriedade: Condicional** → aparece o construtor. Tente **Concluir** sem condição: erro citando o acesso pelo nome. **Salvar rascunho**: salva (acesso "Rascunho incompleto", fora da contagem).
9. Monte a condição: Origem **Variação** → "Plataforma" → **É igual a** → marque **Google Ads** e **Ambas** → confira a frase → Concluir.
10. Entregáveis: cadastre vários; confira linhas compactas, **Expandir/Recolher todos**, **Duplicar**, **subir/descer**.
11. Reduza a janela (celular): só um bloco do painel fica aberto por vez.

## 12. Confirmação final
**O Produto ID 1 continua em "V1 — Rascunho"** (conferido no banco ao final), com a tarefa "Teste" e suas 2 etapas, os 3 entregáveis e os acessos como estavam. **Nenhum produto foi publicado.** Nada foi enviado ao GitHub/servidor.
