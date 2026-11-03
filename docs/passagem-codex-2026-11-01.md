# Passagem Claude → Codex — 01/11/2026 (SOMENTE LOCAL)

## 03/11 — Codex após passagem da Rose: pedido957 JÁ pago em simulação

Não repetir projeto/pedido. UI conferiu cotação1.226,32 e usuário autorizou termos/contratação/pagamento simulado. Geradas T015720/721, briefings fictícios enviados. SEO aprovado pelo Admin, agora AGUARDANDO_NOMADE; Manutenção em análise. Perfil operacional do Reynário preparado por script localguardado com autorização específica (1perfil/2habilitações; sem novo login/CNPJ/termos/senha/Líder). Rose Líder criada pelo Claude foi conferida ativa/Geral. Falta distribuição correta das etapas: SEO primeira etapa sem lider_id; Manutenção usa qa-user-leader antigo. Não alterar matriz publicada nem pular etapa para fazer passar. Nômade ainda não recebeu/aceitou/executou. Detalhes em docs/teste-ciclo-agencia-nomade-2026-11-03.md. Navegador bloqueou novamente antes de entrar como Rose. Correções locais de lançamento e estado da UI descritas no relatório; sem novo deploy/espelho.

## 03/11 — Claude → Codex: já existe Líder no local (Rose Bonifácio)

```text
Retomar a Plataforma Allka 2026 — já existe um Líder no ambiente LOCAL (http://localhost:8082).
Leia o primeiro bloco de docs/RETOMAR-AQUI.md ("Claude criou a Líder Rose Bonifácio").
- Líder: Rose Bonifácio, e-mail rose.lider@lamego.com.vc, senha = a padrão dos usuários de teste locais (SEED_TEST_USER_PASSWORD do apps/backend/.env). Área "Geral", sem filtro de categoria: a fila dela mostra todas as tarefas; a tarefa do projeto 957 enviada para análise já aparece lá.
- A antiga Rose de Empresa (rose@lamego.com.vc) agora se chama Carla Mendes; e-mail, senha, empresa e vínculos iguais.
- Seguir o ciclo do teste ponta a ponta (docs/teste-ciclo-agencia-nomade-2026-11-03.md) com a Rose como Líder. O Reynário (Nômade) continua sem cadastro operacional.
LIMITES: somente local; não espelhar para QA, não publicar, não apagar dados; compra/pagamento/lançamento só com confirmação do usuário.
```

## 03/11 — ATENÇÃO: autorização posterior publicou código e espelhou QA

As restrições históricas de “não deploy” abaixo foram superadas SOMENTE pelo pedido e confirmação do usuário em 03/11. Deploy completo 0036e96/tag deploy-2026-11-03-1 + espelho 240 tabelas/131 anexos concluídos, backups recuperáveis e igualdade de hashes/FKs provadas. Ler PRIMEIRA entrada em docs/deploy-log.md e topo de RETOMAR-AQUI.md. Frontend/backend workflows verdes; CI geral vermelho em 5 arquivos frontend, não ocultar. Builds/typechecks e 60 testes direcionados passaram. Nenhuma nova compra/lançamento/publicação de versão; nenhuma credencial redefinida. Não repetir espelho. QA agora reflete pacote local com projeto 956, 4 projetos/7 tarefas no total; login normal Agência/saldo/substatus conferidos. Segurança das demais rotas Nômade e demais pendências seguem abertas.

## 02/11 — Reteste Codex da PARTE F: aprovado na interface Admin e Agência (somente local)

- Perfis realmente usados: Admin Vinicius Guardia e Agência Lamego Academy; projeto 956 já existente. Nenhuma compra, pagamento, publicação ou lançamento efetuado.
- Escape real, Admin e Agência, em 390×844 e 768×1024: Mais sobre Faturamento fecha só o menu; URL do projeto e aba selecionada permanecem. No Admin, segundo Escape sem menu voltou à lista como previsto.
- Em ambos os perfis, Mais sobre painel Produtos → Ver tarefas (SEO), e sobre detalhe da tarefa SEO: um Escape preservou o painel/detalhe de trás. Na Agência, Escape com foco na busca do menu também preservou o painel.
- Substatus T015718 “Em lançamento” confirmado nos quatro locais de cada perfil: aba Tarefas Lista/Kanban e painel do produto Lista/Kanban. T015719 continua sem esse substatus, disponível para lançamento. Nenhum botão Lançar/Continuar lançamento foi acionado; não se alterou nem descartou o rascunho.
- Não foi criada tarefa em AGUARDANDO_INFORMACOES para provar esse segundo selo. Os 30/30 testes e typecheck são resultado informado pelo Claude; não foram reexecutados neste reteste visual. X/fundo/arrasto já tinham passado na rodada D/E, não repetidos integralmente agora. Toque físico real não testado.
- Provas locais fora do Git: 02-11-F-admin-escape-preserva.png e 02-11-F-agencia-substatus-seo.png na pasta de evidências do Codex. Viewport temporário restaurado. Sessão final: Agência, projeto 956, painel de tarefas SEO.
- Farol desta rodada: Escape 🟢; selo SEO nos quatro locais 🟢; reteste Admin/Agência 🟢. Farol macro mantido 14/28 concluídos, 14 abertos — não converter correção visual em homologação de segurança ou execução.
- Próxima prioridade: rodada própria das demais rotas ligadas a projeto acessíveis ao Nômade, preservando acesso legítimo à tarefa/etapa atribuída e provando isolamento em testes. Continuam pendentes retorno ao destino pós-login, auditoria das 33 telas, toque físico e selo fixo ALLKOIN 0.00 no painel da empresa. Nada de commit/push/deploy/QA/espelho nesta rodada.

## Atualização Claude → Codex — 02/11 (noite): Escape do menu + selo do T015718 (PARTE F — mais recente)

> Mensagem pronta para colar no Codex. Responde ao "Retorno Codex → Claude — D/E" logo abaixo.

```text
Retomar a Plataforma Allka 2026 — PARTE F: correções do Claude para os 2 pontos do seu reteste D/E de 02/11. SOMENTE LOCAL (http://localhost:8082), mesmo proj_956.
Repositório: C:UsersTesteDocumentos 2.0Verificação 2.0_DESENVOLVIMENTOSPlataforma allka 2026allka-plataformaallka-2026

LEIA PRIMEIRO
1. docs/fluxo-ponta-a-ponta-agencia-nomade-2026-10-31.md — seção 11, primeiro bloco "Correções do Claude — Escape do menu e selo do T015718".
2. docs/RETOMAR-AQUI.md — primeiro bloco.
3. docs/deploy-log.md — primeira entrada (registro; NÃO é deploy).

O QUE FOI FEITO (só telas; nenhum dado gravado; nenhuma regra/permissão mudou; desktop igual)
1. Escape com o menu Mais aberto sobre o projeto fechava menu E projeto: o menu agora consome o Escape (ouve na captura) e fecha só ele; projeto e aba ficam; o 2º Escape fecha o projeto como antes. X/fundo/arrasto/busca/navegação iguais. Arquivo: apps/frontend/components/app-menu-drawer.tsx.
2. T015718 "Em lançamento" no detalhe × "Para lançamento" no quadro: o grupo "Para lançamento" junta não lançada, em lançamento (rascunho salvo) e aguardando informações; o T015718 está em lançamento desde antes desta rodada. Agora a Lista e o Kanban (aba Tarefas e Produtos → Ver tarefas) mostram, dentro do grupo, um selo com o estado exato ("Em lançamento" / "Aguard. informações") e o título da coluna explica o agrupamento. Estado e rascunho intactos. Arquivos: apps/frontend/components/task-launch-substatus.tsx (novo), product-task-kanban-card.tsx, project-management-modal.tsx.

RETESTAR (Agência 1 e Admin; 390 e 768)
a) proj_956 → Faturamento → Mais → esperar a folha parar → UM Escape: só o menu fecha; URL e aba Faturamento ficam. 2º Escape: fecha o projeto.
b) Repetir (a) com o menu aberto sobre Produtos → Ver tarefas (painel do produto) e sobre o detalhe de uma tarefa: cada Escape fecha só a camada de cima.
c) No menu: X, toque/clique no fundo e na faixa de cima, arrasto da alça, busca e navegação continuam funcionando.
d) Aba Tarefas e Produtos → Ver tarefas, Lista e Kanban: T015718 em "Para lançamento" com selo "Em lançamento"; passar o mouse/tocar no "i" explica. NÃO clicar em Lançar/Continuar lançamento.

LIMITES: somente local; sem compra, pagamento, lançamento, ajuste, exclusão, publicação, commit, push, deploy ou QA. Não homologa permissões negativas do Nômade/Líder: outras rotas do Nômade continuam pendentes (rodada própria). Seguem pendentes: retorno pós-login, 33 telas, toque real, selo "ALLKOIN 0.00" do painel de empresa.
```

## Retorno Codex → Claude — D/E retestado, EscapeMenu fecha projeto (02/11, mais recente)

Leia o PRIMEIRO bloco§11, “Reteste Codex — partes D/E de02/11”. Passaram no recorteAdmin/Agência: olho separado/cartão neutro dos2produtos, identidadeMenu, CadastroProdutos360cartão/1480tabela, remoçãoALLKOIN Novo eCarteira1174,46preservada. FaixaSuperior/arrastoMouse passaram; toque real não testado.9abasconsultadasemambosperfis;/api/projects retornou200/preflight204 sem403/404. NegativasNômade/Líder e travapaga NÃO reexecutadas peloCodex.

Corrigir comregressão: projeto956>Faturamento>Mais>esperarfolhaestável>UM Escape fechaMenu Eprojeto. Reproduzido2xAgência768 eAdmin390, URLvoltapara listadeprojetos. EscapeMenu deveconsumirevento/fecharsótopo,preservandoorigem/aba; segundoEscape podefecharprojeto. Testarsobredetalhe/painel/fatura, não apenasDashboard, preservandoX/fundo/arrasto/busca/navegação.

EsclarecerSEO: T015718 já tinhaContinuar lançamento na primeiraabertura desta rodada e detalheEm lançamento; quadroagrupaemPara lançamento. Fonte statusMapEM_LANCAMENTO→Para lançamento confirmada. Codex não clicoulançar; redeprélogin sóPOSTpresence,nadacomercial. Não reverterestado/descartarrascunhopara mascarar. Explicaragrupamentoouexibirsubstatussemalterarregras/investigarorigemsemculpabilizaçãopresumida.

Segurança geral NÃO concluída: outrasrotasNômadereportadasainda pendentes. Preparar/continuar rodada específica porescopodorecurso, preservandotarefas/etapaslegitimamenteliberadas. Nãoaproveitarretetetelasparasairalterandopermissõesindiscriminadamente. Continuampendentesretornopóslogin,33telas,toquereal,seloempresa0edecisõescomerciais. Atualizardocs/testes/limitesedevolverpróximoscliques. Somentelocal;semcompra/pagamento/lançamento/ajuste/exclusão/publicação/commit/push/deploy/QA. Macro14/28. FinalAdmin/projetos/956,Faturamento>FormasPagamento.

## Atualização Claude → Codex — 02/11: correção dos 5 achados do reteste A/B/C (PARTE E — mais recente)

> Mensagem pronta para colar no Codex. Responde ao "Retorno Codex → Claude" logo abaixo. A PARTE D (rotas de projeto do Nômade/Líder) fica mais abaixo e pode ir na mesma rodada.

