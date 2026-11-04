# Plataforma Allka escopo e prontidão da primeira versão de produção

Atualização: 4 de novembro de 2026. Preparado pelo Codex para Vinícius Guardia e para revisão de desenvolvimento sênior. Ambiente de referência: código e dados locais; publicação conhecida no QA em 3 de novembro. Documento de visão funcional, arquitetura, requisitos de lançamento, evidências e plano de homologação. Não contém credenciais nem dados de pagamento.

## 1 Resumo executivo

A Allka conecta a venda de serviços à sua execução. O administrador cadastra a matriz do produto, com tarefas, etapas, questionários, entregáveis e regras comerciais. Uma empresa habilitada contrata uma versão dessa matriz. O pagamento confirmado gera instâncias operacionais com identificadores próprios e com a configuração contratada preservada. A empresa prepara o lançamento; as regras distribuem as etapas a Líderes, Nômades, equipe interna ou IA. A entrega passa pelas qualificações e aprovações configuradas, admite reprovação e ajuste e termina com histórico e efeitos financeiros rastreáveis.

Já há uma base extensa implementada, testes automatizados e publicação no QA. **A abertura comercial de produção ainda não está homologada.** Os bloqueadores mais importantes são o pagamento real completo, a distribuição e execução ponta a ponta com aprovação e ajuste, o isolamento de acesso entre perfis e empresas, e a operação das automações em ambiente real. Pagamento simulado e testes de componentes não comprovam essas integrações.

O pedido atual do proprietário enfatiza como essenciais: usuários, novos produtos, contratação, pagamento, liberação automática conforme regras, ajuda das IAs, Líderes e Nômades. Isso não cancela silenciosamente os demais compromissos VS1 do planejamento anterior. O sênior e o proprietário precisam fechar o escopo mínimo vendável e registrar qualquer redução formalmente.

## 2 Como interpretar os estados

| Estado | Significado |
|---|---|
| Implementado | Existe caminho no código ou funcionalidade descrita no registro vigente; não garante integração real |
| Testado automaticamente | Cenários passaram no escopo indicado, frequentemente com API simulada ou banco descartável |
| Conferido na interface | O comportamento foi observado no navegador local, no perfil e no cenário citados |
| Homologado para produção | Integração, segurança, operação, recuperação e aceite do responsável comprovados no ambiente final |
| Pendente | Falta implementação, prova, configuração ou decisão; o tipo da pendência deve acompanhar o item |

Nenhuma quantidade de testes verdes substitui o fluxo real e os testes negativos de acesso. Relatos do usuário sobre funcionamento são úteis, mas não substituem a execução reproduzível de todos os cenários de lançamento.

### 2.1 Local e QA não são a mesma versão

- QA `https://allka.store`: deploy de código `2bdde0c`, tag `deploy-2026-11-03-3`, frontend e backend publicados com sucesso em 03/11. O commit posterior `a1553f6` registrou a documentação.
- Espelho autorizado de 03/11 às 19:41:10, Brasília: 240 tabelas idênticas ao pacote congelado; 264 chaves estrangeiras verificadas sem referências quebradas; 131 anexos iguais. Backups preservados. Esses resultados não homologam o negócio.
- Contagens desse espelho, não inventário ao vivo de produção: 9 usuários, 2 empresas, 2 clientes, 5 projetos, 37 produtos e 9 tarefas. Parte do conteúdo é cenário fictício de QA.
- Local em 04/11: correções do Claude ainda sem commit/deploy. Ele informou 219/219 arquivos e 1.984/1.984 testes frontend passando, typecheck limpo e build aprovado. Os seis arquivos afetados passaram 188/188 em três rodadas. O Codex não reexecutou essa bateria nesta conferência.
- CI publicado de 03/11 permaneceu vermelho: 72 testes em cinco arquivos falharam; 1.911 passaram. A correção local ainda precisa ser publicada e aprovada pelo CI. Não apresentar o resultado local como CI online verde.
- `allka.store` é tratado neste projeto como QA. Domínio, contas comerciais, integrações e critérios do ambiente definitivo de produção devem ser confirmados antes da abertura ao público. Site acessível não é sinônimo de lançamento comercial aprovado.

## 3 Empresas usuários e responsabilidades

Empresa é o conceito de negócio. Agency, Agency Partner, Company e Nômade representam categorias da organização na terminologia definida pelo proprietário. Os modelos técnicos preservam nomenclaturas e tabelas diferentes; não presumir que todas as categorias usam os mesmos caminhos de compra.

| Ator | Responsabilidade | Limite obrigatório |
|---|---|---|
| Administrador | Produtos e versões, precificação, usuários, permissões, operação e financeiro | Ser administrador não o torna Líder; ações exigem permissões adequadas |
| Agency | Contratar serviços, gerir clientes e projetos e acompanhar entregas | Só recursos e dados autorizados da sua empresa |
| Agency Partner | Operação de agência com atributos do programa Partner | Partner não autoriza acesso a outras empresas; regras comerciais específicas devem ser conferidas |
| Company | Contratar e acompanhar serviços da própria organização | Isolamento dos recursos da organização |
| Consultor | Usuário cadastrado e vinculado à empresa responsável pelo projeto | Deve ser selecionado do cadastro; não texto livre que invente identidade |
| Cliente vinculado | Pessoa física ou jurídica atendida por uma empresa elegível | Vínculo aponta para empresa existente pelo nome; não apenas rótulo Agency ou Partner |
| Líder | Análise de briefing, acompanhamento e qualificação conforme regra | Perfil próprio; não deve apagar projeto por ter função de Líder |
| Nômade | Receber oferta elegível, aceitar, executar etapas e submeter entrega | Não contrata; não ganha acesso ao projeto inteiro ou a etapas alheias |
| Qualificador | Conferência interna quando configurada | Não deve qualificar a própria execução |

