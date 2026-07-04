# Padrão de Tabela — referência `admin/empresas`

Especificação completa do padrão visual/estrutural criado em `/admin/empresas` e adotado como modelo para **toda tabela de listagem da plataforma**. Este documento existe para que qualquer pessoa (ou IA) que precise replicar o padrão em outra tela tenha todos os detalhes exatos — tamanhos, cores, classes, componentes — sem precisar redescobrir nada.

Implementação de referência: [`apps/frontend/app/admin/empresas/page.tsx`](../apps/frontend/app/admin/empresas/page.tsx).
Primeira réplica fiel: [`apps/frontend/app/admin/clientes/page.tsx`](../apps/frontend/app/admin/clientes/page.tsx).

---

## Componentes compartilhados (usar, não recriar)

| Componente/hook | Caminho | Uso |
| --- | --- | --- |
| `SlidePanel` | `apps/frontend/components/slide-panel.tsx` | Painel deslizante padrão (filtros, config de colunas, formulários) |
| `IconToolbarButton` | `apps/frontend/components/icon-toolbar-button.tsx` | Botão quadrado só-ícone com gradiente no hover |
| `NeonBadge` + `badge-styles.ts` | `apps/frontend/components/neon-badge.tsx` / `apps/frontend/lib/badge-styles.ts` | Badge "neon" (borda + fundo + glow) |
| `getCompanyTypeLabel/Info/Color`, `formatCompanySequenceId` | `apps/frontend/lib/company-type.ts` | Normaliza `type` (PT↔EN) e formata o ID sequencial |
| `useAppFrameMetrics` | `apps/frontend/hooks/useAppFrameMetrics.ts` | `{ sidebarWidth, headerHeight, footerHeight }` para posicionar painéis |
| `useTableScrollSync` | `apps/frontend/hooks/useTableScrollSync.ts` | Refs + sincronização das duas barras de rolagem horizontal (topo/rodapé) + detecção de overflow |

> ⚠️ **Gotcha já corrigido uma vez**: ao usar `useTableScrollSync`, o array de dependências precisa incluir a flag de loading da página (`[loading, visibleCols.size]`). Se a tabela ficar escondida atrás de um `if (loading) return <Spinner/>` e o hook só depender de `colWidths`/`visibleCols`, o `ResizeObserver` tenta anexar em uma ref `null` no primeiro render e nunca mais reavalia quando a tabela real aparece — as barras de rolagem ficam ocultas para sempre, independente da largura da tela.

---

## Toolbar (2 linhas acima da tabela + 1 linha espelho no rodapé)

**Linha 1 — busca + botões de ícone**
- Campo de busca `pl-8 h-9 text-sm`, placeholder tipo `"Nome, ID, e-mail ou CNPJ..."`.
- Busca por nome, e-mail, ID de exibição (`emp_00007`) e qualquer outro identificador relevante (CNPJ, telefone).
- Autocomplete: aparece com foco + texto não vazio, até 6 resultados (avatar + nome + ID), fecha ao clicar fora.
- À direita: `IconToolbarButton` para Filtros e para Configurar Colunas, cada um abrindo um `SlidePanel`.

**Linha 2 (topo) e Linha 3 (rodapé) — idênticas entre si**
- `ItemsPerPageSelect` (`variant="top"` / `variant="bottom"`) + texto "`{início}-{fim} de {total} <entidade>`" com tooltip.
- Barra de rolagem horizontal espelho (`allka-table-scroll`, altura 12px) — **só renderiza quando `hasHorizontalOverflow` for `true`**.
- Paginação numerada (máx. 5 números visíveis + `...`), página ativa com gradiente `linear-gradient(135deg, #111A4D 0%, #6E2C96 55%, #D92293 100%)`, mais campo "Pág." + botão "Ir" para pular direto.

---

## Tabela