```text
Retomar a Plataforma Allka 2026 — PARTE E: correções do Claude para os 5 achados do seu reteste A/B/C de 02/11. SOMENTE LOCAL (http://localhost:8082), mesmo proj_956.
Repositório: C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026

LEIA PRIMEIRO
1. C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026\docs\fluxo-ponta-a-ponta-agencia-nomade-2026-10-31.md — seção 11, primeiro bloco "Correções do Claude — 5 achados do reteste A/B/C".
2. C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026\docs\RETOMAR-AQUI.md — primeiro bloco.
3. C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026\docs\deploy-log.md — primeira entrada (registro; NÃO é deploy).

O QUE FOI FEITO (telas; nenhum dado gravado; nenhuma permissão nem regra comercial mudou; desktop igual)
1. Produtos → Ver tarefas → Kanban: o cartão não é mais clicável; o olho "Ver detalhes da tarefa T…" abre o mesmo detalhe da Lista; lançar só pelo botão escrito "Lançar tarefa" ("Continuar lançamento" se já começou), que aparece só em "Para lançamento". Arquivos: apps/frontend/components/product-task-kanban-card.tsx (novo) e apps/frontend/components/project-management-modal.tsx.
2. Menu Mais com a identidade real: a reserva do contexto da barra lateral era um admin fixo ("Admin Test", "AT", "Administrador"); agora é vazia, o cabeçalho repassa ao menu a mesma sigla e o mesmo papel do cartão do topo e o menu mostra o nome em todos os perfis. Arquivos: apps/frontend/contexts/sidebar-context.tsx, apps/frontend/components/header.tsx, apps/frontend/components/app-menu-drawer.tsx.
3. Cadastro de Produtos (/admin/cadastro-produtos) em 360 px: cada produto vira UM cartão com legenda em cada campo (ID, Imagem, Produto, Categoria, Tarefas, Preço, Pendências, Status) e as ações no rodapé. Causa: nenhuma célula tinha legenda (o padrão tabela-cartao joga célula sem legenda para o rodapé, com divisória) e a linha tinha altura fixa. Desktop igual. Arquivo: apps/frontend/app/admin/produtos/page.tsx.
4. Formas de Pagamento: "ALLKOIN Novo" mostrava um zero fixo no código (nunca carregado de lugar nenhum); a Carteira já é o saldo em Allkoins (moeda da plataforma desde 26/10); no servidor, pagar "com Allkoins" debita essa mesma carteira; a forma escolhida nessa tela não é salva. Por decisão do usuário a opção duplicada foi RETIRADA e a Carteira passou a se chamar "CARTEIRA (ALLKOINS)". Nenhum saldo, cobrança ou regra mudou. Arquivo: apps/frontend/components/project-management-modal.tsx.
5. Menu: o arrasto da alça usa Pointer Events (mouse e dedo no mesmo código; começar no X ou com o botão direito não arrasta) e a alça não seleciona texto; fundo e folha do menu agora ficam acima do cabeçalho do topo (camada 95 contra 90) — por isso a faixa de cima não fechava. X, Escape, busca e navegação iguais. Arquivo: apps/frontend/components/app-menu-drawer.tsx.

MEDIDO PELO CLAUDE (navegador interno, sessão admin; nada salvo; nenhum lançamento)
- Item 1: T015719 no Kanban de Ver tarefas: clique no meio do cartão não abre nada; o olho abre o detalhe da tarefa; "Lançar tarefa" NÃO foi clicado.
- Item 2: menu Mais do admin em 390 px: "VG · Vinicius Guardia · Administrador".
- Item 5: em 390 px, clique na faixa de cima fecha; arrasto da alça com o mouse fecha sem selecionar texto. Toque real não testado.
- Item 3: /admin/cadastro-produtos em 360 px, modo Lista, depois de carregar: 10 cartões, cada um com as 9 células dentro do próprio cartão; desktop 1024 px igual.
- Item 4: proj_956 → Faturamento → Formas de Pagamento: Cartão de crédito, Carteira (Allkoins) "Saldo: AK$ 1.174,46 (R$ 1.174,46)" marcada como antes, Boleto e PIX; sem "ALLKOIN Novo"; a seleção não foi trocada.
- Limites: a agência não foi vista pelo Claude (sem senha); toque real não testado; as "33 telas" da rodada do celular NÃO estão homologadas.

TESTES
- Telas: novo apps/frontend/components/product-task-kanban-card.test.tsx 4/4; components/app-menu-drawer.test.tsx 16/16 (4 novos); components/header.test.tsx 17/17 (2 novos). Todos os arquivos que usam o contexto da barra lateral (48): 529 passam; 42 falham, todas antigas e listadas no RETOMAR-AQUI (admin/produtos/page 35, admin/usuarios/page 5, iallka-floating-icon 2). Typecheck das telas limpo.

RETESTE (proj_956 existente; NÃO comprar, pagar, LANÇAR, ajustar nem excluir; abra a aba Rede)
1. Item 1, como Agência 1 e como admin: proj_956 → Produtos → Ver tarefas (nos dois produtos) → Kanban. Cada cartão tem o olho; clicar no meio do cartão NÃO abre nada; o olho abre o detalhe da tarefa; o botão "Lançar tarefa" aparece só nos cartões Para lançamento — NÃO clicar nele. A Lista continua igual. Confirmar que T015718/T015719 continuam Para lançamento.
2. Item 2, em 390 px e 768 px: o menu Mais da Agência 1 mostra a pessoa logada, a sigla da agência (a mesma do topo) e "Agência · Partner"; o do admin mostra a sigla, o nome e o papel do topo. Nunca "AT/Administrador" na agência.
3. Item 3, como admin em 360 px: /admin/cadastro-produtos em modo Lista, depois de carregar (não aprovar o "Carregando…"): cada produto num cartão só, legenda em cada campo, ações no rodapé (abrir o menu ⋯ de um produto só para ver, sem executar). Desktop 1480: tabela igual.
4. Item 4, como Agência 1 e como admin: proj_956 → Faturamento → Formas de Pagamento mostra Cartão de crédito, "CARTEIRA (ALLKOINS)" com AK$ 1.174,46 (o mesmo do topo), Boleto e PIX — sem "ALLKOIN Novo". NÃO trocar a forma selecionada.
5. Item 5, em 390 px: abrir o menu Mais e esperar a folha terminar de subir; clicar na faixa de cima (sobre o cabeçalho escurecido) fecha; reabrir e arrastar a alça com o mouse para baixo fecha sem selecionar texto; arrasto curto não fecha; X, Escape, busca e navegação continuam. Toque real só se a ferramenta permitir — não fingir.
6. Se aparecer "Carregando…" sem fim ou o erro "useSidebar must be used within a SidebarProvider" logo ao abrir, recarregue a página (efeito da recarga automática do servidor de desenvolvimento depois que o contexto mudou) e anote se repetir depois de recarregar.
Fora deste reteste: PARTE D (rotas de projeto do Nômade/Líder) logo abaixo; retorno pós-login para a tela de origem (pendente, não mexido); tabelas em cartão no tablet (decisão do usuário).

NÃO AUTORIZADO: commit, push, deploy, espelho, QA/allka.store, publicação, compra, pagamento, lançamento, ajuste de saldo, exclusão de dados, criar/promover Líder ou Nômade, mudar preço/tarifa/papel/credencial, gravar senha/link/token em documento.
```

## Retorno Codex → Claude — reteste A/B/C de 02/11, corrigir achados

Leia o PRIMEIRO bloco§11 do relatório, “Reteste Codex — partes A/B/C de 02/11”. Correções principais aprovadas no recorte: cabeçalho768 Admin/Agência, Kanban PRINCIPAL/códigos/olho/Escape, carteira principal1.174,46. Admin Carteiras/Extrato/Créditos/Conciliação e Agência produtos/saldo consultados com200 e sem403/404 no recorte. Isso não prova negativas/trava paga: Codex não alterou dados comerciais nem reexecutou testes. Não tocar na outra sessão das rotas de projeto.

Corrigir preservando desktop, campos, regras e permissões:
1. Produtos>Ver tarefas>Kanban: falta olho; clique no cartãoSEO abriu formulário de LANÇAMENTO, não detalhe. Codex cancelou e conferiu duas Para lançamento. Reusar detalhe da Lista por ação explícita e separar lançar, sem lançamento automático.
2. Menu Mais na Agência mostra AT/Administrador, sem nome, embora topoLA/Lamego e links corretos; Admin também avatarAT. Usar identidade/papel reais.
3. Cadastro de Produtos360: campos de cada produto viram blocos desconexos; agrupar cartão por produto com rótulos/ações. Ver captura privada indicada no relatório; não usar apenas ausência de overflow como prova de UX.
4. Formas de Pagamento: ALLKOIN Novo mostra0 separado de Carteira1.174,46; investigar fonte/semântica, sem creditar nem mudar regra comercial para mascarar.
5. Menu: mouse arrastando alça seleciona texto (só handlers touch no código); toque real NÃO testado, ferramenta não suporta. Faixa superior fora da folha não fechou. Conferir cobertura do fundo/fechamento e suporte de input, preservar X/Escape/busca/navegação que passaram.

Não afirmar33 telas homologadas: Codex conferiu8Admin estruturalmente em360, mais fluxoAdmin/Agência768/390/1480. Restam perfis negativos, trava paga em banco descartável e retorno pós-login específico. Atualizar docs/testes/resultados/limites, devolver roteiro preciso. Sem compra/pagamento/lançamento/ajuste/exclusão/publicação/commit/push/deploy/QA. Placar14/28. Agência continua autenticada no proj_956,Tarefas Lista; viewport restaurado.

## Atualização Claude → Codex — 02/11: escopo de projeto do Nômade + Líder não apaga projeto (PARTE D, versão atualizada com a regra do usuário: o Nômade não vê projeto)

> Mensagem pronta para colar no Codex. Se a PARTE C (logo abaixo) e a mensagem única (partes A e B) ainda não foram coladas, cole aquelas primeiro e esta em seguida. Detalhes na seção 11 do relatório do fluxo.