Login e recuperação precisam respeitar o destino interno solicitado, desde que autorizado, sem redirecionar sempre ao dashboard. URL de retorno deve ser validada para impedir redirecionamento externo indevido. F5 deve restaurar o contexto permitido de edição sem perder silenciosamente o rascunho; não equivale a gravar tudo no servidor sem confirmação.

## 4 Jornada principal e invariantes

### 4.1 Da matriz ao preço aprovado

1. Cadastrar nome e descrição, modalidade, classificação, público e visibilidade do produto.
2. Configurar tarefa principal e etapas, em sequência de formulário que evite voltar entre telas para preencher dependências.
3. Em cada etapa, definir executor, especialidade, horas, destino, orientações, checklist, acessos, entregáveis e critérios de qualificação/aprovação. Opções condicionais devem abrir os respectivos campos no mesmo contexto.
4. Acrescentar fluxo, paralelismo e dependências válidas. Produto individual tem uma tarefa principal; combos reúnem produtos/tarefas conforme a composição.
5. Configurar questionário e entregáveis a partir do trabalho definido, com vínculo explícito e reutilização controlada de modelos.
6. Definir variações e adicionais, horas/valor/prazo adicionais, condições de ativação e incidência por primeira execução ou ciclo.
7. Conferir prazo comercial, custos, taxas, margem, descontos por período e quantidade; simular cenários.
8. Resolver bloqueios, salvar rascunho e publicar a versão mediante autorização. Publicação da versão e disponibilidade comercial são conceitos distintos.

O editor novo é o padrão e o antigo está preservado por compatibilidade, sem botão concorrente visível. O novo fluxo tem três passos principais: Produto; Configurações da tarefa e etapas; Conferência, preço e publicação. Referências antigas a cinco passos são históricas. Fonte dos significados dos campos: `apps/frontend/app/admin/produtos/novo-catalogo/field-help.ts`.

**Invariantes:** versão publicada não é editada em silêncio; contratação congela a referência da versão; alterar a matriz não reescreve trabalho já contratado; horas são informadas nas etapas e somadas na tarefa; tarifa global de especialidade não deve ser alterada acidentalmente na tarefa; valor comercial é calculado/validado no servidor. Ausência de base de custo não é preço zero válido.

### 4.2 Da cesta à disponibilização para lançamento

1. Empresa elegível acessa somente os produtos disponíveis para o seu perfil.
2. Escolhe versão comercial oferecida, opções, adicionais, modalidade e quantidade.
3. Detalhe, cesta, cotação e checkout precisam concordar no total, prazo, descontos e incidências.
4. Seleciona projeto existente ou cria dentro do checkout. Consultor e cliente são pesquisados entre registros vinculados à empresa; ausência exige cadastro autorizado, sem perder a compra.
5. Escolhe quem paga: a própria agência/empresa ou cliente final por link. Para a agência, comissão pode ser geral ou por item; quantidade do mesmo item segue a regra contratada.
6. Confirma termos e pagamento pelo meio aprovado. Só confirmação confiável do servidor/provedor pode liquidar o pedido.
7. Cria tarefas e etapas operacionais com novos IDs, snapshot, vínculo à empresa/projeto e quantidade correta. Retry não pode duplicar pedido, débito, comissão ou tarefa.
8. Tarefas ficam disponíveis para preparação do lançamento, sem iniciar execução indevidamente.

O cliente que paga por link vê o preço final combinado, não a decomposição interna do custo ou da comissão. Crédito em carteira e split financeiro efetivamente liquidado no provedor são provas diferentes: ambos precisam de reconciliação antes de oferecer esse modelo comercial.

### 4.3 Do lançamento ao aceite final

1. Agência abre a tarefa contratada e preenche briefing e acessos necessários.
2. Envio para análise não é liberação automática da execução. O estado deve distinguir rascunho, em análise, devolvido e liberado.
3. Líder ou responsável elegível analisa o briefing e aprova/devolve com justificativa.
4. Servidor avalia dependências, datas, pré-requisitos e destinos de cada etapa. Rodízio não pode selecionar pessoa inativa, sem habilitação ou sem permissão.
5. Nômade elegível recebe oferta, aceita ou recusa; após aceite executa apenas o que foi liberado para ele.
6. Entrega conteúdo/evidência pelos canais da plataforma. Qualificação interna, quando exigida, precede a aprovação do cliente.
7. Agência/cliente autorizado aprova ou reprova; reprovação preserva entregas anteriores, registra motivo e devolve ao executor correto.
8. Executor submete ajuste; nova revisão aprova e libera a próxima etapa ou conclui, conforme a matriz contratada.
9. Histórico, prazos, status, notificações, saldo e ganhos precisam refletir o mesmo evento, sem duplicação.

