# Teste do ciclo da agência ao nômade

## Estado atual

### Continuação mais recente — compra e briefings realizados

- CUA voltou a funcionar. Pela interface Agência, cesta e cotação conferidas em **R$1.226,32**, projeto957, uma unidade avulsa de SEO003 e Manutenção002, comissão0. O usuário autorizou aceitar termos/confirmar/simular pagamento após ver o total corrigido.
- Pedido confirmado pela UI, link do cliente aberto e **Simular pagamento** aprovado (cartão de simulação da própria tela). Sem cartão real ou dinheiro real. Consultar pagamento confirmou projeto ativo e tarefas disponíveis, sem distribuição iniciada na compra.
- Geradas **T015720 SEO (4 etapas)** e **T015721 Manutenção (2 etapas)**. SEO: três perguntas respondidas. Manutenção: nove perguntas, seis obrigatórias respondidas. URLs e escopo demonstrativos, sem credenciais/site real. Manutenção informa que não há conteúdo nem backup real; tratar como simulação, não liberar serviço real com esse material.
- Ambos os briefings enviados pela interface. SEO inicialmente manteve painel aberto após sucesso; persistência confirmou briefing em análise. Manutenção foi enviada após correção do fechamento e o painel fechou corretamente. Lista passou a mostrar Briefing em análise em vez da reserva incorreta Para lançamento.
- Admin Vinicius logado pelo usuário. Conferiu respostas e acionou **Aprovar e liberar** somente no SEO. Ação pelo teclado funcionou; estado persistido posteriormente **AGUARDANDO_NOMADE**. Manutenção permanece **LANCAMENTO_ENVIADO_PARA_ANALISE**. Não chamar isso de execução ou distribuição completa.
- Perfil operacional do Reynário preparado **por script de cenário, não pelo formulário da UI**, com autorização explícita posterior. Usuário atual preservado; 1 Nomade ativo, 2 NomadeHabilidade (Performance/SEO e Web/Manutenção, com referência aos produtos). CNPJ vazio, termos não aceitos, sem outra senha/login/carteira, sem Líder/qualificador. Script `apps/backend/src/scripts/prepare-reynario-e2e-local.ts`: trava host local, banco allka, usuário e tarefas exatos; simulação por padrão. Rodou simulação → aplicação → simulação; confirmou perfil existente e2 vínculos. Isso não homologa cadastro normal/CNPJ nem elegibilidade de produção.
- Claude criou Rose Líder em paralelo. Conferido posteriormente: `rose.lider@lamego.com.vc`, user_9, role/account_type lider, ativa, área Geral ativa. Antiga Rose Empresa renomeada Carla pelo Claude; não refazer. Nenhuma dessas alterações foi enviada ao QA nesta rodada.
- **Bloqueios restantes:** SEO primeira etapa exige Líder e está EM_ANDAMENTO sem lider_id; demais3 bloqueadas. Manutenção primeira etapa aponta para `qa-user-leader` antigo (não Rose), demais bloqueadas. Não alterar matriz publicada nem marcar concluída artificialmente; verificar correção do responsável da execução no cenário. Conexões Search Console/site/WordPress ficaram para depois. Não foram fornecidos acessos reais.
- Navegador voltou a recusar acesso após a nova mensagem do usuário (`Local browser use is disabled in Work settings`), antes do login/teste como Rose. **Não há aceite, execução, entrega, reprovação ou ajuste pelo Reynário nesta rodada.** Não repetir compra/projeto.

### Correções de interface desta continuação

- `TaskLaunchDrawer`: Painel Moldura padrão (substitui EmbeddedSlideScreen), rodapé quebra linhas, título compacto, área de conteúdo com limites; cliente vem também de client_record.
- Lista compartilhada Admin/Agência respeita launchDrawerOpen para desmontar após fechar/enviar. Envio sinaliza análise, não liberação de execução. Dois estados de briefing ganharam rótulo próprio.
- Agência deixava passar `isAdmin=true` ao detalhe compartilhado. Agora recebe falso no portal Agency; revisão continua para Admin/Líder. Servidor já exigia Admin/Líder para liberar briefing em análise; não houve concessão de permissão nova.
- Regressões em task-launch-drawer.test.tsx + conexões/deep-link/referência: **22/22** na execução final, já com cliente vinculado. Checagens frontend e backend limpas; git diff --check passou.
- Achados ainda não corrigidos: fluxo derivado diz Em execução enquanto briefing em análise; cabeçalho de detalhe alto/clipe em319px dificulta clique (Enter funcionou); Novo Projeto fora checkout sem pesquisas vinculadas.

As seções de investigação abaixo são históricas; a recusa inicial do usuário foi superada somente após a correção do valor e a autorização específica posterior. Não interpretar as notas antigas como estado atual de pedido não pago.

Atualização da correção: `createQuote` agora só reaproveita cotação futura, não vinculada a pedido/projeto, com preço, prazo, moeda e fotografias de cálculo/execução iguais aos atuais. Cotações anteriores não são reescritas. Três regressões novas passaram em banco descartável (vencimento, mudança de regra e referência operacional divergente com mesmo total); o teste existente de repetição e o isolamento de contas também passaram. Suíte completa: **29/30**; falha no teste 3b de listagem da prévia administrativa, fora da função alterada, ainda sem comparação de baseline nesta rodada. Typecheck backend limpo.

**Reteste visual pendente:** em 03/11 a ferramenta de navegador retornou `Local browser use is disabled in Work settings` ao selecionar a aba. Não há prova visual do novo total e não se confirmou/pagou o pedido. Reativar o navegador, voltar à cesta/checkout, gerar novamente as cotações e conferir R$1.226,32 (se os dados comerciais continuarem os mesmos). Selecionar novamente projeto957 se necessário e pedir confirmação do pedido/termos/pagamento simulado antes de avançar. Não usar API autenticada por fora para fingir teste de tela.