```text
Retomar a Plataforma Allka 2026 — PARTE D das correções do Claude de 02/11: escopo das rotas de projeto (/api/projects) para o Nômade + o Líder não apaga projeto. Complementa a PARTE C (carteiras e produtos do projeto) e a mensagem única (partes A e B) — se ainda não foram feitas, faça aquelas primeiro e esta em seguida. SOMENTE LOCAL (http://localhost:8082).
Repositório: C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026

LEIA PRIMEIRO
1. C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026\docs\fluxo-ponta-a-ponta-agencia-nomade-2026-10-31.md — seção 11, bloco "Correções do Claude — escopo de projeto do Nômade + Líder não apaga projeto".
2. C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026\docs\RETOMAR-AQUI.md — primeiro bloco.
3. C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026\docs\deploy-log.md — primeira entrada (registro; NÃO é deploy).

O QUE FOI FEITO (só servidor; nenhuma tela mudou; nenhum dado gravado)
Antes, nas rotas /api/projects, o Nômade enxergava tudo (escopo "open", o mesmo do Líder): listava, abria, criava, alterava, arquivava e apagava projeto de qualquer conta; e o Líder apagava. Regra do usuário: "o nômade não vê o projeto, ele vê tarefa só que ele está liberado pra ver". Agora:
1. Nômade — GET /api/projects devolve lista vazia sempre, nem os projetos em que ele tem tarefa ou etapa.
2. Nômade — GET /:id e todas as abas (/files, /documents e download, /tasks, /billing, /dashboard, /log, /credentials) = 403 sempre, nem no projeto em que ele tem tarefa.
3. Nômade — criar projeto, check-name, alterar (PUT), arquivar, apagar, enviar/apagar documento e criar/alterar/arquivar/compartilhar/revogar credencial = 403 sempre; nada muda no banco. As tarefas dele (Minhas tarefas, Disponíveis, rotas de tarefa do executor) continuam iguais: vê só a tarefa que responde inteira ou da qual tem uma etapa.
4. Líder — continua lendo todos os projetos (lista, detalhe, abas) como antes; DELETE /api/projects/:id agora = 403 "Permissão insuficiente" (a mesma trava do PUT e do arquivamento). O Líder da importação antiga (account_type "nomades" + role "lider") continua Líder.
5. Admin, agência e empresa: iguais.
Arquivos: apps/backend/src/lib/project-scope.ts, apps/backend/src/routes/projects.ts, apps/backend/src/routes/project-tasks.ts (o critério do Nômade agora numa função só; mesmo resultado).

MEDIDO PELO CLAUDE (navegador interno, sessão admin, só abrir/olhar; nada salvo)
- Gestão de Projetos (4 projetos) e proj_956 → Dashboard, Dados do Projeto, Produtos, Tarefas, Arquivos, Documentos, Cofre, Faturamento e Log: todas as chamadas 200, sem erro no console.
- Limites: só o perfil admin foi visto pelo Claude (não usar nem pedir senha); Nômade, Líder, agência e empresa foram provados pelos testes abaixo. Não há Líder no banco local.

TESTES
- Servidor, banco descartável, um arquivo por execução: novo apps/backend/src/routes/projects-nomade-leader-scope.integration.test.ts 9/9 na versão final (duas agências, empresa, nômade com uma tarefa num projeto e só uma etapa noutro, outro nômade, nômade sem perfil, Líder, Líder da importação antiga e admin; o Nômade não lista nem abre projeto nenhum e continua vendo só as tarefas dele em Minhas tarefas; cada recusa confere que nada mudou no banco). Depois do ajuste à regra do usuário: 9/9, delete-security 27/27, agency-link-contract 6/6, typecheck limpo. Já existentes (1ª versão, mesmo código para os outros perfis): delete-security 27/27, project-archiving 15/15, project-registered-contacts 11/11, agency-link-contract 6/6, catalog2-checkout 28/28, catalog2-e2e-scenarios 10/10, catalog2-multiple-contracts 10/10, catalog2-briefing-access 1/1, task-deliverables 6/6, task-ai 7/7, catalog2-ops 6/6, wallets-project-products-access 15/15; project-admin-responsible 18/21 e project-edit-admin-responsible 13/15 = as mesmas falhas antigas do motor de alertas já registradas (não tocado).
- Typecheck do servidor limpo.

RETESTE (proj_956 existente; NÃO criar, alterar, arquivar nem apagar projeto; abra a aba Rede do navegador)
1. Como Agência 1: Projetos — a lista mostra os mesmos projetos da Lamego Academy de antes; abrir o proj_956 e passar por todas as abas (Dashboard, Dados do Projeto, Produtos, Tarefas, Arquivos, Documentos, Cofre, Faturamento, Log) — tudo igual a antes. Na aba Rede, nenhuma chamada a /api/projects volta 403/404.
2. Como admin: Gestão de Projetos com os 4 projetos; proj_956 com as mesmas abas, iguais. Nenhum 403/404 em /api/projects.
3. Nômade e Líder ficam fora do reteste visual: o comportamento novo foi provado pelos testes (não criar, promover nem entrar como eles).
4. Se alguma tela deixar de mostrar projeto ou aba, anote a tela e a chamada que voltou 403/404.
Fora deste reteste: as outras rotas que usam projectVisibleToUser (fluxo da tarefa, portões de aprovação, SLA, Conexões, PLAC, aditivos, assinaturas, Meta, IA do projeto) ainda deixam o Nômade passar — lá ele também entra como especialista/revisor de etapa, o que pede uma rodada própria; check-name ainda responde sim/não para agência/empresa sobre nome de projeto de outra conta. Decisões do usuário em aberto (não mexidas): as mesmas da PARTE C.

NÃO AUTORIZADO: commit, push, deploy, espelho, QA/allka.store, publicação, compra, pagamento, lançamento, ajuste de saldo, exclusão de dados, criar/promover Líder ou Nômade, mudar preço/tarifa/papel/credencial, gravar senha/link/token em documento.
```

## Atualização Claude → Codex — 02/11: permissões de carteiras e de produtos do projeto + trava do produto pago (PARTE C, versão atualizada — complementa a mensagem única logo abaixo)

> Mensagem pronta para colar no Codex (substitui a primeira versão da PARTE C, sem a trava). Se a mensagem única logo abaixo (partes A e B) ainda não foi colada, cole aquela primeiro e esta em seguida. Detalhes na seção 11 do relatório do fluxo.

```text
Retomar a Plataforma Allka 2026 — PARTE C das correções do Claude de 02/11: fechamento de permissões das carteiras (/api/wallets) e dos produtos/tarefas do projeto (/api/project-products) + trava do produto já pago (decisão do usuário). Complementa a mensagem única de 02/11 (partes A e B: cabeçalho 768, Kanban, cartões, saldo, menu "Mais" e revisão celular/tablet) — se ela ainda não foi feita, faça aquela primeiro e esta em seguida. SOMENTE LOCAL (http://localhost:8082).
Repositório: C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026

LEIA PRIMEIRO
1. C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026\docs\fluxo-ponta-a-ponta-agencia-nomade-2026-10-31.md — seção 11, bloco "Correções do Claude — permissões de carteiras e de produtos do projeto".
2. C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026\docs\RETOMAR-AQUI.md — bloco "Claude fechou as permissões das carteiras".
3. C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026\docs\deploy-log.md — entrada "permissões de /api/wallets e /api/project-products" (registro; NÃO é deploy).

O QUE FOI FEITO (servidor + um aviso na tela do projeto; nenhum dado gravado; nenhuma regra comercial mudou além da trava pedida pelo usuário)
Antes, qualquer conta logada, de qualquer perfil, via todas as carteiras, criava carteira com saldo, creditava/debitava qualquer carteira e listava, vinculava, alterava e apagava produtos (e lia tarefas) de qualquer projeto. Agora:
1. /api/wallets — admin igual a antes. Demais perfis: GET / só a própria carteira (agência; agência Partner ativa também a de Partner; empresa; nômade; sem vínculo = lista vazia; filtros da busca só refinam); GET /:id e /:id/ledger de outro dono = 404; painéis /stats, /ledger, /projections e /conciliation = 403. Criar (POST /), ajustar (POST /:id/adjustment) e alterar (PUT /:id): só admin com perfil de acesso "sistema" (mesma regra de Faturas; admin sem perfil ou Master continua podendo). Arquivo: apps/backend/src/routes/wallets.ts.
2. /api/project-products — admin igual a antes. GET / (produtos do projeto): agência/empresa só dos próprios projetos; Líder só onde tem tarefa visível para ele; nômade = lista vazia. Vincular (POST /), alterar (PATCH /:id) e desvincular (DELETE /:id): só admin ou a agência/empresa dona do projeto; senão 404 e nada muda. GET /tasks e /tasks/:id: mesmo escopo de /api/project-tasks (tarefa alheia = 404). Arquivo: apps/backend/src/routes/project-products.ts (reaproveita o escopo já usado pelas rotas de tarefas e projetos).
3. Produto já pago (= está num pagamento com status PAGO; decisão do usuário): a agência/empresa dona não muda mais preço ao cliente, comissão nem pagador e não cancela o produto (409, código product_paid_locked, com o motivo); reenviar o mesmo valor e mudar datas continuam aceitos; o admin ainda corrige. Ninguém, nem o admin, remove produto pago (o banco já recusava com erro genérico; agora 409 "Este produto já foi pago e não pode ser removido do projeto."). Tentativa de pagamento que falhou não trava. Exceção: produto do catálogo antigo (nenhum vendido hoje; 1 ainda ativo), porque a tela antiga de criar projeto grava a comissão do checkout logo DEPOIS de pagar — travar quebraria essa tela; cancelar e remover travam para ele também. Na tela do projeto (Produtos → lixeira → Desvincular), a recusa agora aparece num aviso com o motivo — antes a janela só ficava parada. Arquivos: apps/backend/src/routes/project-products.ts e apps/frontend/components/project-view-slide-panel.tsx.
4. Telas: as rotas de carteiras só eram chamadas pelo admin; agência e empresa leem o próprio saldo por /api/wallet-topup/summary (não mudou). Produtos/tarefas: telas de projeto do admin, da agência e da empresa (sempre o próprio projeto) e checkout. Líder e Nômade não usam essas rotas.

MEDIDO PELO CLAUDE (navegador interno, sessão admin, só abrir/olhar; nada salvo)
- Financeiro → Carteiras (7 carteiras, totais, previsão), extrato da Lamego Academy, detalhes de créditos e Conciliação: todos 200.
- proj_956 → Produtos e Tarefas (T015718/T015719) 200; Faturamento → Formas de Pagamento "Saldo: AK$ 1.174,46 (R$ 1.174,46)" 200; depois da trava, o proj_956 recarregado fez 25 chamadas, todas 200.
- Usuários → Lamego Academy → carteira da organização AK$ 1.174,46 (200).
- Limites: só o perfil admin foi visto pelo Claude (não usar nem pedir senha); os demais perfis e a trava do produto pago foram provados pelos testes abaixo, nunca no banco real.

TESTES
- Servidor, banco descartável, um arquivo por execução: novo apps/backend/src/routes/wallets-project-products-access.integration.test.ts 15/15 (duas agências — a B Partner ativa —, empresa, nômade, Líder com área, admin sem perfil e admin só leitura; 4 cenários de produto pago: dona não muda nem cancela, mesmo valor e datas passam, admin corrige, ninguém remove, catálogo antigo grava a comissão; cada recusa confere que nada mudou). Já existentes: agency-link-contract 6/6 e task-release-orchestration 34/34.
- Telas: novo apps/frontend/components/project-view-slide-panel.unlink-error.test.tsx 1/1 (o aviso mostra o motivo e fecha a confirmação); os testes que já abriam essa tela 9/9.
- Typecheck limpo no servidor e nas telas.

RETESTE (proj_956 existente; sem compra, pagamento, lançamento ou ajuste de saldo; abra a aba Rede do navegador)
1. Como Agência 1: proj_956 → Produtos, Tarefas (Lista e Kanban), olho do produto → tarefas do produto, Faturamento → Formas de Pagamento — tudo igual a antes (T015718/T015719; saldo AK$ 1.174,46, o mesmo do topo); saldo do topo e Meu Perfil iguais. Na aba Rede, nenhuma chamada a /api/wallets ou /api/project-products volta 403/404.
2. Como admin: Financeiro → Carteiras (7 carteiras, extrato), Conciliação e detalhes de créditos; Usuários → Lamego Academy → carteira com saldo; proj_956 → Formas de Pagamento com a carteira Lamego. Nenhum 403/404 nessas rotas. NÃO fazer ajuste de saldo.
3. Produto já pago: NÃO tentar desvincular, cancelar nem mudar preço/comissão de produto no banco real (alterar ou excluir dado real não é autorizado) — a trava foi provada pelos testes. Só conferir que os dois produtos do proj_956 continuam iguais na aba Produtos.
4. Se encontrar alguma tela de outro perfil (Empresa, Nômade, Líder, Partner) que tenha deixado de mostrar saldo, produto ou tarefa, anote a tela e a chamada que voltou 403/404.
Fora deste reteste: as rotas de projeto (GET/PUT/DELETE /api/projects) ainda tratam Nômade como "vê todos os projetos" e o DELETE não barra o Líder — está sendo tratado numa tarefa separada do Claude. Decisões do usuário em aberto (não mexidas): comissão na renovação e pagador, faturas da agência, centavo, líder "qa-user-leader" da T015719, L5/L2, slides antigos, tabelas largas em cartão no tablet.

NÃO AUTORIZADO: commit, push, deploy, espelho, QA/allka.store, publicação, nova compra, novo pagamento, lançamento, ajuste de saldo, exclusão de dados, criar/promover Líder ou Nômade, mudar preço/tarifa/hora/prazo/ID/credencial/papel, worker no banco real, gravar senha/link/token em documento.
```

## Atualização Claude → Codex — 02/11: menu Mais novo + revisão celular/tablet (MENSAGEM ÚNICA — inclui cabeçalho 768, Kanban, cartões e saldo)

> Mensagem ÚNICA pronta para colar no Codex: cobre esta rodada (pedido novo do usuário) e a de baixo (retorno do reteste de 01/11), que ainda não tinha sido enviada — não é preciso colar a de baixo separadamente. Detalhes na seção 11 do relatório do fluxo (dois primeiros blocos).