“Liberação automática” deve ser definida por transição: pagamento confirmado gera trabalho disponível; lançamento e análise liberam execução; aprovação e dependências liberam a próxima etapa. Não significa pular briefing, aceite ou qualificação. Aceite por silêncio de uma hora foi autorizado **somente para ofertas obrigatórias**, não para ofertas normais.

### 4.4 Ciclos e continuidade

Avulso corresponde a uma entrega sem renovação. Assinatura mensal cria novos ciclos conforme regra e pagamento; períodos antecipados podem financiar ciclos futuros, sem cobrar novamente o mesmo período. Implantação nasce das etapas de primeira execução e não se repete na renovação normal. Continuidade pode preferir o executor anterior e dispensar etapas previstas como dispensáveis, com crédito/revalidação conforme regra. Esses cenários exigem homologação separada: pagamento inicial aprovado não prova renovação.

## 5 Mapa funcional existente e maturidade

| Área | O que já existe | Situação para produção |
|---|---|---|
| Usuários e acesso | Cadastros, perfis, permissões, bloqueio, primeiro acesso, edição por campo | Conferência parcial em 04/11; auditoria de acesso entre organizações e sessões ainda necessária |
| Empresas e clientes | Listas, vínculos, busca e formulários integrados | Caminho do checkout testado localmente; Novo Projeto fora do checkout precisa alinhar vínculos |
| Produtos novos | Editor integrado, rascunhos, versões, histórico, publicação, checklist | Fluxos locais conferidos; base comercial completa e catálogo de lançamento ainda precisam aceite |
| Modelos globais | Modelos de tarefa/etapa e reaproveitamento | Revisar efeitos de edição global versus cópia e proteção de versões/contratos |
| Precificação | Especialidades, horas, qualificação, taxas, margem, descontos, opções e simulação | Cálculo e cenários têm testes; reconciliação de todas as superfícies e cobertura de criação de especialidade pendentes |
| Catálogo e cesta | Busca, categorias, filtros, grade/lista, detalhe e cesta | Conferido em recortes; preço provisório nunca pode ser cobrado como real |
| Checkout | Projeto obrigatório, consultor e cliente vinculados, cotação e contratação | Pedido local com dois produtos concluído em simulação; não homologa compra com dinheiro real |
| Comissão da agência | Acréscimo geral/por item, link e lançamentos de carteira | Simulação existente; repasse bancário e split real não comprovados |
| Carteira Allkoins | Saldo, movimentações, pagamentos/recarga e integração de intenção de pagamento | Validar lastro, arredondamento, bloqueios, estorno, reconciliação e proteção contra simulação em produção |
| Líder | Área, fila, análise/aprovação/devolução e revisão de etapas | Rose Líder de teste existe; ciclo completo com ela ainda pendente |
| Nômade | Perfil operacional, habilitações, ofertas, aceite, etapas e envio de anexos por API | Código real existe; execução completa do cenário atual ainda não homologada |
| Aprovações | Qualificação e revisão de tarefa/etapa e entregáveis | Falta prova integral com reprovação, ajuste, aprovação e efeitos financeiros |
| IA de ajuda | Aura contextual, sugestões de cadastro, briefing, questionário e guias | Contexto de Aura conferido; qualidade, custos, permissões e provedores precisam aceite por função |
| Execução por IA | Configurações por etapa, gatilhos, custo e qualificação | Não confundir com chat de ajuda; homologar execução real e caminho de erro |
| Automações | Rodízio, datas, dependências, ciclos, assinaturas, alertas e conexões | Workers registrados no backend; provar retomada, idempotência e concorrência em implantação real |
| Financeiro | Faturas, pagamentos, carteiras, comissões e saques | Telas/modelos não provam liquidação ou conciliação financeira real |
| Operação administrativa | Dashboards, relatórios, alertas e acompanhamento | Há indicadores/dados demonstrativos em partes da interface; auditar cada indicador antes de prometer gestão financeira real |
| Suporte | Ajuda e sugestões e integração com Roadmap | Contrato documenta criação/consulta; conferir operação final, permissões e recebimento no ambiente escolhido |
| Legado | Rotas de consulta e estruturas de snapshot/migração | Auditar configuração real e acesso somente leitura; não migrar automaticamente por este relatório |
| Outros módulos | Campanhas, programa Partner, habilitações, Allkademy, gamificação, comunicação, conexões e navegador seguro | Inventário funcional existe, mas não foram homologados integralmente nesta rodada |

## 6 Pagamentos são o principal portão financeiro

### 6.1 Estado encontrado no código

