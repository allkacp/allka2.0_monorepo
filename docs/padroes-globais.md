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
| **Fechamento de tarefa técnica** | Resumo leigo + tabela de farol (🟢 pronto · 🟡 aguardando teste · 🔴 não deu certo · ⏸ adiado). | `docs/RETOMAR-AQUI.md` seção 1 |

## Regra de comparação (decidida pelo usuário)
Quando o usuário pedir uma tela/comportamento novo e já existir um padrão **existente (não final)** que faça algo parecido, a IA **avisa antes de criar**: "já tem o <nome>, que faz X, Y e Z". Compara-se com ele se é a mesma coisa de fato e se o novo substitui o existente; só então se decide (reaproveitar, substituir ou criar outro) e se atualiza este catálogo.

## Como pedir
- "Quais são os padrões globais?" → mandar a **lista completa** deste arquivo (tabela rápida + detalhes).
- "Transforme esse container em **Painel Moldura**" → trocar o `Dialog` da tela por `FramedPanel`.
- "Transforme em **Janela Moldura**" → janela menor por cima de um Painel Moldura: usar `FramedModal` (fundo claro, sidebar sempre visível).
- "Abrir todos / Fechar todos" → `<AccordionToggleAll />` (padrão 3). "Bolinha numerada com degradê" → classe `.section-number-badge` (padrão 4).
- "Isso vira padrão" → registrar aqui com nome, regra, exemplo e onde está, e reenviar a lista completa.