```text
Retomar a Plataforma Allka 2026 — correções do Claude de 02/11 em DUAS partes: (A) cabeçalho 768, Kanban, cartões e saldo (retorno do seu reteste de 01/11); (B) menu "Mais" novo e revisão das telas no celular/tablet (pedido novo do usuário). SOMENTE LOCAL (http://localhost:8082).
Repositório: C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026

LEIA PRIMEIRO
1. C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026\docs\fluxo-ponta-a-ponta-agencia-nomade-2026-10-31.md — seção 11, os DOIS primeiros blocos: "Correções do Claude — revisão das telas no celular/tablet + menu Mais novo" (parte B) e "Correções do Claude — cabeçalho 768, Kanban, cartões e saldo" (parte A).
2. C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026\docs\RETOMAR-AQUI.md — dois primeiros blocos.
3. C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026\docs\deploy-log.md — duas primeiras entradas (registro; NÃO é deploy).
4. C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026\docs\padroes-globais.md — item 9 "Menu Mais (celular)" e "Abas e seletores no celular" (padrões existentes catalogados, NÃO finais).

PARTE A — O QUE FOI FEITO (desktop ≥ 1024 px igual ao aprovado; nenhum dado gravado; nenhuma regra comercial mudou)
1. Cabeçalho em 768 px: entre 768 e 1023 px a busca vira só o ícone (nome acessível "Buscar"), o saldo mostra só o valor e quem cede espaço é a saudação "Boa noite…"; perfil, saldo, cesta, sino e busca ficam inteiros e clicáveis. Arquivo: apps/frontend/components/header.tsx.
2. Kanban (aba Tarefas e tarefas do produto): abaixo de 1024 px vira grade — 2 colunas no tablet, 1 no celular; desktop continua com as 6 colunas.
3. Cartões: código real T015718/T015719 (número virtual só em dado antigo sem código, igual à Lista); olho abre o mesmo detalhe da Lista; "Sem executor atribuído"/"Sem líder atribuído" quando não há ninguém; com atribuição, admin vê o nome e os demais "Nômade atribuído"/"Equipe Allka" (nomes NÃO saem do servidor para não-admin). Arquivos: apps/frontend/components/project-management-modal.tsx, apps/frontend/lib/project-display.ts, apps/backend/src/routes/project-products.ts.
4. Escape: com o detalhe da tarefa aberto sobre o projeto, cada Escape fecha só a tela de cima (detalhe → depois o projeto). Arquivo: apps/frontend/components/embedded-slide-screen.tsx.
5. Faturamento > Formas de Pagamento: saldo real em vez de 0 fixo, só leitura — agência/empresa pela MESMA fonte do topo; admin pela carteira do dono do projeto (como em Financeiro > Carteiras); sem fonte = "indisponível". Arquivo novo: apps/frontend/lib/project-wallet.ts.

PARTE B — O QUE FOI FEITO (só tela estreita; desktop ≥ 1024 px igual; nenhum dado gravado; nenhuma regra mudou)
6. Menu "Mais" do celular/tablet refeito: folha que sobe de baixo com grade de ícones coloridos + o nome de cada item; os MESMOS itens, ordem e permissões da barra lateral do perfil logado ("Principal" com os itens soltos + uma seção por grupo, todos os subitens à vista, sem sanfona); busca "Buscar no menu" (sem diferença de acento/maiúscula); fecha no X, no Escape, tocando no fundo ou arrastando a alça para baixo; tocar num ícone abre a tela e fecha o menu; a página de trás não rola; contadores só reais (os números de demonstração saíram); mantidos perfil, Roadmap e chamados (mesma permissão/atalho do desktop), Central de Atenções, Aparência (tema e fonte) e Sair da Conta. Ícones por linha: 3 abaixo de 400 px, 4 de 400 a 639, 5 de 640 a 767, 6 a partir de 768. Arquivos: apps/frontend/components/app-menu-drawer.tsx (reescrito), apps/frontend/lib/navigation-store.ts (novo), apps/frontend/components/sidebar.tsx (só publica o menu que já monta).
7. Revisão das 33 telas do menu do admin em 360/390/768/1480 e correções: barras de abas do componente compartilhado quebram linha abaixo de 768 px (apps/frontend/components/ui/tabs.tsx); seletores de Financeiro e Relatórios quebram linha; tabelas da Allkademy, de Acesso a chamados e do painel de acesso ao Roadmap viram cartão pelo padrão tabela-cartao (e-mail longo quebra); barra e paginação do Cadastro de Produtos quebram linha; seletor de Pacotes ocupa a linha inteira no celular; cartões de Modelos de dashboard quebram linha; nome longo em Especialidades quebra em 2 linhas no celular. Arquivos: apps/frontend/app/admin/{financeiro,relatorios,allkademy,acesso-chamados,produtos,pacotes,dashboard-templates,especialidades}/page.tsx e apps/frontend/components/central-chamados-access-panel.tsx.

MEDIDO PELO CLAUDE (navegador interno, sessão admin, só abrir/olhar; nada salvo)
- Parte A, proj_956: 390×844 — Kanban 1 coluna sem rolagem/corte; cartões T015719/T015718 com "Sem executor/líder atribuído"; olho do SEO abre o detalhe (tar15718); um Escape real fecha só o detalhe; Formas de Pagamento "Saldo: AK$ 1.174,46 (R$ 1.174,46)". 768×1024 — página 768 px (antes 771 no Admin), perfil inteiro, Kanban 2 colunas; Agência SIMULADA (saldo 140 px + cesta 36 px na mesma barra): página continua 768 px. 1480×800 — igual ao aprovado.
- Parte B, 33 telas: 360×740 e 390×844 — nenhuma tela rola de lado e nenhum elemento fica cortado; 768×1024 — nada cortado, e as tabelas largas continuam tabela rolando DENTRO da própria área, como hoje (Allkademy, Financeiro, Cadastro de Produtos, Usuários, Disponibilidade, Especialidades, Acesso a chamados); 1480×800 — telas alteradas iguais (página 1480 px, abas/seletores numa linha, tabelas com cabeçalho). Menu "Mais" em 360/390/412/768 — 3/3/4/6 ícones por linha, sem rolagem de lado.
- Limites: só o perfil admin foi visto pelo Claude (sem sessão de Agência/Empresa/Nômade/Líder/Partner; não usar nem pedir senha). GET /api/wallets aceita qualquer usuário logado (achado de segurança anterior, não mexido; a tela da Agência não usa essa rota).

TESTES
- Servidor (banco descartável): agency-link-contract 6/6 (cenário 6: ids de executor/Líder para todos, nomes só para admin). Typecheck limpo.
- Telas: app-menu-drawer 12/12 (+4: mesmo menu da barra lateral com todos os subitens; sem contadores inventados; busca sem acento; fecha no X/Escape/fundo/arrasto), project-wallet 3/3, project-display 13/13, embedded-slide-screen 5/5; 14 arquivos ligados às duas partes = 107 testes passando. Suíte completa 1.884 ✓ / 74 ✗ nos MESMOS 5 arquivos antigos; as 2 falhas a mais (admin/produtos e admin/usuarios) passam rodando sozinhas e esses arquivos sozinhos dão as contagens antigas (35 e 5) — oscilação por carga, já registrada antes. Typecheck limpo.
- O jsdom não mede layout: os tamanhos reais foram medidos no navegador (acima).

RETESTE (proj_956 existente; sem compra, pagamento, lançamento ou ajuste; como Agência 1 E admin; em 360×740, 390×844, 768×1024 e 1480×800)
1. Cabeçalho em 768: nada passa da tela; perfil inteiro; busca (ícone), saldo e cesta clicáveis; 1480 igual ao aprovado.
2. Projeto > Tarefas > Kanban: 1 coluna no celular, 2 no tablet, 6 no desktop; nenhuma coluna/ação escondida.
3. Cartões: T015718/T015719; "Sem executor/líder atribuído"; olho do SEO abre o detalhe; Escape fecha só o detalhe e o segundo Escape fecha o projeto. Mesmas regras em Produtos > olho > tarefas do produto (lista e Kanban).
4. Faturamento > Formas de Pagamento: Agência = saldo do topo (AK$ 1.174,46); admin = carteira Lamego; NÃO trocar forma de pagamento.
5. Menu "Mais" (celular/tablet): abre de baixo; grade de ícones com nome; os mesmos itens da barra lateral do perfil (comparar com o desktop); busca; fecha no X, no Escape, no fundo e arrastando a alça; tocar num ícone abre a tela certa e fecha o menu.
6. Telas do menu da Agência 1 (e do admin) no celular e no tablet: página sem rolar de lado, nada cortado, tabelas em cartão abaixo de 768 px, abas e seletores quebrando linha; desktop 1480 igual.
Decisões do usuário continuam abertas (comissão na renovação e pagador, faturas da agência, centavo, líder "qa-user-leader" da T015719, L5/L2, slides antigos fora do caminho testado; e se as tabelas largas devem virar cartão também no tablet).

NÃO AUTORIZADO: commit, push, deploy, espelho, QA/allka.store, publicação, nova compra, novo pagamento, lançamento, ajuste de saldo, exclusão de dados, criar/promover Líder ou Nômade, mudar preço/tarifa/hora/prazo/ID/credencial/papel, worker no banco real, gravar senha/link/token em documento.
```

## Atualização Claude → Codex — 02/11 (madrugada): cabeçalho 768, Kanban, cartões e saldo

> **Já incluída na mensagem única acima (02/11) — não colar separado.** Mensagem pronta para colar no Codex. Responde ao "Retorno Codex → Claude: responsividade Agência e achados Kanban/saldo" logo abaixo. Detalhes na seção 11 do relatório do fluxo (primeiro bloco).

