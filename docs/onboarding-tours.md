# Tours guiados (onboarding) — padrão para funcionalidades futuras

Este documento é o padrão a seguir sempre que uma funcionalidade nova ou
alterada precisa (ou pode precisar) de um tour guiado. Ele não cria burocracia
nova: é só a referência de "como fazer certo" pra quem for mexer no motor de
onboarding depois desta sprint (blocos 1-3).

Arquivos principais:

- `apps/frontend/lib/tours/types.ts` — tipos (`TourDefinition`, `TourStep`).
- `apps/frontend/lib/tours/registry.ts` — registro central (todo tour vive aqui, nunca espalhado pelas páginas).
- `apps/frontend/lib/tours/eligibility.ts` — `isTourEligible`, função ÚNICA de elegibilidade (nunca duplicar).
- `apps/frontend/lib/tours/catalog-validation.ts` — validador automático do catálogo.
- `apps/frontend/components/onboarding/tour-runner.tsx` — motor + overlay visual.
- `apps/frontend/contexts/onboarding-context.tsx` — orquestração (oferta automática, oferta contextual, Central de Ajuda, progresso).

## 1. Quando criar ou atualizar um tour

Crie um tour novo quando uma funcionalidade nova tem uma tela, painel ou fluxo
que uma pessoa não vai descobrir sozinha. Não é preciso um tour para toda
mudança pequena — um botão renomeado ou um campo a mais numa tabela não
precisa de tour.

Atualize (suba a versão) um tour existente quando o fluxo que ele ensina
mudou de verdade: passos que não existem mais, uma etapa nova indispensável,
ou uma mudança de comportamento que tornaria a explicação antiga enganosa.

Nunca edite silenciosamente um tour existente descrevendo uma tela que já não
existe — se a tela mudou, o tour tem que mudar junto, na mesma alteração.

## 2. Escolher a `tour_key`

- kebab-case, em português, descrevendo o RECURSO (não a tela nem o componente): `"aditivos"`, `"canais"`, nunca `"aditivos-tab-modal"`.
- Nunca reutilize uma chave de um tour removido para outro conteúdo — chaves são permanentes (o histórico de progresso em `TourProgress` é indexado por `tour_key`).
- Escolha uma categoria real em `TourCategory` (`primeiros-passos` | `alertas-comunicacao` | `produtos-catalogo` | `memoria-lancamento`); crie uma categoria nova só se nenhuma das quatro fizer sentido, e nesse caso atualize também `CATEGORY_LABEL`/`CATEGORY_ORDER` em `help-floating-icon.tsx`.

## 3. Versionar

`version` começa em 1. Suba pra 2 (nunca crie uma segunda entrada com a mesma
`key`) quando o conteúdo mudou o suficiente pra valer oferecer de novo pra
quem já tinha concluído a versão anterior. Uma correção de digitação não
precisa de nova versão.

## 4. Declarar perfis e permissões

- `allowedAccountTypes`: sempre que o RECURSO em si só existe pra certos tipos de conta (ex.: catálogo do cliente só pra `empresas`/`agencias`). Omitir = todo perfil.
- `isEligible`: use SÓ quando existir uma checagem de permissão mais fina que account_type (ex.: Admin Master) — e reaproveite a MESMA função de decisão já usada pra mostrar/esconder a tela real (`lib/admin-permissions.ts` ou equivalente). Nunca escreva uma segunda implementação da mesma regra — ela pode divergir da tela real com o tempo.
- Nunca decida elegibilidade checando só se um botão está ausente do DOM — o motor até lida bem com alvo ausente (pula ou explica), mas a decisão de QUEM vê o tour na Central de Ajuda tem que vir de `allowedAccountTypes`/`isEligible`, sempre.
- Se o recurso tem uma distinção real de leitura x edição (como Memória), e essa distinção já é decidida por uma prop que a TELA real recebe (não por account_type), o tour não tenta replicar essa lógica — escreva os passos de forma neutra/explicativa (descrevendo o que a seção É, nunca "clique em Editar"), assim funcionam pra quem só consulta e pra quem edita, sem duplicar a regra de permissão da tela.

## 5. `data-tour-id`

- Kebab-case sempre que possível; um valor de campo snake_case (ex.: `positive_instructions`) pode aparecer dentro do id (`memory-section-positive_instructions`) — o validador aceita `[a-z0-9_-]+`.
- Adicione o atributo SÓ no elemento realmente usado por um passo — nunca "pra garantir" num monte de elementos que nenhum tour usa.
- Nunca localize um elemento por texto visível, classe CSS ou posição na página — sempre `data-tour-id`.
- Se o elemento existe em duas versões no DOM ao mesmo tempo (padrão desktop/mobile, como os ícones flutuantes), pode repetir o MESMO `data-tour-id` nas duas — o motor já escolhe a que está visível.

## 6. Alvo opcional x alvo necessário x painel fechado x sem dado

Quatro situações diferentes, cada uma com o tratamento certo:

- **Alvo opcional** (`optional: true`): o elemento pode legitimamente não existir pra esse perfil/tela/estado (ex.: uma aba só de Admin Master, uma sessão que ainda não começou). O motor pula com segurança pro próximo passo válido.
- **Alvo necessário sem alternativa**: se não existir, o motor mostra "Este conteúdo não está disponível no momento." — nunca deveria acontecer em uso normal; se acontecer, é sinal de que o passo deveria ser `optional` ou usar uma das duas opções abaixo.
- **Alvo dentro de um painel/modal fechado por padrão** (`requiresOpening`): quando o elemento real só monta depois que a pessoa abre um painel global (Alertas, Notificações — ver `header-slide-screen.tsx`, que só monta os filhos após o primeiro `open`). Declare `requiresOpening: { openerTarget, instruction }` — o motor destaca o botão que abre o painel, espera a pessoa clicar de verdade (nunca clica sozinho), e segue assim que o alvo real aparecer. Tem um timeout de segurança (30s) que explica e libera saída — nunca trava esperando pra sempre.
- **Tour de registro específico sem dado aberto** (`noDataMessage` no `TourDefinition`): quando o tour vive dentro de um projeto/empresa/agência específico (sem rota fixa) e a pessoa pode abri-lo sem ter nenhum registro do tipo certo aberto no momento. Declare `noDataMessage` — o motor detecta que NENHUM alvo real do tour existe em lugar nenhum da tela e mostra essa explicação central em vez de percorrer passos impossíveis ou desaparecer sem dizer nada. Nunca escolha um registro sozinho, nunca crie um registro de exemplo, nunca assuma um ID fixo — a pessoa abre o registro dela, e o tour resume sozinho (o `last_step_key` já persistido garante isso, inclusive depois de F5).

## 7. Escrever os textos

- Português correto, sem jargão técnico interno (nunca cite nome de tabela, endpoint ou variável).
- No máximo duas frases curtas por passo, salvo justificativa indispensável (uma explicação com 3+ conceitos distintos que não valem uma etapa própria).
- Cada passo explica: o que é, por que usar, o que a pessoa pode fazer — sem instruir uma ação de negócio real (nunca "clique em Aprovar/Publicar/Materializar/Pagar agora").
- Nunca prometa uma funcionalidade incompleta como se já funcionasse (ex.: WhatsApp/e-mail/push que ainda não enviam de verdade — dizer isso explicitamente é o certo).
- Nunca chame o pagamento de real quando for simulado.
- `registry.test.ts` já tem verificações automáticas pra várias dessas afirmações — ao adicionar um tour sobre um recurso com uma limitação conhecida parecida, adicione o teste correspondente.

## 8. Testes mínimos para um tour novo

- Passa no validador automático (`validateTourCatalog` — chave/versão/título únicos, categoria válida, 3 a 8 passos, todo target uma chave estável, rota existente em `App.tsx`, público elegível não vazio). Isso já roda contra `TOURS` inteiro em `registry.test.ts` — não precisa de um teste novo pra isso, só não pode quebrar o existente.
- Se o tour tem `allowedAccountTypes`/`isEligible` mais restritivo que "todo perfil": um teste no estilo de `permissions-matrix.test.ts` provando quem entra e quem não entra.
- Se algum passo usa `requiresOpening`: um teste de `TourRunner` isolado (ver os testes de `tour-runner.test.tsx` da seção "painel fechado") provando que o motor nunca clica sozinho e segue assim que o alvo real aparece.
- Se o tour tem `noDataMessage`: um teste provando a mensagem aparece quando nenhum alvo existe, e que o tour funciona normalmente assim que qualquer alvo real aparecer.

## 9. Adicionar à Central de Ajuda

Nenhuma ação manual é necessária — `HelpFloatingIcon` lê `availableTours` do
`OnboardingProvider`, que já filtra por elegibilidade e agrupa por categoria
automaticamente. Só confira que a `category` escolhida é uma das quatro
existentes (ou que você atualizou `CATEGORY_LABEL`/`CATEGORY_ORDER` se criou
uma nova). Um tour com `noDataMessage` ganha automaticamente uma nota
("Disponível dentro de um projeto, empresa ou agência aberto.") — não
precisa de nenhuma configuração extra.

## 10. Proibições (nunca fazer)

- Nunca o motor clica, submete ou confirma nada sozinho — só destaca e explica. `requiresOpening` só pode abrir um painel puramente visual (nunca um formulário de exclusão, pagamento, aprovação, resolução, publicação, materialização, troca de responsável, ou qualquer confirmação destrutiva).
- Nunca criar uma segunda função de elegibilidade — sempre `isTourEligible` de `lib/tours/eligibility.ts`.
- Nunca escolher um registro (projeto/produto/pedido/tarefa) sozinho, nem criar um registro de exemplo pra "destravar" um tour.
- Nunca localizar elemento por texto/classe/posição — sempre `data-tour-id`.
- Nunca afirmar que uma funcionalidade incompleta já funciona de verdade.
