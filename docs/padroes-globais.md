# Padrões globais da plataforma (catálogo de nomes)

> **Para qualquer IA (Claude, Codex, ChatGPT…):** quando o usuário disser "transforme isso em **<nome do padrão>**" ou perguntar "quais são os padrões globais?", use este arquivo. Cada padrão tem um **nome fixo**, o que ele faz, **uma tela de exemplo (com link local)** e onde está o código. **Padrão FINAL** = decidido pelo usuário, vale para todas as telas. **Padrão existente** = já é usado na plataforma e está catalogado aqui; pode ser promovido a final quando ele disser.
> **Regra de entrega (pedido do usuário, 21/10):** sempre que um padrão for criado ou mudar, **atualize este arquivo e reenvie a lista COMPLETA** ao usuário (nome · o que é · exemplo · onde está · regras).
> Ao criar um padrão novo: dê um nome curto, registre aqui, e (se for visual) crie uma peça reutilizável em `apps/frontend/components/`.
> **Links de exemplo** usam o ambiente local: `http://localhost:8082` (no servidor de testes: `https://allka.store`).

## Lista rápida (para colar quando for pedir)

| # | Nome | Em uma frase | Exemplo (clique para ver) |
|---|---|---|---|
| 1 | **Painel Moldura** | Container grande por cima da página, contorno violeta, 30 px de margem, acompanha a sidebar | [Cadastro de Produtos → ícone ▶ de um produto](http://localhost:8082/admin/cadastro-produtos) |
| 1b | **Fundo escurecido padrão** | Fundo atrás de janelas: um pouco escuro e levemente desfocado | qualquer janela/alerta |
| 2 | **Barra lateral recolhida** | Com a sidebar recolhida, os botões ficam dentro da barra | [qualquer tela](http://localhost:8082/admin/dashboard) (botão ☰ da sidebar) |
| 3 | **Abrir todos / Fechar todos** | Botãozinho duplo que abre/fecha todos os acordeões da tela | [Cadastro do produto → aba 1](http://localhost:8082/admin/cadastro-produtos/1) |
| 4 | **Bolinha numerada em degradê** | Números 1, 2, 3 dos blocos com o degradê da plataforma | [Cadastro do produto → aba 1](http://localhost:8082/admin/cadastro-produtos/1) |
| 5 | **Janela Moldura** | Janela menor, por cima de um Painel Moldura, véu branco claro (sidebar sempre visível) | Produto → Classificação → Variações → Ver → "Configurar impactos" |
| 6 | **Tela Moldura Clara** *(nome provisório)* | O painel branco de toda tela do sistema (cantos arredondados, borda e sombra) | [Dashboard](http://localhost:8082/admin/dashboard) |
| 7 | **Tela Moldura Escura** *(nome provisório)* | O mesmo painel, mais escuro (`#d6daf0`), usado nas telas de cadastro/edição | [Cadastro de Produtos](http://localhost:8082/admin/cadastro-produtos) |
| 8 | **Linha + Ver** *(existente)* | Item recolhido numa linha (nome, resumo, etiquetas) com botão **Ver** que abre Painel Moldura | [Produto → Entrega → Questionário / Entregáveis](http://localhost:8082/admin/cadastro-produtos/1) |

## Padrões FINAIS

### 1. Painel Moldura  ✅ final (19/10/2026)
O container grande que abre por cima da página (ex.: "Preenchimento do produto", o editor de produto, editar etapa, questionário).
- **Exemplo:** [Cadastro de Produtos](http://localhost:8082/admin/cadastro-produtos) → clique no ícone ▶ de qualquer produto (abre o editor num Painel Moldura).
- **Contorno violeta** (borda de 2 px + halo suave), cantos arredondados (`rounded-2xl`), fundo claro `#f4f6fc` (escuro no modo escuro).
- **Ocupa todo o espaço ao lado da barra lateral**, com **30 px de margem em cima, embaixo e dos dois lados** (centralizado).
- **Acompanha a barra lateral:** recolheu → o painel cresce; expandiu → diminui; a margem continua 30 px.
- Fundo escurecido só sobre a área de conteúdo (a barra lateral continua visível). Não fecha ao clicar fora.
- **Margem interna de 10 px** em volta de TUDO que fica dentro do painel (regra global de 20/10; vale para todo conteúdo, ex.: o editor de produto).
- **Cabeçalho em banner** dentro do painel nunca fica colado nas bordas: soma 12 px com a margem interna (`FRAMED_HEADER_CLASS` = 2 px + 10 px do painel; **12 px em cima e dos lados**). Alertas de confirmação ficam por cima do painel.
- **Rodapé com botões** (Cancelar / Salvar…): mesma margem lateral do cabeçalho (**12 px nos dois lados** = `FRAMED_FOOTER_CLASS` 2 px + 10 px do painel): o botão da direita alinha com a margem, como o da esquerda.
- **Como usar:** `import { FramedPanel } from "@/components/framed-panel"` → `<FramedPanel open onOpenChange testId="...">…conteúdo…</FramedPanel>`. A margem está em `FRAMED_PANEL_MARGIN` (30) no mesmo arquivo: mudar lá muda em todas as telas.
- **Usado em:** Preenchimento do produto, **editor de produto** (ao clicar em editar/Novo Produto), editar etapa, acesso da etapa, questionário de contratação, entregáveis, fluxo das etapas, variações, adicionais, prazos e condições, Personalizar Tema.
- **Camadas (z-index):** painel em 1201; janelas comuns do sistema em 1300; menus/dicas em 1400 (para tudo aparecer por cima do painel).

### 1b. Fundo escurecido padrão (overlay)  ✅ final (20/10/2026)
O fundo que aparece atrás de qualquer janela/modal/alerta: **um pouco mais escuro e levemente desfocado** (`bg-slate-950/60` + `backdrop-blur-[2px]`), nunca 100% escuro. Vale em `components/ui/dialog.tsx`, `components/ui/alert-dialog.tsx` e `components/framed-panel.tsx` — para mudar em tudo, altere nesses três.
- **Regra do usuário:** a barra lateral **sempre aparece**; qualquer fundo (escuro ou claro) começa depois dela e acompanha quando ela recolhe/expande.

### 2. Barra lateral recolhida — botões dentro da barra  ✅ final (19/10/2026)
Com a sidebar recolhida, **Expandir** e **Personalizar cores** ficam **dentro da barra, abaixo do logo**; nada aparece fora dela ao passar o mouse. Código: `components/sidebar.tsx` (`data-testid="sidebar-collapsed-actions"`).
- **Exemplo:** [qualquer tela](http://localhost:8082/admin/dashboard) → botão ☰ no topo da sidebar.

### 3. Abrir todos / Fechar todos (acordeões)  ✅ final (20/10/2026)
Em **toda tela que tiver acordeões** vai um botãozinho duplo "Abrir todos | Fechar todos" perto do topo da lista de blocos (no cadastro de produto: à direita das contagens de tarefas/etapas, ou na mesma linha do menu de sub-abas).
- **Exemplo:** [Cadastro do produto 1](http://localhost:8082/admin/cadastro-produtos/1) → aba "Informações do produto".
- **Peça reutilizável:** `app/admin/produtos/novo-catalogo/accordion-toggle-all.tsx` → `<AccordionToggleAll />` na tela e `useAccordionAll(setOpen)` em cada acordeão (já ligado no `SectionCard` e nos cartões comerciais). Acordeão nativo `<details>`: basta a marca `data-accordion`.

### 4. Bolinha numerada com o degradê da plataforma  ✅ final (20/10/2026)
Os números dos blocos (1, 2, 3…) usam a classe `.section-number-badge` (`app/globals.css`) = degradê de "Personalizar cores" (`--app-brand-gradient`); mudou a cor da plataforma, muda nas bolinhas. Bloco "Resumo da mudança" usa `tone="soft"` (fundo cinza bem claro).
- **Exemplo:** [Cadastro do produto 1](http://localhost:8082/admin/cadastro-produtos/1) → aba 1 (blocos 1 a 8) e "Variação 1" na aba 3.

### 5. Janela Moldura  ✅ final (20/10/2026)
A **janela menor** que abre **por cima de um Painel Moldura** (ex.: "Configurar impactos" de uma opção de variação). É a irmã pequena do Painel Moldura. Para pedir: "transforme isso numa **Janela Moldura**".
- **Exemplo:** [Produto 1](http://localhost:8082/admin/cadastro-produtos/1) → aba 3 "Classificação e opções" → Variações → Ver → "Configurar impactos"; também "Nova condição" (Prazos e condições → Regras de prazo) e "Configurar impactos" dos adicionais.
- **Fundo claro:** véu **branco translúcido** (`bg-white/55` + leve desfoque), que cobre tudo **menos a barra lateral**; a sidebar sempre aparece e o véu acompanha quando ela recolhe/expande.
- **Centralizada** na área ao lado da sidebar; **largura máxima 66 rem (~990 px)** (aumentada ~18% em 20/10) e altura até `100dvh − 4rem`, com rolagem por dentro. O tamanho pode ser ajustado conforme o conteúdo (passe `className` com outro `max-w`).
- Mesmo visual do Painel Moldura: contorno violeta, fundo `#f4f6fc`, margem interna de 10 px, cabeçalho em banner branco (`FRAMED_HEADER_CLASS`) e rodapé `FRAMED_FOOTER_CLASS`.
- **Como usar:** `import { FramedModal } from "@/components/framed-panel"` → `<FramedModal open onOpenChange testId title>…</FramedModal>` (o componente chama-se `FramedModal`; o nome que você usa é **Janela Moldura**).

## Padrões de container de tela (nomes PROVISÓRIOS: Tela Moldura Clara e Tela Moldura Escura — o usuário escolheu esses nomes em 21/10, ainda pode mexer)

### 6. Tela Moldura Clara  (provisório · já existe no código)
O painel branco flutuante que envolve **toda tela logada** (cantos `rounded-2xl`/`1.5rem`, borda `slate-200/70`, sombra suave, margem interna de 7,5 px).
- **Exemplo:** [Dashboard](http://localhost:8082/admin/dashboard), [Empresas](http://localhost:8082/admin/empresas).
- **Código:** constante `STANDARD_SHELL_PANEL_CLASS` em `apps/frontend/components/standard-page-shell.tsx` (classe `admin-empresas-panel`, atributo da moldura `screen-std-global`); o Dashboard usa `DashboardShellFrame` (`features/dashboards/shared/dashboard-shell-frame.tsx`) com margem `!p-1.5 sm:!p-2`. Especificação da tabela em `docs/padrao-tabela-empresas.md`.

### 7. Tela Moldura Escura  (provisório · só existe no Cadastro de Produtos)
A mesma Tela Moldura com fundo e borda mais escuros (**`#d6daf0`** com borda `#c3c8e6`; modo escuro `violet-950/40`) para não confundir com as telas comuns; usada nas telas de cadastro/edição.
- **Exemplo:** [Cadastro de Produtos](http://localhost:8082/admin/cadastro-produtos).
- **Código:** sobreposição de classes (`!border-[#c3c8e6] !bg-[#d6daf0]`) em `apps/frontend/app/admin/produtos/page.tsx` e em `components/embedded-slide-screen.tsx` (`bare`). **Constante compartilhada (R21-28, 21/10):** `STANDARD_SHELL_PANEL_DARK_CLASS` (painel) e `STANDARD_SHELL_DARK_BG_CLASS` (fundos soltos) em `components/standard-page-shell.tsx`, ao lado da branca. O Cadastro de Produtos já usa; novas telas de cadastro devem usar a constante, não copiar as classes.

## Padrões EXISTENTES (catalogados; promover a final quando o usuário mandar)

### Ajustes do cabeçalho e ferramentas — 28/10/2026
- **Trilho direito compacto:** somente gatilhos visíveis ocupam espaço; ordem bandeja, tema, fonte, sugestões, alertas, ajuda e IA. Implementação compartilhada em `components/floating-tools-rail.tsx`; painéis/mobile mantidos.
- **Contraste no degradê:** controles dark de dashboard usam texto e SVG brancos, borda clara e fundo translúcido, em `features/dashboards/shared/dashboard-toolbar.tsx`.
- **Cesta no cabeçalho:** Agency (também Partner) e Company, antes das notificações, somente com itens. Mantém quantidade/escopo da cesta existente e abre a mesma cesta; não cria compra. Substitui para compradores a regra antiga de exibir apenas dentro do catálogo. Arquivos `components/header-catalog-cart.tsx`, `lib/catalog-cart-events.ts` e integração no cabeçalho/catálogo. Sem ícone para Admin, Nômade ou Líder.

| Nome | O que é | Exemplo / onde está |
|---|---|---|
| **Linha + Ver** (8) | Item recolhido numa linha (nome, resumo, etiquetas) com botão **Ver**; abre Painel Moldura. Com o produto em leitura aparece **Editar** dentro do painel (liga a edição do produto). Configurar algo dentro abre **Janela Moldura**. | `PanelCard`, `VariationRow`, `AddonRow` em `product-editor.tsx`; [Produto 1 → Entrega / Classificação / Prazos](http://localhost:8082/admin/cadastro-produtos/1) |
| **Lista pronta + modal** | A página mostra só o item pronto; adicionar/editar abre MODAL (como na plataforma antiga). | regra 26 de `docs/regras-de-negocio.md`; questionário, etapas, entregáveis |
| **Acordeão de blocos** | Blocos independentes, fechados por padrão, resumo quando fechado, status real (Completo/Incompleto com N pendências/Com erro/Opcional/Não se aplica), Expandir/Recolher todos. | `step-blocks.tsx`, `step-completeness.ts` |
| **Rascunho da tela** | Adicionar/alterar/remover só mexe numa lista local; o servidor só é tocado ao salvar (rascunho ou concluir). Estados visíveis (Novo, Salvo, Alterado, Será removido + Desfazer). | acessos (`step-accesses.ts`), entregáveis (`step-deliverables.ts`) |
| **Salvar rascunho × Concluir** | Rascunho aceita incompleto e nunca bloqueia; Concluir valida; erro nunca fecha a tela nem apaga nada; fechar com alteração pergunta (continuar · salvar rascunho · descartar). | regra 27 |
| **Campo dependente** | Quando uma escolha revela outros campos: o bloco aparece, a tela rola, destaca por instantes e diz "falta N campo(s)". | `reveal.tsx` (`RevealBox`) |
| **Modal de 8 blocos (entregável)** | Modal largo, cabeçalho fixo, rodapé sempre à vista (Cancelar / Salvar rascunho / Salvar), blocos recolhíveis. | `deliverable-modal.tsx` |
| **Resumo em linguagem simples** | Texto que explica em português o que vai acontecer com a configuração escolhida. | `client-approval.tsx` |
| **Escolha de escopo do modelo** | Ao salvar um modelo global usado: Criar novo modelo × Editar globalmente (com impacto). | `ModelScopeDialog`, regra 37 |
| **Moeda Allkoin (AK$)** | A moeda da Allka. **Todo valor da plataforma mostra os DOIS: Allkoin primeiro e o real entre parênteses — `AK$ 366,07 (R$ 366,07)`** (símbolo na frente, 2 casas; hoje 1 AK$ = R$ 1,00, por isso os números são iguais). Saldo e movimentação de carteira (recarga por Pix/boleto/cartão, comissão, brinde) são Allkoins: em espaço curto (cabeçalho, cartões) aparece `AK$ 1.000,00` e o mouse mostra os dois; no resto, os dois já visíveis. **Preço de produto** aparece em reais (`R$ 366,07`) e o mouse mostra `AK$ 366,07 (R$ 366,07)` — por enquanto nessa ordem; depois o usuário manda inverter. Pagar uma recarga continua em R$ ("Valor a pagar (R$)" → "Você recebe …"). Ainda só em R$ de propósito: faturas, valor de projeto, saque e extrato bancário — a detalhar. | `lib/allkoins.ts` (`fmtAllkoins`, `fmtAllkoinsBoth`, `fmtReais`, `ALLKOIN_BRL_RATE`), `components/price-with-allkoins.tsx` (`PriceWithAllkoins`, `AllkoinsAmount`, `AkBoth`, `Money`); [cabeçalho](http://localhost:8082/agency/dashboard), [Meu Perfil](http://localhost:8082/agency/perfil), [vitrine](http://localhost:8082/agency/catalogo-produtos) |
| **Fechamento de tarefa técnica** | Resumo leigo + tabela de farol (🟢 pronto · 🟡 aguardando teste · 🔴 não deu certo · ⏸ adiado). | `docs/RETOMAR-AQUI.md` seção 1 |

## Regra de comparação (decidida pelo usuário)
Quando o usuário pedir uma tela/comportamento novo e já existir um padrão **existente (não final)** que faça algo parecido, a IA **avisa antes de criar**: "já tem o <nome>, que faz X, Y e Z". Compara-se com ele se é a mesma coisa de fato e se o novo substitui o existente; só então se decide (reaproveitar, substituir ou criar outro) e se atualiza este catálogo.

## Como pedir
- "Quais são os padrões globais?" → mandar a **lista completa** deste arquivo (tabela rápida + detalhes).
- "Transforme esse container em **Painel Moldura**" → trocar o `Dialog` da tela por `FramedPanel`.
- "Transforme em **Janela Moldura**" → janela menor por cima de um Painel Moldura: usar `FramedModal` (fundo claro, sidebar sempre visível).
- "Abrir todos / Fechar todos" → `<AccordionToggleAll />` (padrão 3). "Bolinha numerada com degradê" → classe `.section-number-badge` (padrão 4).
- "Isso vira padrão" → registrar aqui com nome, regra, exemplo e onde está, e reenviar a lista completa.

## Referência registrada — tela Clientes (27/10/2026)

**Pedido do usuário:** guardar TODA a configuração da tela marcada em `/admin/clientes` para replicá-la em outra área quando ele indicar. Nome de chamada: **“Referência Clientes”**. Este registro é um retrato de uma tela existente, NÃO cria um padrão global novo, não promove alterações para todas as páginas e não autoriza replicar em nenhuma tela ainda.

### Fonte e versão preservada

- Página original: `apps/frontend/app/admin/clientes/page.tsx` + `clientes-layout.css` na mesma pasta. Exemplo: [Clientes](http://localhost:8082/admin/clientes).
- Evidência fornecida pelo usuário: comentário de navegador de 27/10, viewport informado **1480 × 668**, sidebar recolhida, tema claro. O contorno azul e o marcador do comentário NÃO fazem parte do design.
- Cópia dos **22 arquivos de fonte visual**, sem dados de banco: `backups/referencia-clientes-20261027/fontes-visuais-clientes.zip` (116.979 bytes). SHA256: `A93698B21FAAA915A55783DC5A18774A897635F9C7ED8316CE451674BDC85E1B`. ZIP conferido: 22 entradas, nenhuma vazia. Pasta local, não enviada ao servidor.
- O ZIP contém arquivos por nome simples; para consultar, extrair em pasta temporária separada. **Nunca extrair sobre a aplicação**, nunca restaurar código antigo em bloco. Este é um registro de referência, NÃO um pacote executável/deploy nem backup dos clientes.
- Arquivos arquivados e caminhos originais: `page.tsx` / `clientes-layout.css` em `app/admin/clientes`; `globals.css` em `app`; `App.tsx` na raiz frontend; `sidebar-context.tsx` em `contexts`; `badge-styles.ts` / `client-display-id.ts` em `lib`; `useSorting.ts`, `useTableScrollSync.ts`, `useAppFrameMetrics.ts`, `useFontScale.ts` em `hooks`; `input.tsx` em `components/ui`; os demais em `components` (`standard-page-shell`, `sidebar`, `header`, `framed-panel`, `items-per-page-select`, `icon-toolbar-button`, `neon-badge`, `sortable-header`, `client-owner-search`, `pin-to-tray-button`).
- As medidas abaixo foram lidas no código, NÃO medidas por régua do print. Não foi capturado o estilo computado/preferências locais/zoom do navegador. Para comparação pixel a pixel futura, conferir também viewport, zoom, escala de fonte e carregamento da fonte na sessão usada.

### Shell, sidebar, fonte e marca

| Parte | Configuração da referência |
|---|---|
| Sidebar recolhida (estado do print) | **72px**, definida por `SidebarProvider`; não criar outra sidebar por página |
| Sidebar aberta | padrão **200px**, redimensionável de **200 a 400px** pelas constantes JS; conservar escolha atual do usuário e acompanhar abertura/recolhimento |
| Sidebar no mobile | `useAppFrameMetrics`: reserva horizontal zero abaixo de **1024px**, quando a sidebar desktop não está visível |
| Controles da sidebar | Expandir e Personalizar cores dentro da barra, abaixo do logo; reaproveitar `Sidebar`, não desenhar botões substitutos |
| Header global | `components/header.tsx`: margem superior **5px**, linha principal **60px**, alinhamentos e ações existentes; não duplicar/recriar no conteúdo |
| Margem do conteúdo desktop | `App.tsx`, rota de shell: `lg:pt-3 lg:pl-3 lg:pr-13 lg:!pb-3`; reserva direita do trilho existente, nunca ocupar a área dos ícones laterais |
| Container da página | `STANDARD_SHELL_PANEL_CLASS`: branco, borda slate-200/70, `rounded-2xl` / desktop `rounded-[1.5rem]`, sombra dupla, overflow oculto; Clientes usa `!p-1.5 sm:!p-2 lg:!p-2` |
| Fonte | `--font-sans`: **Montserrat**, Inter, fontes de sistema como fallback. Usar a mesma fonte carregada do app, não trocar por parecida |
| Escala de fonte | `useFontScale`, chave `allka_font_scale`; padrão do hook **15px** na raiz (`default`, fator .9375); outras escolhas 12–18px. Não forçar preferência global para replicar uma tela |
| Tipografia contextual | `--app-font-sidebar` padrão **.8125rem**, `--app-font-heading` **1rem**, `--app-font-body` **.8125rem**, `--app-font-table` **.7rem**. A regra global de tabela é `!important`; não ignorá-la ao copiar classes locais |
| Unidades | Preservar `rem`, `px`, `clamp()` e `cqw` como no original. Ex.: ícone `h-3.5` = **.875rem**, não necessariamente 14px físicos com escala personalizada |
| Tema/degradê | herdar `--app-brand-gradient`, `--app-brand-header`, `--app-brand-button`, `--app-brand-active`; fallback da identidade `linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)` |

Nota de implementação preexistente: `--sidebar-min-width` é publicado como 220px, mas as constantes JS permitem 200px; **não “corrigir” ou alterar esse comportamento ao replicar**. Usar a largura efetiva do contexto/medição, não assumir que a variável de mínimo é a largura atual.

### Banner e indicadores

- Usar `StandardPageBanner`, ícone Lucide `Tag` na referência; altura desktop **65px**, cantos `rounded-2xl`, ícone da seção em círculo `h-9 w-9`, ícone interno `h-4 w-4`, título branco em negrito, subtítulo branco/70, ações à direita. No destino, trocar apenas título/ícone/texto conforme a entidade.
- Manter recuo/encaixe do banner: wrapper `shrink-0 -mb-[11px]` e espaçamentos do componente, não somar outro card externo.
- Ações do banner: exportar (fundo branco), pin/Bandeja e criar; criar tem `px-3 py-1.5`, raio `rounded-lg`, borda branca/70, texto branco semibold, fundo branco/10 com hover /20, ícone `Plus` `h-3.5`.
- Indicadores em faixa única: **5 colunas**, altura mínima **65px**, margem vertical **5px**, raio `rounded-xl`, borda suave, fundo branco/80 e divisórias. Não usar cards altos independentes.
- CSS responde à **largura útil do container**, não só à janela: padding `8px clamp(6px,1cqw,20px)`, gap `clamp(5px,.8cqw,12px)`, círculos de ícone **28–48px**; ícone ocupa 50% do círculo.
- Rótulos `clamp(9px,.9cqw,11px)`, números `clamp(20px,2.3cqw,28px)`, tendência `clamp(8px,.75cqw,10px)`. Abaixo de **950px úteis**, ocultar complemento “no mês” e ícone de tendência. Somente abaixo de **620px úteis** passar a 3 colunas; abaixo de **400px**, 2 colunas.
- A quantidade/conteúdo dos indicadores pode mudar conforme a nova entidade, mas manter densidade, hierarquia e adaptação. Valores do print são dados, **não são números fixos do layout**.

### Barra de lista e paginação

- Card único da tabela: `STANDARD_SHELL_TABLE_CARD_CLASS`: raio **20px**, borda **#e6ebf3**, sombra `0 12px 32px rgba(15,23,42,.06)`, overflow oculto; sem cards aninhados extras.
- Barra superior `flex flex-wrap items-center gap-2 px-3 py-2`; busca à esquerda (`flex-1`, mínimo **220px**, máximo `max-w-sm`), ícone Search na posição do original, Input `h-9`, texto `text-sm`, borda/raio/sombra do `Input` compartilhado. Busca com sugestões de nome/ID.
- À direita: Ativos / Inativos / Todos em grupo `h-9`, borda slate-200 e cantos `rounded-lg`; selecionado com degradê, demais neutros. Depois: filtro, configurar colunas, itens por página e contagem/paginação quando aplicável.
- Filtro/configuração usam `IconToolbarButton`: **h-9 w-9**, `rounded-lg`, borda slate-200, ícone **h-4 w-4**; hover com fundo do tema e ícone branco; dica com atraso **400ms**.
- `ItemsPerPageSelect`: **h-9**, largura **4.5rem**, `rounded-lg`, texto xs semibold branco, fundo `btn-brand`; rótulo “Itens:” **11px**. Opções **10/20/25/50/100**. Referência inicia em **10** e guarda escolha em `admin-clientes` (destino precisa de chave própria).
- Repetir seletor/contagem embaixo como no original. Mostrar navegação de páginas quando houver mais de uma. Não inventar paginação decorativa, não esconder ações para abrir espaço.

### Tabela, colunas, linhas e ações

- Tabela `clients-table tabela-cartao w-full text-xs`: **layout fixo**, sem mínimo rígido de 960px. Cabeçalho suave `var(--table-head)` (**#f8fafc** no claro), texto **#365a91**, uppercase/semibold, ícones de ordenar/filtrar e ⓘ; divisórias leves. Colunas redimensionáveis e configuráveis.
- Ordem da referência: **ID / Cliente / Segmento / Contato / Tipo / Vínculo / Status / Cadastro / Ações**. No destino, conservar estrutura, não copiar campos de cliente que não existam naquela entidade.
- Pesos iniciais (não são larguras mínimas fixas): ID **112**, Cliente **280**, Segmento **150**, Contato **136**, Tipo **94**, Vínculo **150**, Status **108**, Cadastro **122**. Distribuir o espaço restante proporcionalmente; **reservar 96px para Ações**.
- Padding horizontal `clamp(4px,.75cqw,16px)`; células `py-1.5` (**.375rem** em cima e embaixo). Altura da linha é derivada do conteúdo/padding, não impor uma altura arbitrária.
- Linhas alternadas: branco / **#f5f8fc**; hover **#f3f7ff** / **#eaf2ff**. Texto principal em negrito slate-800; secundário slate-400; nome/documento truncados sem empurrar ações.
- Avatar da referência `h-9 w-9` redondo com imagem ou iniciais e sombra leve; em container até **950px**, **28×28px**. Nome `clamp(10px,1cqw,14px)`, respeitando regras globais herdadas.
- ID mostrado em **001**, sem prefixo técnico; numeração independente por entidade, ID interno/FKs não mudam. Não copiar IDs/números reais entre cadastros.
- Contatos: links mailto/tel/WhatsApp/site, ícones Lucide, área local de **24×26px**, wrap quando preciso. Não mostrar ícone sem dado nem disparar mensagens ao testar.
- Badges: reutilizar `NeonBadge` e `badge-styles.ts`; borda colorida, fundo suave, raio completo, texto semibold/bold e brilho discreto. Tipo PF/PJ e status são dados da entidade. Status da lista tem padding horizontal **5px**, fonte **10px**, gap **3px**, ponto de estado e label.
- Ações **sempre à direita**, reservadas em 96px, `sticky right:0`, z4; fundo acompanha a linha e divisória/sombra esquerda leve. Ordem: **Eye (Ver)** / **Pencil (Editar)** / **MoreHorizontal (Mais ações)**.
- Cada botão de ação: **26×26px**, raio **8px**, borda **#e8edf5**, fundo branco, sombra `0 4px 10px rgba(15,23,42,.06)`, gap **.25rem**; ícone **.875rem**. Ver/Editar azuis **#2558FF**; Mais ações slate-400. Hover: gradiente **#2558FF → #6E2C96 → #D92293**, ícone branco, borda transparente, sobe **1px**. Usar dicas e nomes acessíveis.
- Menu Mais ações: alinhado à direita, largura `w-52`, `rounded-xl p-1.5`, itens arredondados com `py-2`; não usar reticências sem ação.
- Abaixo de **767px de viewport**, manter o padrão global `tabela-cartao` (legendas por célula e ações acessíveis), em vez de comprimir tudo até ficar ilegível. Não reativar a coluna antiga duplicada de ações que está oculta.

### Abertura e edição da referência

1. ID, nome, linha ou Eye → **Painel Moldura** (`FramedPanel`), 30px de margem na área ao lado da sidebar; overlay escuro z1200 **atrás** do painel z1201. X fecha; sidebar fica descoberta.
2. Lápis da lista → cadastro completo em **Painel Moldura**; cabeçalho do tema, pin/Bandeja, X, corpo com rolagem e rodapé fixo Cancelar/Salvar.
3. **Editar dados dentro da leitura** → **Janela Moldura** (`FramedModal`) SOBRE o painel; véu branco z1250 e conteúdo z1251. Cancelar/X fecha apenas a edição e conserva a leitura atrás. Botão Editar dados usa degradê do tema.
4. Cabeçalho da leitura: ID + nome + badge de status + WhatsApp/e-mail quando disponíveis; sem endereço no cabeçalho. Não copiar o endereço/telefone do cliente da imagem para outro cadastro.
5. Menus/dicas por cima das molduras; overlays nunca cobrem os próprios conteúdos. Seguir componentes existentes, não empilhar overlays improvisados.

### Protocolo quando o usuário pedir para replicar

- Ler esta seção e consultar o ZIP se os arquivos atuais já tiverem mudado. Reutilizar componentes atuais compatíveis; extrair apenas estilos/estrutura necessários, nunca sobrescrever o app com o ZIP.
- Confirmar pela solicitação qual tela recebe a reprodução; não sair aplicando globalmente. Manter dados, permissões, APIs e regras da entidade destino.
- Reproduzir o visual/densidade e os comportamentos acima; adaptar apenas títulos, rótulos e campos necessários. Não copiar nomes de clientes, saldos, contagens ou vínculos reais.
- Comparar no mesmo viewport **1480×668**, mesma sidebar recolhida **72px**, mesma escala de fonte e tema; depois conferir 1242px, sidebar aberta e celular. Copiar só uma classe Tailwind sem as regras globais/variáveis NÃO é reprodução fiel.
- Conferir indicadores, toolbar, colunas, ações acessíveis, hovers/dicas e molduras; testar abrir/fechar, buscar/filtrar/ordenar, paginação e salvar/cancelar. Registrar diferenças em vez de declarar “100% igual” sem comparação real.

### Aplicação autorizada: Tarefas — 27/10/2026

- Destino solicitado: `/admin/tarefas`. Faixa clara com oito indicadores próprios e filtros clicáveis, cores semânticas, ícones circulares e densidade de Clientes; oito colunas em largura suficiente, quatro abaixo de 1050px úteis e duas abaixo de 520px para manter leitura.
- Tabela proporcional, sem mínimo rígido; reserva de **96px** à direita para **Ver / Editar / Mais ações**, botões de 26px e menu alinhado à direita. Linhas branco/#f5f8fc, padding compacto e rótulos por célula no mobile.
- Preservar códigos operacionais, filtros, paginação, configuração/redimensionamento de colunas e handlers de lançamento/atribuição/transferência/status. Não lançar ou alterar tarefas para validar aparência.
- Fontes locais: `app/admin/tarefas/page.tsx`, `tarefas-layout.css`, `components/task-reference-stat.tsx`. Esta reprodução é da listagem; shell e formulários existentes não foram redesenhados. Testes de DOM não substituem comparação visual real.

### Aplicação autorizada: Projetos — 27/10/2026

- Destino solicitado: `/admin/projetos`; mesmos indicadores compactos, tipografia, cores semânticas, tabela proporcional e ações **Ver / Editar / Mais** em 26px, reservando 96px à direita.
- Preservar os quatro indicadores próprios de Projetos, métricas, pendências, Lista/Kanban/Planejador, filtros e todos os comandos por estado. IDs só mudam apresentação, sem prefixo técnico; não renumerar banco.
- Estilos isolados em `app/admin/projetos/projetos-layout.css`; componentes em `components/project-reference-parts.tsx`. Não modificar shell ou dados. Esta reprodução cobre a listagem, não redesenha os formulários de projeto.
- Conferência visual real ainda pendente; não afirmar reprodução pixel a pixel por testes automatizados.

### Aplicação autorizada: Empresas — 27/10/2026

- Usuário indicou explicitamente `/admin/empresas` como destino. Alteração localizada, sem redefinir sidebar/tema/fonte globais e sem alterar o arquivo congelado da referência.
- Mesma densidade de indicadores (círculos/ícones/cores/tamanhos/espaços), busca compacta `max-w-sm`, toolbar com ícones h4 e tabela proporcional sem mínimos rígidos. Empresas mantém **quatro indicadores reais**, filtros Company/Agency/Nomad/Partner e suas colunas/regras próprias; não copiar o quinto indicador ou valores de Clientes.
- Ações à direita reservam **96px**, botões **26×26px**, raio **8px**, ícones **.875rem**, dicas, hover e ordem **Ver / Editar / Mais ações**. Mais ações conserva resumo, exclusão autorizada com confirmação, convite Partner e comandos Nomad conforme tipo/permissão. Não disparar exclusões/convites para conferir layout.
- `CompanyReferenceFrame` em `components/company-reference-frame.tsx` ativa molduras APENAS por opt-in: leitura/lápis/resumo em Painel Moldura; Editar dados dentro da leitura em Janela Moldura, sem desmontar o painel. Abas, campos e handlers existentes preservados; header com ID/nome/status/contatos/Bandeja/X. Edição de usuário dentro do editor sobe numa moldura acima da edição (não deixar o antigo painel z45 atrás do overlay).
- Fontes da reprodução: `app/admin/empresas/page.tsx`, `empresas-layout.css`, `components/company-reference-frame.tsx`, props opt-in em `company-view-slide-panel.tsx` / `company-edit-slide-panel.tsx`. Outros consumidores sem opt-in mantêm a abertura anterior.
- Comparação visual real com o print ainda deve ser feita pelo usuário, no mesmo viewport/tema/escala. Testes de DOM não comprovam igualdade pixel a pixel.