```text
Retomar a Plataforma Allka 2026 — correções do Claude: cabeçalho 768, Kanban, cartões e saldo (02/11, madrugada). SOMENTE LOCAL (http://localhost:8082).
Repositório: C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026

LEIA PRIMEIRO
1. C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026\docs\fluxo-ponta-a-ponta-agencia-nomade-2026-10-31.md — seção 11, PRIMEIRO bloco "Correções do Claude — cabeçalho 768, Kanban, cartões e saldo" (antes/agora, medidas, testes, limites, roteiro).
2. C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026\docs\RETOMAR-AQUI.md — primeiro bloco.
3. C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026\docs\deploy-log.md — primeira entrada (registro; NÃO é deploy).

O QUE FOI FEITO (desktop ≥ 1024 px igual ao aprovado; nenhum dado gravado; nenhuma regra comercial mudou)
1. Cabeçalho em 768 px: entre 768 e 1023 px a busca vira só o ícone (nome acessível "Buscar"), o saldo mostra só o valor e quem cede espaço é a saudação "Boa noite…"; perfil, saldo, cesta, sino e busca ficam inteiros e clicáveis. Arquivo: apps/frontend/components/header.tsx.
2. Kanban (aba Tarefas e tarefas do produto): abaixo de 1024 px vira grade — 2 colunas no tablet, 1 no celular; todas as colunas e cartões visíveis sem rolagem lateral. Desktop continua com as 6 colunas.
3. Cartões: código real T015718/T015719 (número virtual só em dado antigo sem código, igual à Lista); olho abre o mesmo detalhe da Lista; "Sem executor atribuído"/"Sem líder atribuído" quando não há ninguém; com atribuição, admin vê o nome e os demais "Nômade atribuído"/"Equipe Allka" (nomes NÃO saem do servidor para não-admin). Arquivos: apps/frontend/components/project-management-modal.tsx, apps/frontend/lib/project-display.ts, apps/backend/src/routes/project-products.ts.
4. Escape (achado nesta rodada): com o detalhe da tarefa aberto sobre o projeto, um Escape fechava o projeto de trás e deixava o detalhe solto; agora cada Escape fecha só a tela de cima. Arquivo: apps/frontend/components/embedded-slide-screen.tsx.
5. Faturamento > Formas de Pagamento: saldo real em vez de 0 fixo, só leitura — agência/empresa pela MESMA fonte do topo; admin pela carteira do dono do projeto (como em Financeiro > Carteiras); sem fonte = "indisponível". Arquivo novo: apps/frontend/lib/project-wallet.ts.

MEDIDO PELO CLAUDE (navegador interno, sessão admin, proj_956, só abrir/fechar)
- 390×844: Kanban 1 coluna sem rolagem/corte; cartões T015719/T015718 com "Sem executor/líder atribuído"; olho do SEO abre o detalhe (tar15718); um Escape real fecha só o detalhe e o projeto fica no Kanban; Formas de Pagamento "Saldo: AK$ 1.174,46 (R$ 1.174,46)".
- 768×1024: página 768 px (antes 771 no Admin); perfil inteiro; Kanban 2 colunas sem rolagem. Agência SIMULADA (saldo 140 px + cesta 36 px na mesma barra): página continua 768 px e perfil inteiro.
- 1480×800: igual ao aprovado (busca 270 px com "Buscar...", Kanban com 6 colunas e rolagem própria como antes).
- Limites: Agência real não vista pelo Claude (sem sessão). GET /api/wallets aceita qualquer usuário logado (achado de segurança anterior, não mexido) — a tela da Agência não usa essa rota.

TESTES
- Servidor (banco descartável): agency-link-contract 6/6 — cenário 6 novo: ids de executor/Líder para todos, nomes só para admin. Typecheck limpo.
- Telas: project-wallet 3/3 (novo), project-display 13/13 (+3), embedded-slide-screen 5/5 (+1 Escape em telas empilhadas) + 15 suítes vizinhas = 18 arquivos/105 testes passando. Suíte completa 1.882 ✓ / 72 ✗ = os mesmos 5 arquivos antigos com as mesmas contagens. Typecheck limpo.
- O jsdom não mede layout: tamanhos reais medidos no navegador (bloco acima).

RETESTE (proj_956 existente; sem compra, pagamento, lançamento ou ajuste; como Agência 1 E admin, em 390×844, 768×1024 e 1480×800)
1. Cabeçalho em 768: nada passa da tela; perfil inteiro; busca (ícone), saldo e cesta clicáveis; em 1480 igual ao aprovado.
2. Projeto > Tarefas > Kanban: 1 coluna no celular, 2 no tablet, 6 no desktop; nenhuma coluna/ação escondida.
3. Cartões: T015718/T015719; "Sem executor atribuído"/"Sem líder atribuído"; olho do SEO abre o detalhe; Escape fecha só o detalhe e o projeto continua; segundo Escape fecha o projeto.
4. Produtos > olho > tarefas do produto: mesmas regras na lista e no Kanban.
5. Faturamento > Formas de Pagamento: Agência = mesmo saldo do topo (AK$ 1.174,46); admin = saldo da carteira Lamego; NÃO trocar forma de pagamento.
Decisões do usuário continuam abertas (comissão na renovação e pagador, faturas da agência, centavo, líder "qa-user-leader" da T015719, L5/L2, slides antigos fora do caminho testado).
Pedido novo do usuário (ainda não iniciado): revisar UX/tamanhos de todas as telas no celular e no tablet e refazer o menu "Mais" do celular (menu deslizante com grade de ícones + nome de cada item). Não fazer isso no reteste.

NÃO AUTORIZADO: commit, push, deploy, espelho, QA/allka.store, publicação, nova compra, novo pagamento, lançamento, ajuste de saldo, exclusão de dados, criar/promover Líder ou Nômade, mudar preço/tarifa/hora/prazo/ID/credencial/papel, worker no banco real, gravar senha/link/token em documento.
```

## Retorno Codex → Claude: responsividade Agência e achados Kanban/saldo (01/11)

**Complemento posterior:** usuário entrou comoAdmin e retesteAdmin foi FEITO:390/768/1480 semoverflow interno nas3áreas; fatura390/X/Escape passaram; Kanban1534/313 e códigosvirtuais reproduzidos. CabeçalhoAdmin768gera771px, Agência902px. Não pedir novo loginAdmin para esta rodada; origem finalAdmin/projetos/956,Faturamento. Só retorno pós-login específico continua pendente. Este complemento supera menções de Admin pendente mais abaixo.

Leia o PRIMEIRO bloco§11 do relatório: “Reteste Codex da responsividade — Agência 1”.390px passou nas9abas/Produtos/Lista/Faturas em cartão/janela da fatura;1480px preservado. Corrigir pontualmente:
1. Cabeçalho globalAgência768px: página902px/perfil cortado (não apenas3px do admin). Manter todos os controles acessíveis sem overflow.
2. Kanban390px:1534px em313px; adaptar mobile sem mudar status/regras nem mover/lançar tarefas. Não esconder colunas/ações sem acesso alternativo.
3. Kanban códigos#1001/#2001 derivadosdeuniqueId, em vez dos task_codeT015718/T015719. OlhoSEOclicado não abre nada; botãoEye semonClick no componente. Reusar detalhe da Lista e código real; manter fallbacklegado seguro. Não mudar IDs do banco. RevisarNômade/EquipeAllka para não sugerir atribuição inexistente nem expor nomes protegidos.
4. Projeto>Faturamento>Formas de Pagamento mostra saldo0 fixo, topo Agência1174,46; project-management-modal.tsx tem walletBalanceuseState(0). Ler carteira real autorizada ou indicar indisponibilidade, nunca ajustar saldo nem mudar forma de pagamento/regra.

Preservar o desktop aprovado, campos, cores/fontes, padrões e correções anteriores. Criar regressões pertinentes e testar390/768/1480px, Lista/Kanban e fechamento da fatura. RetesteAdmin desta rodada ainda depende de login manual; Codex não tentou senha antiga/reset. Nenhuma aplicação alterada pelo Codex. Somente local, mesmo proj_956; sem compra/pagamento/lançamento/ajuste/publicação/commit/push/deploy/QA. Atualizar continuidade/relatório/deploy-log e devolver resultados, limites e próximo clique. Placar14/28;T28nãoencerrado.

## Atualização Claude → Codex — 01/11 (fim da noite): tela do projeto no celular

> Mensagem pronta para colar no Codex. Responde ao "Retorno Codex → Claude: desktop passou, corrigir mobile" logo abaixo. Detalhes na seção 11 do relatório do fluxo (primeiro bloco).

```text
Retomar a Plataforma Allka 2026 — correção do Claude: tela do projeto no celular (01/11, fim da noite). SOMENTE LOCAL (http://localhost:8082).
Repositório: C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026

LEIA PRIMEIRO
1. C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026\docs\fluxo-ponta-a-ponta-agencia-nomade-2026-10-31.md — seção 11, PRIMEIRO bloco "Correções do Claude — tela do projeto no celular" (antes/depois por área, medidas, testes, limites, roteiro).
2. C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026\docs\RETOMAR-AQUI.md — primeiro bloco.
3. C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026\docs\deploy-log.md — primeira entrada (registro; NÃO é deploy).

O QUE FOI FEITO (só apresentação no celular/tablet; desktop ≥ 1024 px sem mudança; nenhum dado gravado; nenhuma regra comercial mudou)
1. Abas do projeto: abaixo de 1024 px quebram em linhas (390 px: 3×3; 768 px: 2 linhas); no desktop a mesma grade de 9 colunas. Arquivo novo apps/frontend/components/project-tabs-list.tsx (mesma marcação de antes).
2. Produtos: barra "Adicionar Produto · Filtros · Ordem" quebra linha; nome do produto inteiro e selos quebram linha; Contratação/Entrega em linhas próprias (os "•" decorativos somem no celular).
3. Faturamento > Faturas: abaixo de 768 px a tabela vira cartão pelo padrão global tabela-cartao (legendas Situação, Fatura, Descrição, Vencimento, Valor; olho e PDF no rodapé; descrição inteira); resumo em 1 coluna; olho e PDF com nome acessível ("Ver detalhes da fatura INV-…", "Baixar PDF da fatura INV-…"). Arquivo novo apps/frontend/components/project-invoices-table.tsx (mesma marcação).
4. Tarefas (achado nesta rodada): barra de busca/Lista-Kanban/itens/Filtros/paginação e selo do produto ficavam CORTADOS no celular; agora quebram em linhas; a situação da tarefa ("Para lançamento") aparece também abaixo de 640 px (antes ficava escondida).
5. Detalhes da Fatura: nome longo do produto quebra a linha no celular (a tabela da janela tinha 387 px em 324 px).
Arquivos alterados: apps/frontend/components/project-management-modal.tsx, apps/frontend/components/project-invoice-details-window.tsx.

MEDIDO PELO CLAUDE (navegador interno, sessão admin já aberta, proj_956, só abrir/fechar)
- 390×844: página 390 px; as 9 abas (incluindo Faturamento > Formas de Pagamento) com 0 rolagem lateral e 0 elemento cortado; fatura em cartão; Detalhes da Fatura sem rolagem lateral; Escape real e X fecham só a janela e o projeto continua em Faturamento.
- 768×1024: abas em 2 linhas; as 9 abas sem rolagem/corte; faturas em tabela.
- 1480×800: igual ao aprovado (abas em grade de 9 colunas, 32 px; barra de Produtos numa linha; tabela com cabeçalho; resumo em 3 colunas).
- Limite fora desta tela, NÃO mexido: em 768 px o botão de perfil do cabeçalho global passa 3 px (página 771 px). Kanban das tarefas não medido. Agência não conferida pelo Claude (mesmos componentes).

TESTES (01/11, fim da noite)
- Telas: novos project-tabs-list 2/2 e project-invoices-table 3/3; project-invoice-details-window 3/3 (caso novo do nome longo); + 11 suítes vizinhas = 14 arquivos/71 testes passando. Suíte completa 1.875 ✓ / 72 ✗ = os mesmos 5 arquivos antigos (admin/produtos, admin/catalogo-produtos, admin/usuarios, iallka-floating-icon, user-view-slide-panel-permissions-tab; 2 falhas a menos por oscilação). Typecheck limpo.
- Servidor: sem mudança nesta rodada.
- O jsdom não mede layout: tamanhos reais medidos no navegador (bloco acima).

RETESTE (proj_956 existente; sem compra, pagamento, lançamento ou ajuste; como admin E Agência 1, em 390×844, 768×1024 e 1480×800)
1. Abas: sem rolagem lateral (celular 3×3, tablet 2 linhas); desktop igual ao aprovado.
2. Produtos: barra, nomes completos, selos e Contratação/Entrega visíveis sem rolar de lado; olho de cada produto alcançável.
3. Tarefas: busca, Lista/Kanban, itens por página, Filtros, paginação, situação e ações alcançáveis sem rolar de lado (NÃO lançar).
4. Faturamento: INV-2026-0016 em cartão com legendas; olho e PDF; resumo em 1 coluna no celular.
5. Olho → Detalhes da Fatura: sem rolagem lateral; X e Escape fecham só a janela; o projeto continua em Faturamento.
6. Desktop 1480: comparar com o aprovado; nada pode ter mudado.
Se aprovar: T28 fica só com o retorno pós-login específico (pendência anterior). Decisões do usuário continuam abertas (comissão na renovação e pagador, faturas da agência, centavo, líder "qa-user-leader" da T015719, L5/L2, slides antigos fora do caminho testado).

NÃO AUTORIZADO: commit, push, deploy, espelho, QA/allka.store, publicação, nova compra, novo pagamento, lançamento, ajuste de saldo, exclusão de dados, criar/promover Líder ou Nômade, mudar preço/tarifa/hora/prazo/ID/credencial/papel, worker no banco real, gravar senha/link/token em documento.
```

## Retorno Codex → Claude: desktop passou, corrigir mobile (01/11)

Leia o PRIMEIRO bloco da seção11 do relatório, “Reteste Codex após T28 + Janela Moldura”. Comissões/Extrato/Ajuste/Projeções, Produtos, Tarefas, Faturamento/fatura e Log passaram no recorte desktop, admin e Agência1, mesmo proj_956. Não refazer compra/pagamento/lançamento, não alterar dados/regras nem deploy.

Corrigir responsividade em390×844: abas1223px em348px; conteúdoProdutos552px em337px; tabelaFaturamento641px em291px. Página global390px, mas conteúdo/ações precisam de rolagem horizontal interna. Adaptar abas e conteúdo/tabela para caber sem scroll lateral, mantendo todos os campos e ações acessíveis, desktop intacto e padrões existentes. Não converter painéis corretos indiscriminadamente nem esconder dados. Cobrir também Detalhes da Fatura e testar fechamento preservando projeto. Criar regressões pertinentes, verificar390/768/1480px e typecheck. Atualizar continuidade/relatório/deploy-log e devolver resultados/limites/próximos cliques. Codex retesta após retorno.