- `payment-gateways/registry.ts`: PagBank está `implemented: true`, `proven: false`; Pix e cartão disponíveis no descritor, recorrência não suportada nesse adaptador. Asaas, Mercado Pago e Stripe estão reservados como não implementados. A existência dos nomes na tela não representa integração funcional.
- `payment-gateways/pagbank.ts`: cria intenção Pix ou página de cartão, consulta situação e interpreta aviso assinado. O cartão direto em `charge()` retorna recusa `hosted_only`; a cobrança hospedada usa outro caminho.
- `payment-webhooks.ts`: aviso do gateway chama `settleIntent`, ligado à recarga de carteira. Não é prova de que o checkout do produto e o link da agência já liquidam pela mesma integração real.
- `agency-payment-link.ts`: o pagamento do link possui caminho `pay-sandbox`; bloqueia esse caminho em `NODE_ENV=production` ou com gateway diferente do falso e informa que pagamento real ainda não está habilitado nesse fluxo.
- `payments.ts` expõe `fake-checkout`; o gateway padrão pode ser `FAKE_SANDBOX`. Revisar todos os caminhos de simulação e suas guardas efetivas em produção. Não se realizou teste ofensivo dessas rotas nesta documentação.
- Há workers de assinaturas e ciclos. Emitir fatura ou abrir ciclo não prova débito recorrente aprovado por adquirente/provedor.

O cabeçalho histórico de `payment-gateway.ts` ainda afirma que só existe gateway falso, embora o registro já inclua PagBank. O sênior deve seguir os chamadores e testes atuais, não esse comentário isolado.

### 6.2 Evidências obrigatórias antes de cobrar

1. Escolher o provedor, meios e modalidades realmente oferecidos na estreia; configuração live pertence ao servidor, nunca ao repositório ou ao relatório.
2. Desenhar e testar o trajeto completo: intenção externa → pagamento → aviso autenticado/consulta → conciliação → liquidação do pedido → crédito/débito/comissão → geração das tarefas.
3. Validar recebedor, moeda, valor em centavos, referência, conta/empresa, situação e assinatura do aviso. Rejeitar aviso adulterado, de outro ambiente ou com valor divergente.
4. Repetir aviso, clique, resposta fora de ordem e retorno do navegador: resultado deve ser único. Redirecionamento de sucesso não pode, sozinho, marcar pagamento como pago.
5. Cobrir pendente, recusado, cancelado, expirado, estorno parcial/total e chargeback; definir efeito sobre tarefas, comissão disponível e saldos já movimentados.
6. Provar comissão e split real ou adotar explicitamente outro modelo operacional aprovado. Ledger interno não equivale a transferência bancária efetuada.
7. Homologar renovação/recorrência, atraso, cancelamento e fim do período pago se assinatura estiver comercialmente disponível.
8. Desabilitar meios/caminhos não homologados e garantir que cartões, simulação e saldos fictícios de teste não sejam aceitos como pagamento real.

Nenhuma dessas etapas autoriza este documento a executar uma cobrança real.

## 7 Arquitetura atual e mapa de manutenção

| Camada | Referência vigente |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind e componentes Radix/shadcn; SPA com rotas em `apps/frontend/App.tsx` |
| Backend | Node, Express, Prisma e validação de entrada; fontes em `apps/backend/src` |
| Banco | MySQL8.4; schema Prisma e migrations versionadas |
| Local | Docker Compose, frontend localhost:8082, API localhost:3001, MySQL local na porta 3306 |
| QA | VPS com Docker Compose, Caddy/HTTPS, imagens frontend/backend do GHCR; site allka.store e API api.allka.store |
| Entrega de código | GitHub Actions no monorepo `allkacp/allka2.0_monorepo`, remote allka2/main |
| Dados e anexos | Banco e uploads persistentes separados de código; transferência exige escopo, backup, ensaio e autorização |
| Assíncrono | Varreduras e agendamentos iniciados em `apps/backend/src/index.ts`, com estado operacional no banco |

Documentos antigos que citam cPanel, PM2 ou SQLite/PostgreSQL não descrevem a implantação atual. Este relatório e o README operacional prevalecem para o inventário atual; o legado deve ser identificado antes de reaproveitar instruções.

### 7.1 Domínios de dados que precisam manter integridade

- Identidade: User, UserProfile, permissões, área de Líder, Nomade e habilitações. Usuário com papel Nômade sem perfil operacional não basta para receber trabalho.
- Matriz: Catalog2Product, versões, tarefas, etapas, modelos, variações, adicionais, questionários, entregáveis e condições.
- Comercial: cotação com snapshots, cesta, itens contratados, pedido/projeto e regras de quantidade/período.
- Execução: ProjectTask, ProjectTaskStage, operações, respostas, entregáveis, qualificações e revisões. IDs operacionais não são IDs da matriz.
- Financeiro: Payment, PaymentItem, Invoice, Wallet e WalletLedger. Preservar referência e idempotência entre cobrança, carteira e contrato.
- Operação: conexões, dependências, eventos, notificações e ciclos persistidos. Não usar estado exclusivamente no navegador como prova de processamento financeiro ou liberação.

### 7.2 Onde começar a revisão do código