Somente local em 03/11/2026. O usuário pediu criar projeto, contratar dois produtos, lançar, receber e aceitar como nômade, entregar, reprovar como agência, ajustar como nômade e aprovar como agência. Depois escolheu explicitamente **não confirmar o pedido e investigar primeiro a diferença de preço**. Essa decisão é o ponto atual de retomada.

O pedido não foi confirmado. Não houve pagamento, geração de tarefas desta contratação, lançamento, entrega ou aprovação. Não homologar o ciclo completo com os passos abaixo parciais.

## Passos executados na interface

1. Sessão inicial Admin. Usuários mostra Reynário Nunes, ID04, perfil Nômade. Empresas filtradas por Nomad não mostra registros. Diagnóstico somente leitura da tabela operacional Nomade retornou lista vazia. O usuário confirmou que Reynário é a pessoa a usar e autorizou o preparo desse cenário local; não criei outro usuário nem alterei senha ou papel. O preparo operacional ainda não foi realizado.
2. Entrei normalmente na conta de agência Lamego Academy, sem redefinir credencial. Nenhuma senha ou token foi registrado neste relatório.
3. Em Projetos → Novo Projeto, consultor e cliente aparecem como texto livre, sem a pesquisa de cadastros vinculados que existe no checkout. Digitei o nome do cenário e Teste no consultor para inspecionar; cancelei sem salvar esse formulário.
4. No catálogo, adicionei SEO ID003 e Manutenção ID002, uma unidade avulsa de cada, sem adicionais, opção padrão do SEO. Cesta mostrou R$933,47 + R$292,85, soma R$1.226,32.
5. Gerar cotação e continuar apresentou R$1.299,54, diferença de R$73,22.
6. Pelo próprio checkout, criei o projeto **957 — [TESTE CODEX 03-11] Ciclo completo de aprovação**. Consultor Teste e cliente Teste cliente selecionados nas pesquisas da Lamego, e-mail automático. Descrição indica teste local e não execução real. Portfólio desativado. Salvar fechou o painel e devolveu o projeto957 selecionado ao checkout.
7. Selecionei Cliente final paga por link, comissão zero, somente para preparar o pagamento simulado. Não aceitei os termos nem confirmei pedido. Usuário recusou a confirmação até investigar o preço.

## Causa confirmada da diferença de preço

O SEO foi cotado por R$933,47. Para a Manutenção, há uma cotação existente marcada com status `valida`, criada em **26/10/2026**, preço **R$366,07**, quantidade1, versão publicada1 e vencimento em **29/10/2026**. Sua memória usa regra de precificação3. O catálogo atual mostra R$292,85.

Em `apps/backend/src/lib/catalog2-client.ts`, função `createQuote`, o cálculo atual é executado, mas depois a busca idempotente procura a mesma conta/configuração com `status: "valida"` e retorna a existente. A condição não exige `valid_until` futuro nem compara a validade comercial do preço guardado com o recém-calculado. Assim uma cotação vencida e desatualizada pode ser devolvida ao checkout como se fosse a cotação atual.

R$933,47 + R$366,07 = R$1.299,54. R$366,07 − R$292,85 = **R$73,22**. Portanto não é comissão: ela está em zero, e a divergência já existia antes de selecionar o pagador.

Não renovei, cancelei ou editei cotações manualmente; não alterei preços ou versões publicadas. A correção de aplicação foi implementada posteriormente, conforme a atualização no topo.

## Correção proposta antes de retomar

- Não reutilizar cotação vencida apenas porque seu status persistido ainda é valida.
- Também verificar desatualização comercial antes de reutilizar a fotografia da mesma configuração, sem reescrever contratações pagas ou versões publicadas.
- Preservar a proteção contra clique duplo e a separação das contas. Cotação vigente e comercialmente equivalente pode ser reaproveitada; vencida/desatualizada deve gerar a resposta ou renovação explícita adequada, com preço atual claramente revisto.
- Regressões em banco descartável: vencida com status valida, mudança de regra/tarifa sem alteração de seleção, vigente sem mudança, clique duplo e conta distinta. Depois repetir a cesta e o checkout pela interface.
- Não aceitar automaticamente novos termos ou pagar após a correção: mostrar o total revisto e obter a confirmação necessária para o pedido simulado local.

## Farol

| Passo | Situação |
| --- | --- |
| Login real da agência | Confirmado |
| Dois produtos na cesta | Confirmado |
| Projeto957 com cliente e consultor vinculados, retorno ao checkout | Confirmado |
| Preço coerente cesta e cotação | Confirmado na UI:1.226,32 |
| Novo Projeto fora do checkout com vínculos pesquisáveis | Inconsistente com o checkout, ajuste pendente |
| Cadastro operacional do Reynário | Preparado por script autorizado local; CNPJ/termos pendentes |
| Confirmação e pagamento simulado | Confirmados pela UI |
| Tarefas, etapas e envio dos briefings | Confirmados; SEO liberado por Admin, Manutenção em análise |
| Distribuição ao Líder, aceite do Reynário | Pendentes, com vínculos de executor a conferir |
| Entrega, reprovação, ajuste e aprovação final | Não executados nesta rodada |

Prova local fora do Git: `C:/Users/Teste/.codex/visualizations/2026/08/12/019ff5b6-bd52-7670-bec9-b64609421f78/03-11-e2e-checkout-957.png`. Sessão final Agência, checkout do projeto957. Cesta de teste mantida. Sem exclusão, commit, push, deploy ou espelho. As alterações de código da rodada anterior continuam locais e devem ser preservadas.