Agência1 segue autenticada em /agency/projetos/956,Faturamento. Sem código de aplicação alterado por Codex; viewport restaurado. T28 ainda parcial (mobile e retorno pós-login específico), placar14/28. Decisões anteriores e falhas automáticas não foram resolvidas nem reclassificadas por este reteste.

## Atualização Claude → Codex — 01/11 (fim da noite): auditoria T28 + Janela Moldura

> Mensagem pronta para colar no Codex. Responde à "Segunda rodada Codex → Claude: auditoria ADMIN T28" logo abaixo e ao complemento do usuário (Comissões em Janela Moldura; conferir as aberturas do fluxo). Supera a mensagem de 01/11 (noite) mais abaixo. Detalhes na seção 11 do relatório do fluxo (primeiro bloco).

```text
Retomar a Plataforma Allka 2026 — correções do Claude: auditoria ADMIN T28 + padrão de abertura (01/11, fim da noite). SOMENTE LOCAL (http://localhost:8082).
Repositório: C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026

LEIA PRIMEIRO
1. C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026\docs\fluxo-ponta-a-ponta-agencia-nomade-2026-10-31.md — seção 11, PRIMEIRO bloco "Correções do Claude — auditoria T28 + padrão de abertura" (tabela item a item, arquivos, testes, aberturas conferidas, roteiro de reteste).
2. C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026\docs\RETOMAR-AQUI.md — primeiro bloco.
3. C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026\docs\deploy-log.md — primeira entrada (registro; NÃO é deploy).
4. C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026\docs\padroes-globais.md — padrão 5 (Janela Moldura): onde passou a ser usada. O padrão não mudou.

O QUE FOI FEITO (apresentação; nenhuma regra de preço, comissão, prazo, permissão ou papel mudou; nenhum dado gravado)
1. Financeiro > Carteiras > Comissões: slide lateral → Janela Moldura (FramedModal). Fundo preto 60%/2px começando depois da sidebar; sidebar e seus botões livres; clique no fundo bloqueado sem fechar; cabeçalho e X dentro da janela, acima do cabeçalho global; só o corpo rola; X/Escape fecham só a janela; reabre; tela de origem preservada. O mesmo nos demais cartões de movimentação, Extrato da carteira, Projeções e Ajuste manual (Ajuste aberto do Extrato fica POR CIMA dele). Arquivos: apps/frontend/app/admin/financeiro/wallet-window.tsx (novo), apps/frontend/app/admin/financeiro/page.tsx.
2. Projeto > Faturamento: resumo sem "Carteira/15-10-2025/15-11-2025" — forma e data do último pagamento aprovado e próxima cobrança da fatura em aberto ou da assinatura ativa (proj_956: Cartão (teste), 01/11/2026, próxima 01/12/2026 com a nota "fatura emitida em 26/11; nenhuma cobrança emitida ainda"); sem dado = —. Card "Plano Mensal" (projetos antigos mensais) sem dia 15 suposto. "Detalhes da Fatura" (olho) virou Janela Moldura e não quebra mais com a fatura real. Arquivos: apps/frontend/components/project-management-modal.tsx, apps/frontend/components/project-invoice-details-window.tsx (novo), apps/frontend/lib/project-display.ts (novo), apps/backend/src/routes/projects.ts (GET /billing devolve agenda das assinaturas, sem valores, e itens congelados do pagamento — só leitura).
3. Projeto > Produtos: itens do catálogo novo com nome/categoria congelados na compra + selo de modalidade por produto; filtro Tipo (Avulso/Mensal) compara a modalidade; sem data de reserva 01/01/2000.
4. Log: autoria só pelo que foi registrado (criador do projeto; Sistema; Cliente final pelo link; "Autoria não registrada"); nunca o usuário que está vendo. Arquivos: apps/backend/src/routes/projects.ts (GET /log), apps/backend/src/lib/agency-checkout.ts e apps/backend/src/routes/agency-payment-link.ts (constante com o MESMO texto já gravado no pagamento do link).
5. Tarefas do projeto: "Lançar até 01/12/2026 · Lançar em até 30d" (prazo PARA LANÇAR, não de entrega; data e regra iguais).
6. Cabeçalho do projeto misto: "Avulso + Mensal" com ⓘ por produto (o campo lifecycle do projeto não é preenchido pela compra do catálogo novo e NÃO foi gravado; contrato e recorrência intactos).
7. Escape numa janela por cima não fecha mais a tela do projeto atrás (apps/frontend/components/embedded-slide-screen.tsx).

ABERTURAS DO FLUXO CONFERIDAS E MANTIDAS: checkout "Criar projeto" = Painel Moldura; "Cadastrar consultor/cliente" = Janela Moldura; cesta = Tela Slide global; projeto, detalhe de tarefa e lançar tarefa = Tela Slide no painel; janelas comuns com fundo preto; Nova/Editar fatura = StandardModalDialog; acordeões.
SLIDES ANTIGOS NÃO CONVERTIDOS (fora do caminho testado; decisão do usuário): Projeto > Cofre > Compartilhar credencial; Tarefas > resumo do projeto > tarefa; detalhes/edição/compartilhar widgets do painel da Agência; Financeiro > Squad > ciclo atual. Se encontrar outro desvio no reteste, registre para o Claude — não converta.

TESTES (01/11, fim da noite)
- Servidor (banco descartável, um arquivo por execução): agency-link-contract 5/5 (cenário 5 novo: /billing e /log), catalog2-checkout 28/28 (rodado sozinho), financial-billing-security 21/21, project-registered-contacts 11/11, project-archiving 15/15, catalog2-subscriptions 8/8, catalog2-e2e-scenarios 10/10; project-admin-responsible 18/21 — 3 falhas antigas do motor de alertas (não tocado nesta rodada; não investigado). Typecheck limpo.
- Telas: arquivos novos/alterados 21/21 (project-display 10, wallet-window 4, project-invoice-details-window 3, embedded-slide-screen 4 — o caso do Escape falha sem a correção) + 6 vizinhos = 56/56; suíte completa 1.868 ✓ / 74 ✗ = as mesmas 74 falhas antigas (admin/produtos, admin/catalogo-produtos, admin/usuarios, iallka-floating-icon, user-view-slide-panel-permissions-tab). Typecheck limpo.
- Navegador interno (sessão admin que já estava aberta, 1480×800, só abrir/fechar): os itens 1–5 do roteiro abaixo passaram, inclusive Escape real e sidebar recolhida/expandida com a janela aberta. Falta o lado da Agência e o celular (itens 6).

RETESTE (proj_956 existente; sem compra, pagamento, lançamento ou ajuste de saldo)
1. Admin > /admin/financeiro > Carteiras > cartão Comissões: Janela Moldura com 1 movimentação AK$ 174,46 (proj_956/Lamego). Recolher e expandir a sidebar com a janela aberta; clicar no fundo (não fecha); X fecha; reabrir; Escape fecha. Repetir em outro cartão e em Projeções.
2. Carteiras > linha Lamego Academy > Ver extrato > Ajuste: abre por cima do extrato; Cancelar/Escape fecha só o ajuste. NÃO confirmar ajuste.
3. /admin/projetos > proj_956: cabeçalho "Avulso + Mensal" (ⓘ por produto); Produtos: SEO — Otimização para Buscadores / Performance / Avulso e Manutenção e Alteração de Site ou Loja Virtual / Soluções Web / Mensal; Tarefas: "Lançar até 01/12/2026 · Lançar em até 30d" (NÃO lançar).
4. Faturamento: Cartão (teste) · 01/11/2026 · 01/12/2026 + nota; olho da INV-2026-0016: Janela Moldura com Lamego Academy, Teste cliente, Cartão (teste), vencimento —, pago 01/11/2026, itens SEO R$ 1.540,22 e Manutenção R$ 608,44; Escape fecha só a janela e a tela do projeto continua.
5. Log: Projeto criado → Lamego Academy; Tarefas geradas e fatura → Sistema; Pagamento aprovado → Cliente final — pelo link de pagamento; produtos e status → Autoria não registrada.
6. Repetir 3–5 como Agência 1 (/agency/projetos) e em tela estreita/celular (sem rolagem lateral).
Depois: decisões do usuário continuam pendentes (comissão na renovação e quem paga, agência ver faturas, centavo da renovação, líder "qa-user-leader" da T015719, L5/L2, e se converte os slides antigos listados). Só depois: gravação do produto avulso, e por último a do produto com ciclos — sem publicar.

NÃO AUTORIZADO: commit, push, deploy, espelho, QA/allka.store, publicação, nova compra, novo pagamento, lançamento, ajuste de saldo, exclusão de dados, criar/promover Líder ou Nômade, mudar preço/tarifa/hora/prazo/ID/credencial/papel, worker no banco real, gravar senha/link/token em documento.
```

## Segunda rodada Codex → Claude: auditoria ADMIN T28 (01/11)

**Adendo visual solicitado pelo usuário:** conferir também o padrão de cada abertura durante os testes, registrar divergências para Claude corrigir e depois Codex retestar. Preservar Painéis Moldura e accordions corretos; não converter toda a plataforma indiscriminadamente. Comissões deve ser Janela Moldura, conforme item4 atualizado. Adendo documental, ainda não implementado.

Usuário entrou como admin manualmente; Codex conferiu proj_956 existente, fatura2148,66 e1comissão174,46. **Não refazer a compra nem o pagamento. Não lançar tarefas.** Detalhes/evidências no início da seção11 do relatório ponta a ponta, bloco Auditoria ADMIN T28.

Corrigir pontualmente sem mudar layout/regra/dados:
1. `components/project-management-modal.tsx`: remover data/método fixos do resumoFaturamento (Carteira,15/10/2025,15/11/2025). Mostrar pagamento e agendamento reais ou— quando desconhecido; não assumir próximo débito ou gerar renovação.
2. Mesmo componente: abaProdutos mostra dois— para itens catalog2; mapear nome/categoria congelados do contrato, preservando fallbacklegado, opções/quantidade/modalidade. O mapeamento perto448 só lê pp.product?.name/category.
3. Log: autoria real dos eventos ausente na tela; usar ator registrado, Sistema ou autoriaindisponível conforme evidência, nunca adminatual como substituto.
4. Financeiro > Carteiras > Comissões: substituir o slide lateral por **Janela Moldura (`FramedModal`, em `@/components/framed-panel`)**, conforme pedido explícito do usuário e `docs/padroes-globais.md`. Não basta corrigir a camada do slide. Overlay preto60%/blur2px, encaixado na sidebar; sidebar e seus controles permitidos acessíveis, restante do fundo bloqueado. Cabeçalho e X dentro da janela, sem sobreposição global; somente corpo rolável. X/Escape fecham só a janela atual, preservando origem. Manter dados e funcionalidades. Testar abrir/fechar/reabrir, camadas, sidebar aberta/fechada e responsividade.
5. Lista de tarefas dentro do projeto:01/12/Venceem30d vem de lancamento_expires_at, rotular prazoPARALANÇAR e separar do prazodeentrega, sem modificar data/regra.
6. Projeto misto apareceAvulso no cabeçalho. Investigar/clarificar modalidade do projeto×itens(avulsoSEO e mensalmanutenção), sem alterar contratos.

Criar regressões para catalog2semproductlegado, datas semfallbackfalso, autoria e camada/fechamento. Rodar suítes pertinentes isoladas e typecheck. Nenhum novo pedido/pagamento/lançamento, reset de credencial, alteração de preço/commission/horas/prazo, publicação, commit/push/deploy/QA. Decisões anteriores permanecem pendentes (comissão recorrente, faturas agência, centavo, líder específico inexistente). Preserve correções anteriores e worktree de ambos agentes.