| Assunto | Fontes no repositório |
|---|---|
| Editor e campos | `apps/frontend/app/admin/produtos/novo-catalogo/product-editor.tsx`, `field-help.ts` |
| Catálogo e detalhe | `apps/frontend/app/admin/catalogo-produtos/page.tsx`, `apps/frontend/components/catalog2-product-detail.tsx` |
| Checkout e projeto | `apps/frontend/components/catalog2/catalog2-checkout.tsx`, `apps/backend/src/routes/catalog2-checkout.ts` |
| Cotação e snapshot | `apps/backend/src/lib/catalog2-client.ts` e schema Prisma |
| Pagamento e tarefas | `apps/backend/src/lib/confirm-payment.ts`, `routes/payments.ts`, `routes/agency-payment-link.ts` |
| Provedor e carteira | `lib/payment-gateway.ts`, `lib/payment-gateways`, `lib/wallet-topup.ts`, `routes/payment-webhooks.ts` no backend |
| Etapas e distribuição | `apps/backend/src/lib/stage-engine.ts`, `selecionar-nomade.ts`, `task-release-scheduler.ts`, rotas `nomades.ts` e `lider.ts` |
| IA | `apps/frontend/contexts/iallka-context.tsx`; backend `catalog2-ai-providers.ts`, `catalog2-product-draft-ai.ts`, `task-ai.ts` e respectivos testes |
| Segurança | Middleware de autenticação/permissões, guards por recurso e testes de escopo de projetos/Nômade/Líder |
| Infraestrutura | README, `docker/`, `.github/workflows/`, `docs/deploy-hostinger-kvm.md` |

## 8 Automações e integrações a homologar

O backend agenda rodízio de ofertas, liberação por data, dependências, ciclos mensais, renovação de períodos, assinaturas, gatilhos de IA, conexões, alertas e comunicação. O funcionamento não deve depender de uma página aberta.

Para cada automação comercial ou operacional, provar: estado persistido; repetição sem duplicar; retomada após reinício/indisponibilidade; duas instâncias concorrentes sem executar duas vezes; fusos e horários corretos; registro do resultado; alerta quando falha; possibilidade de intervenção controlada. Não adicionar novas execuções ou cobranças durante uma simples consulta.

IA de ajuda e IA executora têm riscos diferentes. A ajuda pode propor texto e explicar campos sem aplicar decisões automaticamente; a executora altera o resultado de uma etapa e exige custo, registro, qualificação, tratamento de falha e autorização adequados. Provedores precisam de limite de uso, proteção contra envio de segredos, segregação de contexto e comportamento honesto quando indisponíveis.

Conexões Google, Meta, WordPress e outras possuem estrutura documentada e testes simulados em partes. Configuração de conta real, callbacks, menor privilégio, revogação, expiração e revalidação devem ser conferidos por integração; não classificá-las como prontas somente porque existe botão Conectar. Integração de suporte com Roadmap tem contrato próprio, sem compartilhar JWT/senha do usuário entre sistemas.

## 9 Segurança operação e preparação comercial

### 9.1 Segurança obrigatória

- Testar autorização no servidor por organização, projeto, tarefa, etapa, anexo, carteira e link; não basta esconder menu.
- Nômade não lê projeto inteiro ou arquivos alheios; Líder não herda administração por engano. Rodas anteriores apontaram outras rotas ligadas a projeto a revisar.
- Testar troca de IDs, links expirados, conta bloqueada/inativa, revogação de sessão, próprio usuário e privilégios administrativos.
- Proteger anexos, conteúdo enviado, limites, tipo real de arquivo e acesso; nenhum segredo ou URL sensível deve aparecer em log ou contexto da IA.
- Chaves de produção exclusivas, cofres e rotação; política de senha e recuperação sem credenciais padrão de teste.
- Desabilitar dados e funções demonstrativas na operação comercial; LGPD, consentimentos e retenção de dados precisam de validação responsável.

### 9.2 Operação obrigatória

- Backup de banco e anexos com recuperação ensaiada, retenção e responsáveis definidos; registrar objetivos de perda de dados e tempo de retorno.
- Migrações revisadas, plano de retorno de código e compatibilidade de dados; nunca `db push` como substituto de migração de produção.
- Monitorar API, jobs, fila, pagamentos pendentes, avisos do gateway, erros e capacidade do VPS.
- Conferir SMTP/canais, suporte e notificações necessárias ao fluxo, evitando mensagens reais durante testes.
- Separar configuração e dados de QA de produção. O espelho de testes não é uma estratégia de carga inicial comercial: existem pagamentos fictícios, cadastros e projetos demonstrativos.
- Produtos vendáveis precisam de conteúdo, preço, SLA, etapas, responsáveis elegíveis, política de alterações e capacidade operacional aprovados. Os 37 registros de QA não significam 37 produtos prontos para vender.

## 10 Portões de aceite da primeira versão

Não liberar comercialmente enquanto um requisito essencial oferecido ao público estiver sem prova. Cada linha deve receber responsável, ambiente, evidência, data e aceite; esses responsáveis ainda precisam ser atribuídos.