- Card externo: `bg-white dark:bg-slate-900 border border-[#e8edf5] dark:border-slate-700 rounded-xl shadow-sm overflow-hidden`.
- Cabeçalho fixo (`sticky top-0`), `text-[11px] font-bold uppercase`, cada coluna com `SortableHeader` + ícone de informação (tooltip).
- **Coluna Ações** (esquerda, fixa/`sticky left-0`): fundo alternado mais escuro que o resto da linha (`bg-[#ECEFF4]`/`bg-[#D6DCE8]`), ícones "+", olho (ver) e lápis (editar), cada um com tooltip.
- **Coluna do nome da entidade**: avatar circular (`w-10 h-10`, gradiente de uma paleta de 6 cores rotacionada pelo id/index) + nome em negrito + ID sequencial em cinza (`emp_00035`) + badges de conformidade reais (ex.: DPO cadastrado/Sem DPO — usar dado real, nunca inventar).
- **Zebra das linhas**: `bg-[#F1F4F9]`/`bg-[#DCE3EE]` (claro) com variantes `oklch` no escuro, hover escurece ainda mais.
- **Badge de Status**: mesma fórmula de badge + um ponto (`dot`) indicador à esquerda do texto.
- **Outros badges** (Tipo, Plano, etc.): usar `<NeonBadge color="...">` — fórmula: borda colorida + fundo `-200` (nunca `-50`/`-100`, fica claro demais) + texto `-900` + sombra glow; no escuro, fundo `-800/70` + texto `-100` (nunca `-950/40`, fica apagado).

> ⚠️ **Gotcha já corrigido uma vez**: o `filterValues` passado ao `SortableHeader` de uma coluna precisa ler o **mesmo campo** que a célula realmente renderiza. Já aconteceu do filtro da coluna Plano ler `company.plan` (um campo fixo/fake) enquanto a célula exibia `company.partner_level || company.account_type` — o dropdown de filtro só mostrava um valor sempre igual. Sempre confirme que os dois apontam pro mesmo campo real.

---

## Cards de estatística (grid `grid-cols-2 lg:grid-cols-4` acima da toolbar)

Cards com **gradiente colorido**, não caixas brancas planas — esse foi o maior erro na primeira tentativa (rejeitada) de replicar em `admin/clientes`.

- `bg-gradient-to-br` + par de cores + `border-2 border-{cor}-300/70 dark:border-{cor}-800/70` + `shadow-lg`.
- Paleta: azul (`from-blue-500 to-blue-700`), esmeralda (`from-emerald-500 to-teal-600`), violeta (`from-violet-500 to-purple-700`), laranja (`from-orange-500 to-rose-600`).
- Label em `text-[11px] uppercase text-white/80` + ícone em chip `bg-white/20` + valor em `text-2xl font-bold text-white`.
- Empresas também mostra uma tendência "+X% vs anterior" com sparkline — **isso já é sinalizado como dado não-real** (sem histórico de fato armazenado). Não replicar a tendência falsa em telas novas; replicar apenas o visual do card (gradiente/ícone/valor).

---

## Painéis (Filtros / Configurar Colunas / "+")

Todos usam `SlidePanel` — desliza da direita, sem backdrop, nunca cobre sidebar/header/footer, fecha com X/Cancelar/Esc. Ver [`docs/ui-e-padroes.md`](./ui-e-padroes.md) para o contrato de posicionamento completo.

---

## Scrollbar

- Gradiente `linear-gradient(135deg, #2558ff 0%, #6e2c96 50%, #d92293 100%)` (ou `var(--brand-gradient)`), trilho transparente — já é **global** (`globals.css`), não precisa reaplicar por tabela.
- Espelhos horizontais só aparecem se `scrollWidth > clientWidth + 8` (a tolerância de 8px evita falso-positivo por arredondamento de borda/largura de scrollbar que aparecia mesmo em telas bem largas).

---

## Cuidados ao aplicar em uma entidade nova

1. Valores vindos da API podem estar em **português** (`ativo`, `agencia`) enquanto o padrão visual espera inglês (`active`, `agency`) — sempre normalizar (ver `company-type.ts`) em vez de assumir um formato.
2. Antes de copiar um campo "fake"/placeholder de outra tela, verificar se ele bate com o que é realmente exibido — campos podem divergir silenciosamente (like o bug do Plano acima).
3. Dados como `lgpd`, `_count`, `sequence_number`, `type` já vêm reais da API para qualquer tela baseada em Company — não fabricar, só consumir.
4. Ao terminar, comparar visualmente lado a lado com `/admin/empresas` antes de considerar concluído.