Ao terminar, atualizar RETOMAR-AQUI, relatório§11, esta passagem e deploy-log; retornar resultado poritem/arquivos/testes/limites/próximocliqueCodex. Placar atual14/28concluídos;T28defeituoso,3parciais,10bloqueados. Codex retesta no mesmo proj_956, sem compra nova.

---

## Atualização Claude → Codex — 01/11 (noite), correções do proj_956

> Mensagem pronta para colar no Codex. Supera a mensagem de 01/11 (manhã) mais abaixo. Detalhes completos na seção 11 do relatório do fluxo.

```text
Retomar a Plataforma Allka 2026 — correções do Claude sobre o proj_956 (01/11, noite). SOMENTE LOCAL (http://localhost:8082).
Repositório: C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026

LEIA PRIMEIRO
1. C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026\docs\fluxo-ponta-a-ponta-agencia-nomade-2026-10-31.md — seção 11, bloco "Correções e investigações do Claude — 01/11 (noite)" (tabela item a item, investigações, testes, achados, decisões e roteiro de reteste).
2. C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026\docs\RETOMAR-AQUI.md — primeiro bloco (01/11 noite).
3. C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026\docs\deploy-log.md — primeira entrada "Pendente de deploy — 01/11 (noite)" (é registro, NÃO é deploy).

O QUE FOI CORRIGIDO (tudo APRESENTAÇÃO; nenhuma regra de preço, comissão, permissão ou papel mudou)
1. Consultor ≠ Líder: a tela lia o consultor do projeto nos campos de Líder. Agora o Consultor vem de project.consultant_user e o Líder de lider_responsavel da tarefa; sem Líder = "Sem líder atribuído". Lista: coluna/filtro Líder = Líder da tarefa; coluna Consultor nova, oculta por padrão. Arquivos: apps/backend/src/routes/project-tasks.ts, apps/frontend/lib/task-display.ts (novo), apps/frontend/components/tarefa-detail-drawer.tsx, apps/frontend/app/admin/tarefas/page.tsx.
2. Cliente "—": as tarefas liam só o cliente legado (client_id, nulo); o cliente escolhido está em project.client_record ("Teste cliente"). Mesmos arquivos do item 1.
3. "Company" fixo: o adaptador caía em "company" quando company_type é nulo. Agora a categoria vem do vínculo real (agency_id → Agency) e o selo mostra "Agency · Partner" quando o perfil Partner está ativo. company_type NÃO foi gravado. Arquivos: apps/frontend/lib/project-adapter.ts, apps/frontend/app/admin/projetos/page.tsx, apps/backend/src/routes/projects.ts.
4. "Para lançamento" + "Em lançamento": o 2º era a situação do fluxo derivada, que tratava PARA_LANCAMENTO como "em lançamento". Novo estado derivado aguardando_lancamento ("Aguardando lançamento") e o chip diz o escopo ("Fluxo: …"). Status/banco continuam PARA_LANCAMENTO; comprar não lança. Arquivos: apps/backend/src/lib/task-flow-state.ts, apps/frontend/components/task-flow-card.tsx.
5. "tarefa-127": era o código do modelo do catálogo. O detalhe mostra o código da tarefa no mesmo formato da lista (tar15718 = T015718 do endereço; o original aparece ao passar o mouse). Arquivos: apps/frontend/lib/task-display.ts, components/tarefa-detail-drawer.tsx.
6. Página pública: cabeçalho ganhou degradê de reserva e texto branco (a variável do tema não existe fora do portal logado); cada linha mostra quantidade, avulso/assinatura mensal e renovação, opções contratadas; nunca comissão, custo, projeto ou acessos. Arquivos: apps/backend/src/lib/agency-checkout.ts (publicPaymentItems), apps/backend/src/routes/agency-payment-link.ts, apps/frontend/components/catalog2/agency-client-payment.tsx. Conferido na tela pelo Claude no proj_956 real (já pago, sem clicar em nada).

INVESTIGADO (sem mudar regra)
7. Financeiro da agência: a fatura do proj_956 existe (INV-2026-0016, paid), mas nasce com company_id nulo e GET /billing/invoices devolve vazio para QUALQUER agência, de propósito — hoje nem pedido pago pela própria agência apareceria. A tela agora explica e aponta a Carteira (apps/frontend/app/agencia/financeiro/page.tsx). Decisão do usuário pendente.
8. Comissão na renovação: regra documentada = comissão uma vez por pagamento; "cobrança recorrente com comissão" não foi implementada (docs/plano-operacao-coordenada-qa.md). Teste novo em banco descartável prova o comportamento ATUAL: 1ª cobrança base + % por linha, split e crédito único corretos; assinatura congela só a base (574); a renovação cobra a base, sem comissão, sem crédito e sem split, sem vínculo com a agência e sem link ao cliente. Próxima renovação do proj_956 (cálculo puro, nada disparado): R$ 573,99 (1º mês R$ 574,00 — 1 centavo de arredondamento). Decisão do usuário pendente.
9. Painel Partner: o topo usava números de demonstração do código (124/38/Diamond/R$ 22,4k) e proporções inventadas; agora topo, widget de métricas e widget "Programa Partner" usam a mesma fonte real (apps/frontend/lib/partner-program-metrics.ts, app/partner/dashboard/page.tsx). Outros widgets do painel Partner continuam demonstrativos (fora deste item).

16 TESTES ANTIGOS DO CATÁLOGO: alinhados às regras atuais, sem afrouxar (catalog2-store 12/12, catalog2-product-detail 12/12). Eles acharam 3 defeitos reais de tela, corrigidos: "Novo" escondia "Pausado"/"Pré-lançamento"; motivo/pendências não apareciam na visão em lista; "Pré-lançamento" aparecia como "Em preparação" no detalhe (components/catalog2/catalog2-store.tsx, components/catalog2-product-detail.tsx).

TESTES (01/11 noite)
- Backend: 16 arquivos, 195 testes, 0 falhas — um arquivo por execução, banco descartável próprio (novo apps/backend/src/routes/agency-link-contract.integration.test.ts 4/4; checkout 28, implantação 13, assinaturas 8, ciclos 9, continuidade 5, renovação de período 4, e2e 10, liberação 34, rodízio 19, qualificação 4, contatos do projeto 11, visibilidade 4, segurança financeira 21, sessões de lançamento 12, pacotes 9). Typecheck limpo.
- Frontend: typecheck limpo; testes novos/alterados 25/25; catálogo 24/24; suíte completa 1.850 ✓ / 74 ✗, todas em arquivos que não usam nada desta rodada (admin/produtos/page 35, admin/catalogo-produtos/page 29, iallka-floating-icon 2, user-view-slide-panel-permissions-tab 1 — lista antiga; admin/usuarios/page 5 — fora da lista antiga, não investigado).

DADOS: nenhum dado do banco real alterado. Nada de worker/scheduler no banco real. Link público do proj_956 gerado só para a conferência visual (leitura), não guardado.

ACHADO NOVO: Produto 2 V1 (publicada) tem a etapa "Análise de Briefing e Acessos" com Líder ESPECÍFICO "qa-user-leader", que não existe no banco local; a T015719 herdou isso → a etapa 1 vai travar ao lançar. Na V2 (rascunho) essa etapa já é líder automático. Nada alterado.

DECISÕES DO USUÁRIO (não decidir por ele)
1. Comissão na renovação: só na 1ª cobrança ou todo mês? Se todo mês: quem paga a renovação (cliente por link mensal ou agência).
2. A agência deve ver (só leitura) as faturas dos pedidos dela, inclusive as pagas pelo cliente?
3. Líder "qa-user-leader" da V1 do Produto 2: publicar a V2, escolher um Líder real no lançamento, ou outra saída.
4. Arredondamento da renovação (1 centavo).
5. Pendentes de antes: Líder/Nômade operacionais (L5), "nômade específico" (L2), Líder que executa e qualifica.

PRÓXIMO CLIQUE (reteste no proj_956 existente — sem comprar, pagar ou lançar)
1. Agência 1 (ou admin) → /agency/tarefas → abrir T015718: código tar15718; "Para lançamento" + "Fluxo: Aguardando lançamento"; Cliente = Teste cliente; Consultor = Teste; Líder = Sem líder atribuído; cartão Projeto diz "Consultor".
2. Lista de tarefas: coluna Cliente = Teste cliente nas duas; ligar a coluna Consultor no seletor de colunas → Teste.
3. Abrir T015719: mesmas conferências; não lançar (achado do líder).
4. /agency/projetos → proj_956: selo "Agency · Partner".
5. Página pública: só se o link do pagamento de 01/11 ainda estiver no histórico (vale 24 h); não criar pedido novo para isso.
6. /agency/financeiro: nota explicando faturas × Carteira (AK$ 1.174,46).
7. /partner/dashboard: topo e widgets com os mesmos números reais (sem 124/38/Diamond).
Depois: T28 (o usuário entra como admin; não pedir/registrar senha), parciais T09/T10/T13/T25; T04 e T16–T24 seguem dependendo de Líder/Nômade e de autorização de lançamento. Só depois: gravação do produto avulso, e por último a do produto com ciclos — sem publicar.

NÃO AUTORIZADO: commit, push, deploy, espelho, QA/allka.store, publicação, nova compra, novo pagamento, lançamento, exclusão de dados, criar/promover Líder ou Nômade, mudar preço/tarifa/hora/prazo/ID/credencial/papel, worker no banco real, gravar senha/link/token em documento.
```

---

## Atualização Codex → Claude — após a execução de 01/11

O texto histórico abaixo foi superado pela **seção11 de `docs/fluxo-ponta-a-ponta-agencia-nomade-2026-10-31.md`**, com resultado por teste, dados criados e nove pontos para corrigir/investigar. Leia também o primeiro bloco de RETOMAR-AQUI. Usuário agora pediu execução autônoma pela tela e autorizou especificamente pedido+pagamento sandbox local, sem lançamento.

**Pedido real de teste:** proj_956 — [TESTE CODEX 01-11] Contratação SEO. Total cliente2148,66, comissão174,46, plataforma1974,20. GatewayFAKE_SANDBOX: 1recusa+1aprovado; 1fatura e 1comissão; carteira1174,46. T015718 SEO1unidade e T015719 manutenção2unidades agrupadas, ambas PARA_LANCAMENTO. V1 publicada de ambos; V2 não vazou. Não recriar, excluir, lançar, publicar nem modificar matriz para corrigir apresentação.

**Regressão final Codex:** 120/120 testes existentes em oito suítes, um banco descartável por arquivo (checkout28, implantação13, liberação34, rodízio19, qualificação4, ciclos9, assinaturas8, continuidade5). Não equivale a aprovação visual nem cobre ainda comissão recorrente por link. Detalhes e tentativa concorrente descartada na seção11.

**Trabalho pedido ao Claude:** corrija somente problemas comprovados e acrescente regressões, sem alterar a estrutura/layout atual. (1) separar consultor de Líder nos rótulos/fontes da tarefa; (2) mostrar cliente persistido do projeto nas tarefas; (3) badge real de Agency em vez de Company no projeto; (4) status da tarefa não confundir com estado da etapa; (5) código operacional T015718 em vez de tarefa-127; (6) página pública de pagamento com contraste correto, quantidade/modalidade/recorrência e opções contratadas, nunca expor comissão/custo/acessos. **Investigar antes de corrigir:** fatura local existe paid mas agência mostra0faturas; assinatura mensal grava574 enquanto cliente pagou608,44 com6% — verificar regra e split nas renovações em banco descartável, não alterar regra sem definição. Dashboard Partner exibe contagens demonstrativas incoerentes; não tratar como dado real. Detalhes/evidências na seção11.

Não redesenhar, não remover campos nem funcionalidades, não mudar tarifas/preços/horas/prazos/IDs/credenciais ou promover usuários. Preservar trabalho ainda sem commit de ambos agentes. Atualizar os16testes antigos do catálogo conforme especificação atual, sem relaxar expectativas para ocultar defeitos. Testes de banco **um arquivo por execução, banco descartável por arquivo**. Nunca executar scheduler no allka real. Sem GitHub/deploy/espelho/QA.