| ID | Requisito de saída | Prova mínima | Estado em 04/11 |
|---|---|---|---|
| G01 | Escopo e catálogo de estreia aprovados | Lista dos produtos realmente vendáveis e modalidades, sem fixtures | Pendente |
| G02 | Usuários e identidade completos | Cadastro, vínculo, primeiro acesso, recuperação, bloqueio, login e retorno ao destino | Parcial |
| G03 | Permissões e isolamento | Testes positivos/negativos por perfil e organização, incluindo anexos e carteira | Pendente de revisão integral |
| G04 | Cadastro e publicação confiáveis | Produto do zero, salvar/F5, versões, matriz e contrato preservados | Parcial local |
| G05 | Preço único e explicável | Mesma configuração no catálogo/cesta/cotação/checkout/fatura, com descontos e extras | Parcial; correção recente de cotação |
| G06 | Projeto e vínculos confiáveis | Criar/selecionar consultor e cliente, voltar à compra; recusa entre empresas | Parcial local |
| G07 | Pagamento real | Provedor, aviso autenticado, reconciliação, recusa e estorno | Bloqueador financeiro |
| G08 | Comissão e carteira | Crédito/débito único, split/repasse conforme modelo aprovado e reconciliação | Simulado/parcial |
| G09 | Instâncias após pagamento | Quantidade correta, snapshot, retry único e sem distribuição prematura | Comprovado no recorte simulado |
| G10 | Lançamento e distribuição | Briefing, dependências, liderança correta, rodízio e ausência de pessoa elegível | Parcial; vínculo de Líder pendente no cenário 957 |
| G11 | Execução e aprovação completas | Nômade aceita/entrega; agência reprova; ajuste e aprovação final | Bloqueador de homologação |
| G12 | IA básica oferecida na estreia | Provedor real autorizado, contexto/permissões, custo, confirmação e falha | Parcial; Aura contextual vista |
| G13 | Recorrência e automações vendidas | Ciclos/pagamento, reinício e concorrência sem duplicar, cancelamento e SLA | Pendente de ponta a ponta |
| G14 | Evidência financeira e indicadores | Faturas, ganhos, comissão e saque coerentes; sem números demonstrativos | Pendente de conciliação real |
| G15 | Infraestrutura e recuperação | Deploy, health, migrações, persistência, restauração e monitoramento | Deploy/espelho QA provados; produção pendente |
| G16 | Suporte e operação comercial | Chamados/canais, runbook, capacidade de especialistas e comunicação | Aceite operacional pendente |
| G17 | CI da versão candidata | Suítes relevantes, build e segurança verdes, defeitos classificados | Correção local informada verde; CI remoto ainda não |

Mesmo que a primeira versão exclua assinatura ou um meio de pagamento, isso exige decisão registrada e bloqueio efetivo na oferta. Não basta ocultar uma opção mantendo contratação possível por API.

## 11 Escopo histórico VS1 e evolução futura

O planejamento de setembro previa 30 itens técnicos VS1 e 12 operacionais, com 39 produtos reduzidos. O ambiente espelhado de novembro tem 37 produtos. Essa diferença precisa de reconciliação comercial, não de criação automática dos dois faltantes. A antiga meta interna de 30/09 está vencida e não deve ser apresentada como novo compromisso de data.

### 11.1 Correspondência dos 30 itens técnicos VS1

| Nº histórico | Capacidade | Portão atual |
|---|---|---|
| 1 | Catálogo, busca, filtros e cesta | G01/G05 |
| 2 | Produtos, variações e adicionais | G04/G05 |
| 3 | Combos | G01/G05/G09; homologar se vendidos na estreia |
| 4 | Modelos, etapas, checklist e briefing | G04/G10 |
| 5 | Precificação automática | G05 |
| 6 | Migração do catálogo reduzido | G01/G15 |
| 7 | Gestão de projetos | G06 |
| 8 | Checkout | G06/G07/G09 |
| 9 | Carteira, extrato e projeções | G08/G14 |
| 10 | Planos de crédito | G07/G08; homologar se ofertados |
| 11 | Cobrança recorrente | G07/G13 |
| 12 | Faturas, DRE e conciliação | G14 |
| 13 | Saques e pagamento de Nômades/Parceiros | G08/G14 |
| 14 | Geração e lançamento automático de tarefas | G09/G10 |
| 15 | Atribuição de Líder/Nômade | G10 |
| 16 | Recompra, transferência, alterações e emergência | G05/G10/G11; validar cada regra oferecida |
| 17 | Qualificação de briefing | G10 |
| 18 | Aprovação e filtro de qualidade | G11 |
| 19 | Assistente IA do briefing | G12 |
| 20 | Execução pelo Nômade | G11 |
| 21 | Login e primeiro acesso | G02/G03 |
| 22 | Empresas, agências e clientes | G02/G06 |
| 23 | Cadastro e aprovação de Nômades | G02/G10 |
| 24 | Dashboards e relatórios | G14 |
| 25 | Alertas automáticos | G13/G15 |
| 26 | Habilitação, níveis e revisão | G10/G16 |
| 27 | Tutoriais e formação | G16 |
| 28 | CRM, distribuição e comissão | G08/G16 |
| 29 | Consulta somente leitura ao legado | G03/G15/G16 |
| 30 | Suporte e chamados | G16 |

Os estados “Pronto” da memória histórica são inventário da época, não certificado atual. Por exemplo, ela dizia que a execução do Nômade não tinha API; agora há rotas de aceite, conclusão e anexos. O problema atual é homologar sua integração, não afirmar que nada existe.

### 11.2 Preparação operacional VS1

Ainda precisam de aceite explícito: descritivos dos produtos-motor; produtos de sustentação; portfólio/vídeos; cobertura de especialistas; testes de habilitação; reabilitação da base antiga; vídeo de apresentação; tutoriais por portal; site comercial; pitch; campanha de transição; FAQ. A memória de lançamento pede pelo menos três Nômades habilitados por tarefa dos produtos-motor. Confirmar essa capacidade ou registrar uma política operacional alternativa antes da venda.

### 11.3 VS2 e itens posteriores

O planejamento separa IA avançada, conexões ampliadas Meta/Google/WhatsApp/NF, comunicação e multiusuário/perfis internos ampliados, relatórios avançados, gamificação completa, cauda longa de produtos e programa aprofundado de Nômades como VS2. Há partes desses módulos no código; sua presença não muda automaticamente o escopo de lançamento. Funcionalidades futuras exibidas ao público devem ser honestamente indicadas como indisponíveis ou “Em breve”.

A ajuda básica de IA foi reforçada como requisito atual pelo proprietário e entra em G12; IA avançada não precisa bloquear a estreia se não for oferecida. Da mesma forma, uma integração externa usada por um produto vendido deixa de ser opcional para aquele produto. Projetos Squad e níveis já estavam descritos como existentes na memória histórica, mas não devem ampliar o lançamento sem avaliação do risco.

## 12 Resultado da conferência visual de 4 de novembro

Conferência do Codex no navegador interno, sessão Admin e banco local. Sem exclusões, bloqueios, criação de produto/tarefa, publicação, cobrança ou gravação de campos. A alteração temporária do nome no formulário foi cancelada e o valor original reapareceu. Viewport temporário foi restaurado.

| Item PARTE G | Resultado observado |
|---|---|
| Aura no Catálogo | Aprovado no recorte: “Ajude-me a escolher um produto” e sugestões comerciais próprias |
| Aura no Cadastro | Aprovado no recorte: “O que falta completar neste produto?” e organização dos dados |
| Menu Usuários | Aprovado no recorte: Ver perfil, Editar usuário, Gerenciar permissões, Bloquear e Excluir visíveis; bloqueio e exclusão abertos e cancelados |
| Própria conta | Item “Você não pode excluir sua própria conta” desabilitado |
| Lápis e confirmação | Nome abre campo; texto temporário seguido de✓ pede “Confirmar alterações”; Cancelar restaura o nome, sem gravação |
| Preço real | SEO 003 mostra R$ 933,47 sem marca provisório |
| Preço provisório | Não homologado visualmente: produto 28 sem preço mostrou “A definir”, não um exemplo numérico provisório; nenhum dado foi inventado para forçar o caso |
| Produto sem tarefas | Produto 28 já existia em V1 rascunho: cartão Composição “Pendente”, aviso “base de custo indefinida”, sem preço comercial final zero. Porém a Cobrança estimada abaixo continua exibindo BRL 0,00 |

**Pendência reproduzida G18:** na Composição do produto 28 sem tarefas, recorrente, primeira cobrança, renovação mensal e compra avulsa mostram BRL 0,00, apesar do aviso de ausência de base. A correção de cabeçalho não cobre a seção financeira inferior. Ela deve distinguir valor indefinido de zero real, inclusive para modalidade não aplicável. Nenhuma correção de código foi feita pelo Codex nesta conferência.

**Pendência reproduzida G19:** no mesmo produto vazio, o Resumo da versão mostrou Informações do produto, Entrega e Classificação como “Configurado OK”, embora a tela informe 0 tarefas e bloqueios. O botão Publicar continua bloqueado; não houve liberação indevida observada. Revisar indicadores para não sugerirem preenchimento concluído quando falta a configuração.

Na prévia administrativa do SEO, a opção de até 10 páginas repetiu o preço/prazo base e o adicional apareceu com + R$ 0,00. Não foi feita cotação nessa tela: tratar como ponto de revisão da representação dos impactos, não como erro financeiro já comprovado. O checkout deve continuar sendo validado contra o servidor.

## 13 Cenário operacional para retomar sem duplicar dados

Projeto 957 é cenário fictício, com SEO 003 e Manutenção 002, uma unidade avulsa cada, total R$ 1.226,32 e comissão zero. Pedido e pagamento simulado já foram confirmados com autorização; **não comprar nem pagar novamente para retomar**.

- T015720 SEO: quatro etapas, briefing aprovado no recorte anterior; primeira etapa de Líder ainda exigia definição de vínculo. Estado registrado após análise: aguardando Nômade, sem comprovação do aceite operacional.
- T015721 Manutenção: duas etapas, briefing em análise no último registro; etapa mantinha referência antiga de Líder a revisar.
- Reynário é o usuário Nômade existente, com perfil operacional e habilitações preparados especificamente para teste local com autorização. Há pendências cadastrais; esse preparo não comprova onboarding de um profissional real.
- Rose Líder de teste foi criada e a antiga conta de Empresa foi renomeada Carla; ambas preservadas. Não promover administrador nem recriar contas para facilitar o teste.