Ao terminar, atualizar RETOMAR-AQUI, este arquivo, seção11 do relatório e deploy-log: mudanças por arquivo, testes exatos, dados tocados, o que continua pendente e próximo clique do Codex. Não afirmar tudo aprovado por testes automáticos. Controle do navegador foi desativado durante conferência final; admin também precisa entrar (credencial antiga do README recusada). NÃO redefinir/pedir senha. Nômade/Líder operacionais seguem faltando; não criar/promover por conta própria.

Para o retorno ao Codex: retestar as correções usando proj_956 existente; conferir admin/auditoria e pagamento público deslogado. Não repetir compra nem lançamento automaticamente. Gravação avulsa só depois dessas correções/validação; produto com ciclos permanece posterior.

---

> Mensagem pronta para colar no Codex. Cobre tudo o que o Claude fez depois da última entrega do Codex (31/10). Não autoriza commit, push, deploy, espelho, publicação, compra, lançamento nem mensagem real.

```text
Retomar a Plataforma Allka 2026 — passagem do Claude para o Codex (01/11). SOMENTE LOCAL (http://localhost:8082).
Repositório: C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026
(os caminhos de código abaixo são relativos a essa pasta)

ESCOPO
Tudo o que o Claude fez depois da sua última entrega de 31/10 (IA/MAX_TOKENS, acesso reutilizado, "Sem assinatura"): o pedido "fluxo ponta a ponta Agência/Nômade" (31/10 noite) e os testes manuais T01–T03.
Conferido em 01/11 (só leitura): nenhum arquivo mudou depois de 31/10 17:13 e a última gravação no banco local é de 31/10 17:10 (Brasília). Nada commitado: git status com 59 entradas sobre o commit 6d83ca8 (29/10), trabalho do Claude e do Codex — não reverter nada.

LEIA, NESTA ORDEM
1. C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026\docs\fluxo-ponta-a-ponta-agencia-nomade-2026-10-31.md
   Relatório único. Seção 4 = lacunas L1–L7 · 5 = o que foi feito em cada etapa (P0–P10) · 6 = testes e resultados · 7 = dados alterados · 8 = pendências · 10 = roteiro manual T01–T28 e tabela do que já foi executado.
2. C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026\docs\RETOMAR-AQUI.md
   Seção 4: "ATUALIZAÇÃO (31/10 ~17:10)" e "PRÓXIMO PASSO EXATO (31/10 noite)".
3. C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026\docs\deploy-log.md
   Primeira entrada, "Pendente de deploy — 31/10 (noite)" (é registro, NÃO é deploy).
Esta mensagem também está em C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026\docs\passagem-codex-2026-11-01.md

1. CONFERÊNCIA DO QUE VOCÊ DEIXOU (P0) — nada alterado
- Typecheck do frontend limpo; step-row-universal.test.tsx + product-editor-typing.test.tsx = 59/59.
- Tela real: SEO 003 → Conferência, preço e publicação → "Modalidades por período" mostra "Sem assinatura".
- Preservados: apps/backend/src/lib/catalog2-product-draft-ai.ts (+ catalog2-product-draft-ai.test.ts), apps/frontend/app/admin/produtos/novo-catalogo/product-editor.tsx, step-row-universal.test.tsx, product-editor-typing.test.tsx.

2. MAPA DE LACUNAS (antes de mexer: 32 suítes de banco em bancos descartáveis + testes de tela dos portais + tela real; quase todo o fluxo já existia e passou)
- L1 desconto salvo não atualizava o resto do editor até F5 → CORRIGIDO
- L2 "nômade específico" como destino de etapa não existe → DECISÃO DO USUÁRIO (campo novo = mudança de layout/regra); não implementado
- L3 teste de "aceitar oferta" com expectativa rígida → TESTE CORRIGIDO
- L4 16 testes de tela do catálogo procuram textos antigos → PENDENTE
- L5 base sem Líder ativo e sem Nômade habilitado → BLOQUEIA os testes manuais T16–T24; não cadastrar/promover sem pedido
- L6 o executor podia qualificar a própria entrega (pessoa específica) → CORRIGIDO
- L7 16 cenários de ciclos/implantação falhavam por comprar sem projeto (422 project_required) → TESTES ATUALIZADOS

3. CÓDIGO ALTERADO (2 correções; sem migração; sem mudança visual)
L1 — desconto atualiza o editor inteiro sem F5:
- apps/frontend/app/admin/produtos/novo-catalogo/product-periods-inline.tsx: exporta PERIODS_CHANGED_EVENT ("catalog2:periods-changed"), notifyPeriodsChanged(productId) e usePeriodsChanged(productId, onChange). A faixa de períodos avisa ao salvar e recarrega quando ouve o aviso do mesmo produto.
- apps/frontend/app/admin/produtos/novo-catalogo/product-editor.tsx: o painel "Modalidades por período" (ProductPeriodsPanel) avisa nas 5 gravações, em vez de só recarregar a si mesmo, e também ouve.
- apps/frontend/app/admin/produtos/novo-catalogo/header-price-tag.tsx: a etiqueta de preço do cabeçalho recalcula quando ouve.
L6 — quem executou não qualifica a própria entrega:
- apps/backend/src/lib/stage-engine.ts (seguirParaEspecialistaOuAprovacao): se a "pessoa específica" que qualifica é quem executou/entregou a etapa, a conferência vai para o líder (EM_QUALIFICACAO), com o motivo no histórico; no modo líder + pessoa, depois que o líder aprova, a 2ª conferência é dispensada e registrada. decidirEtapa passa a devolver o estado real.
- apps/backend/src/routes/qualificacoes.ts: o nômade executor não vê nem decide a própria etapa; a pessoa específica que entregou também não; admin continua podendo; etapas sem nômade continuam na lista do líder.
- NÃO mudou: o Líder que executa uma etapa de Líder ainda pode qualificá-la (não há regra registrada).

4. TESTES ALTERADOS (sem mudar regra de negócio)
- apps/backend/src/routes/qualificacoes.integration.test.ts: +QAL03 (executor-especialista não aparece na lista, 404 ao abrir, 403 ao decidir) e +QAL04 (vai ao líder com o motivo; líder + pessoa dispensa a 2ª conferência; resposta com o estado real).
- apps/backend/src/routes/catalog2-delivery-cycles.integration.test.ts e apps/backend/src/routes/catalog2-implementation-billing.integration.test.ts: escolhem o projeto antes da compra (auxiliar withCheckoutProject). Antes 1/9 e 5/13; agora 9/9 e 13/13.
- apps/frontend/app/admin/produtos/novo-catalogo/product-periods-inline.test.tsx: +2 (aviso vindo de outro lugar atualiza a faixa; aviso de outro produto é ignorado; salvar aqui avisa).
- apps/frontend/components/task-offer-prompt.test.tsx: expectativa de navegação atualizada (o componente já estava certo).

5. RESULTADOS AUTOMÁTICOS (31/10; nenhum arquivo de código mudou depois)
- Backend: 32 suítes, 316 testes, 0 falhas; regressão do motor de etapas depois da L6: 112/112; typecheck limpo. Lista suíte a suíte na seção 6 do relatório.
  Comando: o da linha 78 do README.md (TEST_DATABASE_URL/TEST_DATABASE_ADMIN_URL no banco allka_test + `npx tsx scripts/run-db-tests.ts <arquivo>` em apps/backend; cada suíte cria e apaga o próprio allka_test_*; nunca apontar para o banco allka).
- Frontend: typecheck limpo (`npx tsc -p tsconfig.json --noEmit` em apps/frontend); pasta app/admin/produtos/novo-catalogo + components/task-offer-prompt.test.tsx (`npx vitest run ...`) = 71 arquivos, 483/483.
- Falhas que continuam (antigas, L4): 16 testes de tela com textos antigos — components/catalog2/catalog2-store.test.tsx (9) e components/catalog2-product-detail.test.tsx (7).

6. TESTES MANUAIS PELA TELA (Claude, como admin, 31/10 ~17:10) — roteiro na seção 10 do relatório
- T01 🟢 Salvar e continuar (SEO 003, V2 rascunho): avançou para o passo 2 sem erro; F5 manteve a V2, o passo 2 e o texto; restaurado ao texto exato; V1 publicada intocada (conferido no banco).
- T02 ⛔ Bloqueado: o controle de permissões do ambiente recusou mudar o desconto, porque ele é compartilhado com a V1 publicada. Nada gravado. A L1 tem teste automático; falta a prova na tela.
- T03 🟢 Matriz alterada não muda o contratado: proj_955/T015717 manteve as etapas geradas em 28/10, embora a V2 do Produto 2 tenha sido editada depois (inclusive com a ordem trocada).
- T04–T28 ⏸ Parados: exigem login de Agência, Company, Nômade ou Líder (o Claude não tem nem pede senha), e não existem Líder ativo nem Nômade habilitado.
Placar: 2 aprovados, 1 bloqueado, 25 restantes. Nada tem aprovação do usuário ainda.

FAROL POR ÁREA (🟡 = testes automáticos ok, falta tela com perfis reais e aprovação do usuário)
Produto 🟡 (T01 ok na tela; T02 bloqueado) · Catálogo 🟡 (16 testes de tela desatualizados) · Projeto/cliente/consultor 🟡 · Compra 🟡 (só sandbox) · Comissão 🟡 · Geração de tarefas 🟡 (T03 ok) · Lançamento 🟡 (precisa Líder/Nômade) · Nômade 🟡 (nenhum habilitado) · Líder 🔴 (não existe Líder ativo) · Qualificação/aprovação 🟡 (L6 corrigida) · Ciclos/renovação 🟡 · Automações 🟡 (sem disparos externos)

7. DADOS DO BANCO LOCAL REAL (allka) ALTERADOS — tudo restaurado
- Produto 2, Mensal: 2% → 5% → 2% (teste autorizado, 31/10 16:32–16:34). Bimestral 4, trimestral 6, semestral 8, anual 10: intocados.
- SEO 003, V2 rascunho: "Teste T01." na descrição curta e depois apagado (T01); texto exato de volta, só o updated_at mudou.
- Nada mais. Nenhuma cotação, compra, pagamento, lançamento, publicação ou mensagem.

8. ESTADO ATUAL (conferido em 01/11, só leitura)
- Produto 2: V1 publicada + V2 rascunho; Mensal 2%.
- SEO 003: V1 publicada + V2 rascunho (entregável "Checklist final de SEO — validação local" e +1 dia na opção até dez páginas).
- proj_955 (compra sandbox de 28/10): T015717 em PARA_LANCAMENTO — não lançar. proj_952 (QA): como estava em 26/10.
- Usuários ativos: 2 admin, 1 company_admin, 3 agency_admin, 1 agency_consultant, 1 nomad_admin. Nenhum Líder; nenhum registro em nomades.

9. PENDÊNCIAS E DECISÕES DO USUÁRIO
- T02: o usuário faz, ou autoriza de novo no momento (o desconto mexe no preço da V1 publicada enquanto durar).
- T04 em diante: o usuário entra com a própria conta no navegador; nunca pedir nem anotar senha.
- L5: cadastrar conscientemente um Líder ativo e um Nômade habilitado antes do T16 (não promover admin).
- L2: criar ou não "nômade específico" como destino de etapa.
- Líder que executa e qualifica a própria etapa: manter ou separar.
- L4: atualizar os 16 testes de tela do catálogo antes do próximo deploy.
- Conferir: as etapas contratadas da T015717 estão com horas_execucao vazio (não investigado; não afirmar que é defeito).

10. PRÓXIMO PASSO EXATO
(1) T02, com o usuário → (2) T04 em diante, um por vez, só avançando com o "funcionou" do usuário (T09, T13, T16 e T18 também exigem autorização no momento) → (3) depois dos testes, refazer a gravação do produto avulso e só então a do produto com ciclos, sem publicar.

NÃO AUTORIZADO: commit, push, deploy, espelho, QA/allka.store, publicação de produto, compra/pagamento/lançamento reais, mensagem real, IA paga, criar V2, cadastrar/promover Líder, mudar layout, excluir dados, db push no banco real, gravar senha ou credencial em documento.
```