Próximo ensaio autorizado de execução deve registrar, em ordem: análise pela Rose; destino de etapa; oferta ao Reynário; aceite; execução; anexo/entregável; eventual qualificação; agência reprova com motivo; ajuste; nova submissão; aprovação final; próxima etapa/encerramento; efeitos em carteira. Validar estado antes de agir, pois o registro não é leitura ao vivo. Corrigir vínculos sem reescrever matriz publicada ou avançar artificialmente para obter resultado verde.

## 14 Plano de revisão e homologação para o sênior

### 14.1 Ordem recomendada

1. Revisar arquitetura atual, diferenças locais e decisões VS1; fechar produtos e modalidades da estreia.
2. Auditar pagamento real e caminhos de simulação, autorização por recurso e integridade financeira antes de acrescentar funcionalidades.
3. Corrigir G18/G19 e revisar preço provisório e impactos comerciais na vitrine sem tocar nos dados de contratos existentes.
4. Completar o cenário operacional 957 e testar também outro projeto/empresa para provar isolamento.
5. Homologar recorrência, automações e eventos repetidos/fora de ordem em banco descartável e ambiente de integração.
6. Publicar versão candidata somente com autorização, CI aprovado, backup e plano de retorno; depois executar testes reais controlados das integrações.
7. Obter aceite técnico, financeiro e operacional do proprietário antes de habilitar venda pública.

### 14.2 Roteiro mínimo de testes

| Grupo | Cenários obrigatórios |
|---|---|
| Identidade | Login/primeiro acesso, conta inativa, expiração e retorno ao destino autorizado; permissões por perfil |
| Cadastro | Produto do zero, rascunho incompleto, validação contextual, erro sem perder texto, F5, nova versão sem mudar a publicada |
| Comercial | Avulso e modalidades ofertadas, quantidade, extras, descontos, sem preço, cotação expirada e total consistente |
| Projeto | Criar cliente/consultor/projeto no checkout, cancelar, salvar e retornar selecionado; bloquear vínculos externos |
| Financeiro | Pendente/recusado/pago, assinatura falsa, valor diferente, retry, duplicação de aviso, estorno e comissão |
| Tarefas | Uma versus várias unidades, novos IDs, snapshot congelado, nenhuma execução antes do lançamento |
| Operação | Aprovar/devolver briefing, ausência de Líder/Nômade, rodízio, aceite/recusa, qualificação sem autoaprovação |
| Entrega | Arquivo válido/inválido, autorização do anexo, reprovar/ajustar/aprovar, preservar versões, avançar fluxo correto |
| Recorrência | Implantação só primeira vez, continuidade, cancelamento, inadimplência, fim de período e crédito por dispensa |
| Resiliência | Reinício, dois workers, falha de rede/provedor, reconciliação e recuperação de backup |
| Interface | Painel/Janela Moldura, overlay escuro e hierarquia, Escape só na camada superior, mobile sem cortar ações |

Executar integrações destrutivas apenas em bancos descartáveis. Guardar evidência sanitizada de interface, resposta, evento e saldo; não copiar tokens, senhas, conteúdo privado ou chaves para documentos compartilháveis.

### 14.3 Entrega esperada do revisor

Solicita-se um parecer com: bloqueadoresP0/P1; risco e alcance; caminhos de código; requisitos divergentes; plano de correção; testes de regressão; esforço estimado pelo próprio revisor; proposta de versão candidata e plano de retorno. Não pedir aprovação genérica de “toda a plataforma” apenas com navegação de telas. Cada portão deve terminar como aprovado, bloqueado ou excluído do escopo por decisão formal.

## 15 Referências e continuidade

Este relatório é o índice atualizado para a análise sênior, não substitui todos os contratos de API ou o guia de cada campo. Em caso de divergência, conciliar decisão do proprietário, código vigente e evidência; não apagar silenciosamente a regra anterior.

- [README operacional](../README.md) e [Retomar aqui](RETOMAR-AQUI.md).
- [Registro de deploys e evidências](deploy-log.md).
- [Passagens entre agentes e PARTE G](passagem-codex-2026-11-01.md).
- [Memória histórica VS1 e VS2](memoria-lancamento-2026-09.md), baseada no roadmap de setembro; a planilha fonte não foi reavaliada nesta rodada.
- [Regras de negócio](regras-de-negocio.md) e [Guia do cadastro](cadastro-produto-passo-a-passo.md), lendo cabeçalhos antigos à luz do editor novo.
- [Auditoria de usabilidade](auditoria-cadastro-fluxo-2026-11-03.md).
- [Cenário operacional de 3 de novembro](teste-ciclo-agencia-nomade-2026-11-03.md) e [Mapa ponta a ponta](fluxo-ponta-a-ponta-agencia-nomade-2026-10-31.md).
- [Integrações externas](integracoes-externas-qa.md) e [Contrato de suporte Roadmap](roadmap-integration-contract-v1.md).

**Política de atualização:** ao concluir uma correção ou teste, registrar ambiente, versão, dado de teste, resultado e limitações; atualizar os portões correspondentes e a primeira entrada de RETOMAR-AQUI. Não transformar teste local em aprovação de produção. Código, dados e publicação são entregas distintas e exigem autorização própria. Nesta rodada houve somente conferência local e documentação, sem commit, push, deploy ou novo espelho.
